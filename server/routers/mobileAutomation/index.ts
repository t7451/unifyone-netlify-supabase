import { z } from "zod";
import {
  operatorProcedure,
  publicRateLimitedProcedure,
  router,
} from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import * as service from "./mobileAutomation.service";

export const mobileAutomationRouter = router({
  // ── n8n Schedules ─────────────────────────────────────────────────────────────
  listSchedules: operatorProcedure.query(async ({ ctx }) =>
    service.listSchedules(ctx.user.tenantId!)
  ),

  createSchedule: operatorProcedure
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
    .mutation(async ({ ctx, input }) =>
      service.createSchedule(ctx.user.tenantId!, input)
    ),

  updateSchedule: operatorProcedure
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
    .mutation(async ({ ctx, input }) =>
      service.updateSchedule(ctx.user.tenantId!, input)
    ),

  deleteSchedule: operatorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) =>
      service.deleteSchedule(ctx.user.tenantId!, input.id)
    ),

  triggerSchedule: operatorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) =>
      service.triggerSchedule(ctx.user.tenantId!, input.id)
    ),

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
      return service.trackDeepLink(input, { ipAddress, userAgent });
    }),

  markDeepLinkConverted: operatorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => service.markDeepLinkConverted(input.id)),

  getAttributionStats: operatorProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ input }) => service.getAttributionStats(input.days)),

  listAttributions: operatorProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) =>
      service.listAttributions(input.limit, input.offset)
    ),

  // ── CAPI Event Log ────────────────────────────────────────────────────────────
  listCapiEvents: operatorProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) =>
      service.listCapiEvents(ctx.user.id, input.limit, input.offset)
    ),

  getCapiSummary: operatorProcedure.query(async ({ ctx }) =>
    service.getCapiSummary(ctx.user.id)
  ),

  // ── Mobile Push Schedules ──────────────────────────────────────────────────────
  listPushSchedules: operatorProcedure.query(async ({ ctx }) =>
    service.listPushSchedules(ctx.user.tenantId!)
  ),

  createPushSchedule: operatorProcedure
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
    .mutation(async ({ ctx, input }) =>
      service.createPushSchedule(ctx.user.tenantId!, input)
    ),

  updatePushSchedule: operatorProcedure
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
    .mutation(async ({ ctx, input }) =>
      service.updatePushSchedule(ctx.user.tenantId!, input)
    ),

  deletePushSchedule: operatorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) =>
      service.deletePushSchedule(ctx.user.tenantId!, input.id)
    ),

  sendPushNow: operatorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) =>
      service.sendPushNow(ctx.user.tenantId!, input.id)
    ),
});
