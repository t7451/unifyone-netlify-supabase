import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  notifications,
  announcements,
  announcementDismissals,
  notificationTriggers,
  users,
} from "../../drizzle/schema";
import { eq, and, desc, isNull, or, gte, lte, sql } from "drizzle-orm";

// ── Helpers ───────────────────────────────────────────────────────────────────
const adminGuard = (role: string) => {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
};

// ── Notification Router ───────────────────────────────────────────────────────
export const notificationsRouter = router({
  // Tier 1: In-app notification center
  // ─────────────────────────────────────────────────────────────────────────────

  /** List notifications for current user (most recent first, limit 50) */
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    }),

  /** Count unread notifications */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.read, false)));
    return { count: Number(row?.count ?? 0) };
  }),

  /** Mark a single notification as read */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),

  /** Mark all notifications as read */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { success: false };
    await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.read, false)));
    return { success: true };
  }),

  /** Delete a notification */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .delete(notifications)
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),

  // Tier 2: Admin — send custom notification to a specific user
  // ─────────────────────────────────────────────────────────────────────────────

  /** Admin: send a push notification to a specific user */
  sendToUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        type: z
          .enum(["info", "success", "warning", "error", "order", "payment", "team", "social", "lead"])
          .default("info"),
        title: z.string().min(1).max(255),
        body: z.string().optional(),
        link: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(notifications).values({
        userId: input.userId,
        tenantId: ctx.user.tenantId ?? undefined,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        read: false,
      });
      return { success: true };
    }),

  /** Admin: broadcast notification to all users in a tenant */
  broadcastToTenant: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        type: z
          .enum(["info", "success", "warning", "error", "order", "payment", "team", "social", "lead"])
          .default("info"),
        title: z.string().min(1).max(255),
        body: z.string().optional(),
        link: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Get all users in tenant
      const tenantUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.tenantId, input.tenantId));
      if (!tenantUsers || tenantUsers.length === 0) return { sent: 0 };
      const rows = tenantUsers.map((u) => ({
        userId: u.id,
        tenantId: input.tenantId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        read: false as boolean,
      }));
      await db.insert(notifications).values(rows);
      return { sent: rows.length };
    }),

  // Tier 3: Announcements (admin broadcast banner/toast to all users)
  // ─────────────────────────────────────────────────────────────────────────────

  /** List active announcements for current user (excluding dismissed) */
  listAnnouncements: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    // Get dismissed announcement IDs for this user
    const dismissed = await db
      .select({ announcementId: announcementDismissals.announcementId })
      .from(announcementDismissals)
      .where(eq(announcementDismissals.userId, ctx.user.id));
    const dismissedIds = new Set(dismissed.map((d) => d.announcementId));

    const rows = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.active, true),
          lte(announcements.startsAt, now),
          or(isNull(announcements.endsAt), gte(announcements.endsAt, now))
        )
      )
      .orderBy(desc(announcements.createdAt));

    return rows.filter((a) => !dismissedIds.has(a.id));
  }),

  /** Admin: create announcement */
  createAnnouncement: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        body: z.string().min(1),
        type: z.enum(["banner", "toast", "modal"]).default("banner"),
        severity: z.enum(["info", "success", "warning", "error"]).default("info"),
        dismissible: z.boolean().default(true),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(announcements).values({
        adminId: ctx.user.id,
        title: input.title,
        body: input.body,
        type: input.type,
        severity: input.severity,
        dismissible: input.dismissible,
        startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        active: true,
      });
      return { id: (result as { insertId: number }).insertId, success: true };
    }),

  /** Admin: list all announcements */
  listAllAnnouncements: protectedProcedure.query(async ({ ctx }) => {
    adminGuard(ctx.user.role);
    const db = await getDb();
    if (!db) return [];
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }),

  /** Admin: toggle announcement active state */
  toggleAnnouncement: protectedProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(announcements)
        .set({ active: input.active })
        .where(eq(announcements.id, input.id));
      return { success: true };
    }),

  /** Admin: delete announcement */
  deleteAnnouncement: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      adminGuard(ctx.user.role);
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(announcements).where(eq(announcements.id, input.id));
      return { success: true };
    }),

  /** User: dismiss an announcement */
  dismissAnnouncement: protectedProcedure
    .input(z.object({ announcementId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      try {
        await db.insert(announcementDismissals).values({
          userId: ctx.user.id,
          announcementId: input.announcementId,
        });
      } catch {
        // Duplicate — already dismissed, ignore
      }
      return { success: true };
    }),

  // Tier 4: Notification triggers (webhook/email per-event config)
  // ─────────────────────────────────────────────────────────────────────────────

  /** List notification triggers for tenant */
  listTriggers: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(notificationTriggers)
        .where(eq(notificationTriggers.tenantId, input.tenantId));
    }),

  /** Upsert a notification trigger config for an event */
  upsertTrigger: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        event: z.string().min(1).max(100),
        n8nEnabled: z.boolean().default(false),
        zapierEnabled: z.boolean().default(false),
        mailchimpEnabled: z.boolean().default(false),
        slackWebhookUrl: z.string().optional(),
        slackEnabled: z.boolean().default(false),
        emailEnabled: z.boolean().default(false),
        emailRecipients: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [existing] = await db
        .select()
        .from(notificationTriggers)
        .where(
          and(
            eq(notificationTriggers.tenantId, input.tenantId),
            eq(notificationTriggers.event, input.event)
          )
        )
        .limit(1);

      const values = {
        tenantId: input.tenantId,
        event: input.event,
        n8nEnabled: input.n8nEnabled,
        zapierEnabled: input.zapierEnabled,
        mailchimpEnabled: input.mailchimpEnabled,
        slackWebhookUrl: input.slackWebhookUrl || null,
        slackEnabled: input.slackEnabled,
        emailEnabled: input.emailEnabled,
        emailRecipients: input.emailRecipients || null,
      };

      if (existing) {
        await db
          .update(notificationTriggers)
          .set(values)
          .where(eq(notificationTriggers.id, existing.id));
        return { id: existing.id, success: true };
      } else {
        const [result] = await db.insert(notificationTriggers).values(values);
        return { id: (result as { insertId: number }).insertId, success: true };
      }
    }),

  /** Delete a notification trigger */
  deleteTrigger: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(notificationTriggers).where(eq(notificationTriggers.id, input.id));
      return { success: true };
    }),
});
