import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { leads, n8nWorkflows, zapierHooks } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";
import { getAppUrl } from "../_core/env";

async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

// Fire all automation webhooks for a lead event
async function fireAutomations(
  tenantId: number | null,
  event: string,
  payload: Record<string, unknown>
): Promise<{ n8n: boolean; zapier: boolean }> {
  if (tenantId === null) {
    console.warn(
      "[fireAutomations] tenantId is null — skipping automations to prevent cross-tenant broadcast"
    );
    return { n8n: false, zapier: false };
  }

  const db = await getDb();
  if (!db) return { n8n: false, zapier: false };

  const results = { n8n: false, zapier: false };

  try {
    // n8n workflows matching this event
    const n8nQuery = db
      .select()
      .from(n8nWorkflows)
      .where(
        and(eq(n8nWorkflows.enabled, true), eq(n8nWorkflows.tenantId, tenantId))
      );
    const workflows = await n8nQuery;

    for (const wf of workflows) {
      if (wf.triggerEvent === event || wf.triggerEvent === "*") {
        try {
          await fetch(wf.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event, ...payload, _workflow: wf.name }),
            signal: AbortSignal.timeout(5000),
          });
          await db
            .update(n8nWorkflows)
            .set({
              lastTriggeredAt: new Date(),
              triggerCount: (wf.triggerCount ?? 0) + 1,
              lastError: null,
            })
            .where(eq(n8nWorkflows.id, wf.id));
          results.n8n = true;
        } catch (err) {
          await db
            .update(n8nWorkflows)
            .set({ lastError: String(err) })
            .where(eq(n8nWorkflows.id, wf.id));
        }
      }
    }

    // Zapier hooks matching this event
    const zapQuery = db
      .select()
      .from(zapierHooks)
      .where(
        and(eq(zapierHooks.enabled, true), eq(zapierHooks.tenantId, tenantId))
      );
    const hooks = await zapQuery;

    for (const hook of hooks) {
      if (hook.triggerEvent === event || hook.triggerEvent === "*") {
        try {
          await fetch(hook.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event, ...payload, _hook: hook.name }),
            signal: AbortSignal.timeout(5000),
          });
          await db
            .update(zapierHooks)
            .set({
              lastTriggeredAt: new Date(),
              triggerCount: (hook.triggerCount ?? 0) + 1,
            })
            .where(eq(zapierHooks.id, hook.id));
          results.zapier = true;
        } catch {
          // Zapier hooks are best-effort
        }
      }
    }
  } catch {
    // Automation failures are non-blocking
  }

  return results;
}

export const leadsRouter = router({
  // Public: submit a lead from the landing page wizard
  submit: publicProcedure
    .input(
      z.object({
        companyName: z.string().optional(),
        contactName: z.string().optional(),
        email: z.string().email(),
        phone: z.string().optional(),
        website: z.string().optional(),
        plan: z.string().optional(),
        platforms: z.array(z.string()).optional(),
        branding: z.string().optional(),
        monthlyRevenue: z.string().optional(),
        teamSize: z.string().optional(),
        message: z.string().optional(),
        source: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Persist lead to database
      const [inserted] = await db
        .insert(leads)
        .values({
          ...input,
          source: input.source ?? "landing_page",
          status: "new",
        })
        .returning();

      const leadId = inserted.id;

      // Fire owner notification with full lead summary
      const platformList = input.platforms?.join(", ") ?? "Not specified";
      const notifContent = [
        `**New Lead Submitted** — ${new Date().toLocaleString()}`,
        ``,
        `**Company:** ${input.companyName ?? "N/A"}`,
        `**Contact:** ${input.contactName ?? "N/A"}`,
        `**Email:** ${input.email}`,
        `**Phone:** ${input.phone ?? "N/A"}`,
        `**Website:** ${input.website ?? "N/A"}`,
        ``,
        `**Plan Interest:** ${input.plan ?? "Not specified"}`,
        `**Platforms:** ${platformList}`,
        `**Branding:** ${input.branding ?? "N/A"}`,
        `**Monthly Revenue:** ${input.monthlyRevenue ?? "N/A"}`,
        `**Team Size:** ${input.teamSize ?? "N/A"}`,
        ``,
        `**Message:** ${input.message ?? "None"}`,
        ``,
        `**Source:** ${input.source ?? "landing_page"} | UTM: ${input.utmSource ?? "-"}/${input.utmMedium ?? "-"}/${input.utmCampaign ?? "-"}`,
        `**Lead ID:** #${leadId}`,
      ].join("\n");

      let notificationSent = false;
      try {
        notificationSent = await notifyOwner({
          title: `🎯 New Lead: ${input.companyName ?? input.email} — ${input.plan ?? "Unknown Plan"}`,
          content: notifContent,
        });
      } catch {
        // Non-blocking
      }

      // Fire automation webhooks (n8n + Zapier)
      const automationPayload = {
        leadId,
        email: input.email,
        companyName: input.companyName,
        contactName: input.contactName,
        plan: input.plan,
        platforms: input.platforms,
        source: input.source,
      };

      const autoResults = await fireAutomations(
        null,
        "lead.submitted",
        automationPayload
      );

      // Fire Meta CAPI Lead event (non-blocking — deduplication via eventId)
      try {
        const { capi } = await import("../meta/capi");
        const eventId = `lead-${leadId}-${Date.now()}`;
        await capi.lead(eventId, { email: input.email }, getAppUrl());
      } catch {
        /* CAPI failure is non-critical */
      }

      // Update automation tracking flags
      if (notificationSent || autoResults.n8n || autoResults.zapier) {
        try {
          await db
            .update(leads)
            .set({
              notificationSent,
              n8nTriggered: autoResults.n8n,
              zapierTriggered: autoResults.zapier,
            })
            .where(eq(leads.id, leadId));
        } catch {
          // Non-blocking
        }
      }

      return {
        success: true,
        leadId,
        notificationSent,
        automations: autoResults,
      };
    }),

  // Admin: list all leads with optional status filter
  list: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["new", "contacted", "qualified", "converted", "lost"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }
      const db = await requireDb();
      const query = input?.status
        ? db
            .select()
            .from(leads)
            .where(eq(leads.status, input.status))
            .orderBy(desc(leads.createdAt))
        : db.select().from(leads).orderBy(desc(leads.createdAt));
      return query;
    }),

  // Admin: update lead status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "qualified", "converted", "lost"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }
      const db = await requireDb();
      await db
        .update(leads)
        .set({ status: input.status })
        .where(eq(leads.id, input.id));

      // Fire automation on status change
      await fireAutomations(null, `lead.status.${input.status}`, {
        leadId: input.id,
        status: input.status,
      });

      return { success: true };
    }),

  // Admin: add a note to a lead
  addNote: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        note: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }
      const db = await requireDb();
      const [lead] = await db
        .select({ notes: leads.notes })
        .from(leads)
        .where(eq(leads.id, input.id));
      const existingNotes = lead?.notes ?? "";
      const timestamp = new Date().toLocaleString();
      const updatedNotes = existingNotes
        ? `${existingNotes}\n\n[${timestamp}] ${input.note}`
        : `[${timestamp}] ${input.note}`;
      await db
        .update(leads)
        .set({ notes: updatedNotes })
        .where(eq(leads.id, input.id));
      return { success: true };
    }),

  // Admin: get lead stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }
    const db = await requireDb();
    const allLeads = await db.select({ status: leads.status }).from(leads);
    const counts = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      lost: 0,
      total: allLeads.length,
    };
    for (const l of allLeads) {
      counts[l.status] = (counts[l.status] ?? 0) + 1;
    }
    return counts;
  }),
});
