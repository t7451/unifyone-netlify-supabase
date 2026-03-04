import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { n8nWorkflows, zapierHooks, mailchimpConfig } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

// Available trigger events for the UI selector
const TRIGGER_EVENTS = [
  { value: "lead.submitted", label: "New Lead Submitted" },
  { value: "lead.status.contacted", label: "Lead Marked Contacted" },
  { value: "lead.status.qualified", label: "Lead Qualified" },
  { value: "lead.status.converted", label: "Lead Converted" },
  { value: "lead.status.lost", label: "Lead Lost" },
  { value: "order.created", label: "New Order Created" },
  { value: "order.status.shipped", label: "Order Shipped" },
  { value: "order.status.delivered", label: "Order Delivered" },
  { value: "order.status.cancelled", label: "Order Cancelled" },
  { value: "payment.succeeded", label: "Payment Succeeded" },
  { value: "payment.failed", label: "Payment Failed" },
  { value: "subscription.activated", label: "Subscription Activated" },
  { value: "subscription.cancelled", label: "Subscription Cancelled" },
  { value: "social.post.published", label: "Social Post Published" },
  { value: "referral.converted", label: "Referral Converted" },
  { value: "*", label: "All Events (Catch-All)" },
];

export const automationRouter = router({
  // Get available trigger events
  getTriggerEvents: protectedProcedure.query(() => TRIGGER_EVENTS),

  // ── n8n Workflows ─────────────────────────────────────────────────────────────
  n8n: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const tenantId = ctx.user.tenantId;
      if (!tenantId) return [];
      return db.select().from(n8nWorkflows)
        .where(eq(n8nWorkflows.tenantId, tenantId))
        .orderBy(desc(n8nWorkflows.createdAt));
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        triggerEvent: z.string().min(1),
        webhookUrl: z.string().url(),
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
        const db = await requireDb();
        await db.insert(n8nWorkflows).values({ ...input, tenantId });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        triggerEvent: z.string().optional(),
        webhookUrl: z.string().url().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
        const db = await requireDb();
        const { id, ...data } = input;
        await db.update(n8nWorkflows)
          .set(data)
          .where(and(eq(n8nWorkflows.id, id), eq(n8nWorkflows.tenantId, tenantId)));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
        const db = await requireDb();
        await db.delete(n8nWorkflows)
          .where(and(eq(n8nWorkflows.id, input.id), eq(n8nWorkflows.tenantId, tenantId)));
        return { success: true };
      }),

    test: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
        const db = await requireDb();
        const [wf] = await db.select().from(n8nWorkflows)
          .where(and(eq(n8nWorkflows.id, input.id), eq(n8nWorkflows.tenantId, tenantId)));
        if (!wf) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });

        try {
          const resp = await fetch(wf.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: wf.triggerEvent,
              test: true,
              timestamp: new Date().toISOString(),
              source: "unifyone_test",
            }),
            signal: AbortSignal.timeout(8000),
          });
          await db.update(n8nWorkflows)
            .set({ lastTriggeredAt: new Date(), triggerCount: (wf.triggerCount ?? 0) + 1, lastError: null })
            .where(eq(n8nWorkflows.id, wf.id));
          return { success: true, status: resp.status };
        } catch (err) {
          await db.update(n8nWorkflows)
            .set({ lastError: String(err) })
            .where(eq(n8nWorkflows.id, wf.id));
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Webhook failed: ${String(err)}` });
        }
      }),
  }),

  // ── Zapier Hooks ──────────────────────────────────────────────────────────────
  zapier: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const tenantId = ctx.user.tenantId;
      if (!tenantId) return [];
      return db.select().from(zapierHooks)
        .where(eq(zapierHooks.tenantId, tenantId))
        .orderBy(desc(zapierHooks.createdAt));
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        triggerEvent: z.string().min(1),
        webhookUrl: z.string().url(),
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
        const db = await requireDb();
        await db.insert(zapierHooks).values({ ...input, tenantId });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        triggerEvent: z.string().optional(),
        webhookUrl: z.string().url().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
        const db = await requireDb();
        const { id, ...data } = input;
        await db.update(zapierHooks)
          .set(data)
          .where(and(eq(zapierHooks.id, id), eq(zapierHooks.tenantId, tenantId)));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
        const db = await requireDb();
        await db.delete(zapierHooks)
          .where(and(eq(zapierHooks.id, input.id), eq(zapierHooks.tenantId, tenantId)));
        return { success: true };
      }),
  }),

  // ── Mailchimp Config ──────────────────────────────────────────────────────────
  mailchimp: router({
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const tenantId = ctx.user.tenantId;
      if (!tenantId) return null;
      const [config] = await db.select().from(mailchimpConfig)
        .where(eq(mailchimpConfig.tenantId, tenantId));
      // Mask API key for security
      if (config?.apiKey) {
        return { ...config, apiKey: `****${config.apiKey.slice(-4)}` };
      }
      return config ?? null;
    }),

    saveConfig: protectedProcedure
      .input(z.object({
        apiKey: z.string().min(1),
        serverPrefix: z.string().min(1).max(10),
        listId: z.string().min(1),
        tagPrefix: z.string().optional(),
        enabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
        const db = await requireDb();
        const [existing] = await db.select({ id: mailchimpConfig.id })
          .from(mailchimpConfig)
          .where(eq(mailchimpConfig.tenantId, tenantId));

        if (existing) {
          await db.update(mailchimpConfig).set({ ...input }).where(eq(mailchimpConfig.tenantId, tenantId));
        } else {
          await db.insert(mailchimpConfig).values({ ...input, tenantId });
        }
        return { success: true };
      }),

    testConnection: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
      const [config] = await db.select().from(mailchimpConfig)
        .where(eq(mailchimpConfig.tenantId, tenantId));
      if (!config?.apiKey || !config.serverPrefix) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mailchimp not configured" });
      }
      try {
        const resp = await fetch(`https://${config.serverPrefix}.api.mailchimp.com/3.0/ping`, {
          headers: {
            Authorization: `Basic ${Buffer.from(`anystring:${config.apiKey}`).toString("base64")}`,
          },
          signal: AbortSignal.timeout(8000),
        });
        const data = await resp.json() as { health_status?: string };
        return { success: resp.ok, status: data?.health_status ?? "unknown" };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Mailchimp ping failed: ${String(err)}` });
      }
    }),
  }),
});
