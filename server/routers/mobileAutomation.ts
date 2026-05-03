import { z } from "zod";
import {
  protectedProcedure,
  publicRateLimitedProcedure,
  router,
} from "../_core/trpc";
import { publicFormLimiter } from "../_core/rateLimiter";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  n8nSchedules,
  deepLinkAttributions,
  metaPixelEvents,
  mobilePushSchedules,
} from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

// ─── Cron helpers ─────────────────────────────────────────────────────────────

function nextCronDate(cronExpr: string): Date | null {
  // Simple next-run estimator for common patterns — not a full cron parser
  try {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) return null;
    const [minute, hour] = parts;
    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(Number(minute) || 0);
    next.setHours(Number(hour) || 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  } catch {
    return null;
  }
}

export const mobileAutomationRouter = router({
  // ── n8n Schedules ─────────────────────────────────────────────────────────────
  listSchedules: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(n8nSchedules)
      .where(eq(n8nSchedules.tenantId, ctx.user.id))
      .orderBy(desc(n8nSchedules.createdAt));
  }),

  createSchedule: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        workflowId: z.string().optional(),
        webhookUrl: z.string().url().optional(),
        cronExpression: z.string().min(1).max(100),
        payload: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      const nextRunAt = nextCronDate(input.cronExpression);
      await db.insert(n8nSchedules).values({
        tenantId: ctx.user.id,
        name: input.name,
        cronExpression: input.cronExpression,
        enabled: true,
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.workflowId !== undefined
          ? { workflowId: input.workflowId }
          : {}),
        ...(input.webhookUrl !== undefined
          ? { webhookUrl: input.webhookUrl }
          : {}),
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
        ...(nextRunAt ? { nextRunAt } : {}),
      });
      return { success: true };
    }),

  updateSchedule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        webhookUrl: z.string().url().optional(),
        cronExpression: z.string().optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      const { id, ...updates } = input;
      const nextRunAt = updates.cronExpression
        ? nextCronDate(updates.cronExpression)
        : undefined;
      await db
        .update(n8nSchedules)
        .set({
          ...updates,
          ...(nextRunAt ? { nextRunAt } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(eq(n8nSchedules.id, id), eq(n8nSchedules.tenantId, ctx.user.id))
        );
      return { success: true };
    }),

  deleteSchedule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db
        .delete(n8nSchedules)
        .where(
          and(
            eq(n8nSchedules.id, input.id),
            eq(n8nSchedules.tenantId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  triggerSchedule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      const [schedule] = await db
        .select()
        .from(n8nSchedules)
        .where(
          and(
            eq(n8nSchedules.id, input.id),
            eq(n8nSchedules.tenantId, ctx.user.id)
          )
        )
        .limit(1);
      if (!schedule)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      if (!schedule.webhookUrl)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No webhook URL configured",
        });

      let status: "success" | "failed" = "failed";
      let lastError: string | null = null;

      try {
        const res = await fetch(schedule.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(schedule.payload ?? {}),
            _trigger: "manual",
            _schedule: schedule.name,
            _triggeredAt: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(10000),
        });
        status = res.ok ? "success" : "failed";
        if (!res.ok) lastError = `HTTP ${res.status}`;
      } catch (err) {
        lastError = String(err);
      }

      await db
        .update(n8nSchedules)
        .set({
          lastRunAt: new Date(),
          lastRunStatus: status,
          lastRunError: lastError,
          triggerCount: (schedule.triggerCount ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(n8nSchedules.id, input.id));

      return { success: status === "success", status, error: lastError };
    }),

  // ── Deep Link Attributions ────────────────────────────────────────────────────
  trackDeepLink: publicRateLimitedProcedure(publicFormLimiter, "mob:deeplink")
    .input(
      z.object({
        userId: z.number().optional(),
        email: z.string().email().optional(),
        source: z.string().default("unknown"),
        medium: z.string().optional(),
        campaign: z.string().optional(),
        deepLinkPath: z.string().optional(),
        referralCode: z.string().optional(),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const req = (
        ctx as {
          req?: {
            headers?: { "x-forwarded-for"?: string; "user-agent"?: string };
          };
        }
      ).req;
      const ipAddress =
        req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ?? undefined;
      const userAgent = req?.headers?.["user-agent"] ?? undefined;
      await db.insert(deepLinkAttributions).values({
        ...input,
        ipAddress,
        userAgent,
      });
      return { success: true };
    }),

  markDeepLinkConverted: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(deepLinkAttributions)
        .set({ converted: true, convertedAt: new Date() })
        .where(eq(deepLinkAttributions.id, input.id));
      return { success: true };
    }),

  getAttributionStats: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        return { total: 0, converted: 0, conversionRate: 0, bySource: [] };
      const since = new Date(Date.now() - input.days * 86400000);
      const rows = await db
        .select()
        .from(deepLinkAttributions)
        .where(gte(deepLinkAttributions.createdAt, since));

      const total = rows.length;
      const converted = rows.filter(r => r.converted).length;
      const conversionRate =
        total > 0 ? Math.round((converted / total) * 1000) / 10 : 0;

      // Group by source
      const sourceMap: Record<string, { total: number; converted: number }> =
        {};
      for (const r of rows) {
        const src = r.source ?? "unknown";
        if (!sourceMap[src]) sourceMap[src] = { total: 0, converted: 0 };
        sourceMap[src].total++;
        if (r.converted) sourceMap[src].converted++;
      }
      const bySource = Object.entries(sourceMap)
        .map(([source, stats]) => ({
          source,
          ...stats,
          rate:
            stats.total > 0
              ? Math.round((stats.converted / stats.total) * 1000) / 10
              : 0,
        }))
        .sort((a, b) => b.total - a.total);

      return { total, converted, conversionRate, bySource };
    }),

  listAttributions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };
      const rows = await db
        .select()
        .from(deepLinkAttributions)
        .orderBy(desc(deepLinkAttributions.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(deepLinkAttributions);
      return { rows, total: Number(count) };
    }),

  // ── CAPI Event Log ────────────────────────────────────────────────────────────
  listCapiEvents: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { events: [], total: 0 };
      const events = await db
        .select()
        .from(metaPixelEvents)
        .where(eq(metaPixelEvents.userId, ctx.user.id))
        .orderBy(desc(metaPixelEvents.sentAt))
        .limit(input.limit)
        .offset(input.offset);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(metaPixelEvents)
        .where(eq(metaPixelEvents.userId, ctx.user.id));
      return { events, total: Number(count) };
    }),

  getCapiSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, byEvent: [] };
    const events = await db
      .select({ eventName: metaPixelEvents.eventName })
      .from(metaPixelEvents)
      .where(eq(metaPixelEvents.userId, ctx.user.id));
    const eventMap: Record<string, number> = {};
    for (const e of events) {
      eventMap[e.eventName] = (eventMap[e.eventName] ?? 0) + 1;
    }
    const byEvent = Object.entries(eventMap)
      .map(([eventName, count]) => ({ eventName, count }))
      .sort((a, b) => b.count - a.count);
    return { total: events.length, byEvent };
  }),

  // ── Mobile Push Schedules ──────────────────────────────────────────────────────
  listPushSchedules: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(mobilePushSchedules)
      .where(eq(mobilePushSchedules.tenantId, ctx.user.id))
      .orderBy(desc(mobilePushSchedules.createdAt));
  }),

  createPushSchedule: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        body: z.string().min(1),
        targetAudience: z
          .enum([
            "all",
            "active_users",
            "inactive_users",
            "new_users",
            "custom",
          ])
          .default("all"),
        scheduledAt: z.string().datetime().optional(),
        cronExpression: z.string().max(100).optional(),
        recurring: z.boolean().default(false),
        deepLinkPath: z.string().max(500).optional(),
        imageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      const status = input.recurring
        ? ("recurring" as const)
        : input.scheduledAt
          ? ("scheduled" as const)
          : ("draft" as const);
      await db.insert(mobilePushSchedules).values({
        tenantId: ctx.user.id,
        title: input.title,
        body: input.body,
        targetAudience: input.targetAudience,
        ...(input.scheduledAt
          ? { scheduledAt: new Date(input.scheduledAt) }
          : {}),
        ...(input.cronExpression
          ? { cronExpression: input.cronExpression }
          : {}),
        recurring: input.recurring,
        ...(input.deepLinkPath ? { deepLinkPath: input.deepLinkPath } : {}),
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
        status,
        enabled: true,
      });
      return { success: true };
    }),

  updatePushSchedule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        body: z.string().min(1).optional(),
        targetAudience: z
          .enum([
            "all",
            "active_users",
            "inactive_users",
            "new_users",
            "custom",
          ])
          .optional(),
        scheduledAt: z.string().datetime().optional(),
        cronExpression: z.string().max(100).optional(),
        recurring: z.boolean().optional(),
        deepLinkPath: z.string().max(500).optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      const { id, scheduledAt, ...updates } = input;
      await db
        .update(mobilePushSchedules)
        .set({
          ...updates,
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mobilePushSchedules.id, id),
            eq(mobilePushSchedules.tenantId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  deletePushSchedule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db
        .delete(mobilePushSchedules)
        .where(
          and(
            eq(mobilePushSchedules.id, input.id),
            eq(mobilePushSchedules.tenantId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  sendPushNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      const [schedule] = await db
        .select()
        .from(mobilePushSchedules)
        .where(
          and(
            eq(mobilePushSchedules.id, input.id),
            eq(mobilePushSchedules.tenantId, ctx.user.id)
          )
        )
        .limit(1);
      if (!schedule)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Push schedule not found",
        });

      // In production this would call FCM/APNs. For now, mark as sent.
      await db
        .update(mobilePushSchedules)
        .set({
          lastSentAt: new Date(),
          sentCount: (schedule.sentCount ?? 0) + 1,
          status: "sent",
          updatedAt: new Date(),
        })
        .where(eq(mobilePushSchedules.id, input.id));

      return { success: true, sentCount: (schedule.sentCount ?? 0) + 1 };
    }),
});
