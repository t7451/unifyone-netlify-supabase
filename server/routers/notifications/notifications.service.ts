import { TRPCError } from "@trpc/server";
import { broadcastToUser, broadcastToAll } from "../../_core/sseManager";
import * as repo from "./notifications.repo";

/**
 * Notification use-cases: in-app notification center, admin push/broadcast,
 * announcements, and per-event triggers. SSE broadcast side effects
 * (`broadcastToUser` / `broadcastToAll`) and their ordering relative to DB
 * writes are preserved exactly from the original router.
 */

type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "order"
  | "payment"
  | "team"
  | "social"
  | "lead";

const dbUnavailable = () =>
  new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "DB unavailable",
  });

// ── Tier 1: In-app notification center ─────────────────────────────────────────

export async function listNotifications(userId: number, limit: number) {
  const rows = await repo.listNotifications(userId, limit);
  if (rows === null) return [];
  return rows;
}

export async function unreadCount(userId: number) {
  const row = await repo.countUnread(userId);
  if (row === null) return { count: 0 };
  return { count: Number(row?.count ?? 0) };
}

export async function markRead(id: number, userId: number) {
  const ok = await repo.markNotificationRead(id, userId);
  return { success: ok };
}

export async function markAllRead(userId: number) {
  const ok = await repo.markAllNotificationsRead(userId);
  return { success: ok };
}

export async function deleteNotification(id: number, userId: number) {
  const ok = await repo.deleteNotification(id, userId);
  return { success: ok };
}

// ── Tier 2: Admin push to a specific user / tenant ─────────────────────────────

export async function sendToUser(
  actor: { tenantId: number | null },
  input: {
    userId: number;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
  }
) {
  // Verify the target user exists, and for non-super-admins enforce same tenant.
  // Super-admins (actor.tenantId === null) can send cross-tenant notifications.
  const { db, user: targetUser } = await repo.getUserTenant(input.userId);
  if (!db) throw dbUnavailable();
  if (!targetUser) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target user not found",
    });
  }
  const isSuperAdmin = actor.tenantId === null;
  if (!isSuperAdmin && targetUser.tenantId !== actor.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot send notifications to users outside your tenant",
    });
  }
  const inserted = await repo.insertNotification({
    userId: input.userId,
    tenantId: actor.tenantId ?? undefined,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    read: false,
  });
  // Push to connected SSE client immediately (best-effort)
  broadcastToUser(input.userId, "notification", {
    id: inserted?.id,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });
  return { success: true };
}

export async function broadcastToTenant(
  actor: { tenantId: number | null },
  input: {
    tenantId: number;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
  }
) {
  if (input.tenantId !== actor.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot send notifications to users outside your tenant",
    });
  }
  const tenantUsers = await repo.listTenantUsers(input.tenantId);
  if (tenantUsers === null) throw dbUnavailable();
  if (!tenantUsers || tenantUsers.length === 0) return { sent: 0 };
  const rows = tenantUsers.map(u => ({
    userId: u.id,
    tenantId: input.tenantId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    read: false as boolean,
  }));
  await repo.insertNotifications(rows);
  // Push to each connected tenant user via SSE
  for (const u of tenantUsers) {
    const row = rows.find(r => r.userId === u.id);
    if (row) {
      broadcastToUser(u.id, "notification", {
        type: row.type,
        title: row.title,
        body: row.body,
        link: row.link,
      });
    }
  }
  return { sent: rows.length };
}

// ── Tier 3: Announcements ──────────────────────────────────────────────────────

export async function listAnnouncements(userId: number) {
  const now = new Date();
  // Get dismissed announcement IDs for this user
  const dismissed = await repo.listDismissals(userId);
  if (dismissed === null) return [];
  const dismissedIds = new Set(dismissed.map(d => d.announcementId));

  const rows = await repo.listActiveAnnouncements(now);
  if (rows === null) return [];

  return rows.filter(a => !dismissedIds.has(a.id));
}

export async function createAnnouncement(
  adminId: number,
  input: {
    title: string;
    body: string;
    type: "banner" | "toast" | "modal";
    severity: "info" | "success" | "warning" | "error";
    dismissible: boolean;
    startsAt?: string;
    endsAt?: string;
  }
) {
  const result = await repo.insertAnnouncement({
    adminId,
    title: input.title,
    body: input.body,
    type: input.type,
    severity: input.severity,
    dismissible: input.dismissible,
    startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
    endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
    active: true,
  });
  if (!result) throw dbUnavailable();
  // Notify all connected clients about the new announcement
  broadcastToAll("announcement", {
    id: result.id,
    title: input.title,
    type: input.type,
    severity: input.severity,
  });
  return { id: result.id, success: true };
}

export async function listAllAnnouncements() {
  const rows = await repo.listAllAnnouncements();
  if (rows === null) return [];
  return rows;
}

export async function toggleAnnouncement(id: number, active: boolean) {
  const ok = await repo.toggleAnnouncement(id, active);
  return { success: ok };
}

export async function deleteAnnouncement(id: number) {
  const ok = await repo.deleteAnnouncement(id);
  return { success: ok };
}

export async function dismissAnnouncement(
  userId: number,
  announcementId: number
) {
  const ok = await repo.insertDismissal(userId, announcementId);
  return { success: ok };
}

// ── Tier 4: Notification triggers ──────────────────────────────────────────────

export async function listTriggers(tenantId: number) {
  const rows = await repo.listTriggers(tenantId);
  if (rows === null) return [];
  return rows;
}

export async function upsertTrigger(input: {
  tenantId: number;
  event: string;
  inAppEnabled: boolean;
  n8nEnabled: boolean;
  n8nWebhookUrl?: string;
  zapierEnabled: boolean;
  mailchimpEnabled: boolean;
  slackWebhookUrl?: string;
  slackEnabled: boolean;
  emailEnabled: boolean;
  emailRecipients?: string;
}) {
  const { db, existing } = await repo.getTrigger(input.tenantId, input.event);
  if (!db) throw dbUnavailable();

  const values = {
    tenantId: input.tenantId,
    event: input.event,
    inAppEnabled: input.inAppEnabled,
    n8nEnabled: input.n8nEnabled,
    n8nWebhookUrl: input.n8nWebhookUrl || null,
    zapierEnabled: input.zapierEnabled,
    mailchimpEnabled: input.mailchimpEnabled,
    slackWebhookUrl: input.slackWebhookUrl || null,
    slackEnabled: input.slackEnabled,
    emailEnabled: input.emailEnabled,
    emailRecipients: input.emailRecipients || null,
  };

  if (existing) {
    await repo.updateTrigger(existing.id, values);
    return { id: existing.id, success: true };
  } else {
    const result = await repo.insertTrigger(values);
    if (!result) throw dbUnavailable();
    return { id: result.id, success: true };
  }
}

export async function deleteTrigger(id: number) {
  const ok = await repo.deleteTrigger(id);
  return { success: ok };
}
