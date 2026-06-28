import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as service from "./notifications.service";

// ── Helpers ───────────────────────────────────────────────────────────────────
const adminGuard = (role: string) => {
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
};

const notificationTypeEnum = z
  .enum([
    "info",
    "success",
    "warning",
    "error",
    "order",
    "payment",
    "team",
    "social",
    "lead",
  ])
  .default("info");

// ── Notification Router ───────────────────────────────────────────────────────
export const notificationsRouter = router({
  // Tier 1: In-app notification center
  // ─────────────────────────────────────────────────────────────────────────────

  /** List notifications for current user (most recent first, limit 50) */
  list: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(100).default(50) }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      return service.listNotifications(ctx.user.id, limit);
    }),

  /** Count unread notifications */
  unreadCount: protectedProcedure.query(async ({ ctx }) =>
    service.unreadCount(ctx.user.id)
  ),

  /** Mark a single notification as read */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) =>
      service.markRead(input.id, ctx.user.id)
    ),

  /** Mark all notifications as read */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) =>
    service.markAllRead(ctx.user.id)
  ),

  /** Delete a notification */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) =>
      service.deleteNotification(input.id, ctx.user.id)
    ),

  // Tier 2: Admin — send custom notification to a specific user
  // ─────────────────────────────────────────────────────────────────────────────

  /** Admin: send a push notification to a specific user */
  sendToUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        type: notificationTypeEnum,
        title: z.string().min(1).max(255),
        body: z.string().optional(),
        link: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      return service.sendToUser({ tenantId: ctx.user.tenantId }, input);
    }),

  /** Admin: broadcast notification to all users in a tenant */
  broadcastToTenant: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        type: notificationTypeEnum,
        title: z.string().min(1).max(255),
        body: z.string().optional(),
        link: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      return service.broadcastToTenant({ tenantId: ctx.user.tenantId }, input);
    }),

  // Tier 3: Announcements (admin broadcast banner/toast to all users)
  // ─────────────────────────────────────────────────────────────────────────────

  /** List active announcements for current user (excluding dismissed) */
  listAnnouncements: protectedProcedure.query(async ({ ctx }) =>
    service.listAnnouncements(ctx.user.id)
  ),

  /** Admin: create announcement */
  createAnnouncement: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        body: z.string().min(1),
        type: z.enum(["banner", "toast", "modal"]).default("banner"),
        severity: z
          .enum(["info", "success", "warning", "error"])
          .default("info"),
        dismissible: z.boolean().default(true),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      return service.createAnnouncement(ctx.user.id, input);
    }),

  /** Admin: list all announcements */
  listAllAnnouncements: protectedProcedure.query(async ({ ctx }) => {
    adminGuard(ctx.user.role);
    return service.listAllAnnouncements();
  }),

  /** Admin: toggle announcement active state */
  toggleAnnouncement: protectedProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      return service.toggleAnnouncement(input.id, input.active);
    }),

  /** Admin: delete announcement */
  deleteAnnouncement: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      return service.deleteAnnouncement(input.id);
    }),

  /** User: dismiss an announcement */
  dismissAnnouncement: protectedProcedure
    .input(z.object({ announcementId: z.number() }))
    .mutation(async ({ ctx, input }) =>
      service.dismissAnnouncement(ctx.user.id, input.announcementId)
    ),

  // Tier 4: Notification triggers (webhook/email per-event config)
  // ─────────────────────────────────────────────────────────────────────────────

  /** List notification triggers for tenant */
  listTriggers: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (input.tenantId !== ctx.user.tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot access triggers outside your tenant",
        });
      }
      return service.listTriggers(input.tenantId);
    }),

  /** Upsert a notification trigger config for an event */
  upsertTrigger: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        event: z.string().min(1).max(100),
        inAppEnabled: z.boolean().default(true),
        n8nEnabled: z.boolean().default(false),
        n8nWebhookUrl: z.string().optional(),
        zapierEnabled: z.boolean().default(false),
        mailchimpEnabled: z.boolean().default(false),
        slackWebhookUrl: z.string().optional(),
        slackEnabled: z.boolean().default(false),
        emailEnabled: z.boolean().default(false),
        emailRecipients: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.tenantId !== ctx.user.tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify triggers outside your tenant",
        });
      }
      return service.upsertTrigger(input);
    }),

  /** Delete a notification trigger */
  deleteTrigger: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => service.deleteTrigger(input.id)),
});
