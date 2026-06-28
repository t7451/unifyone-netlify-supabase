import { getDb } from "../../db";
import {
  notifications,
  announcements,
  announcementDismissals,
  notificationTriggers,
  users,
} from "../../../drizzle/schema";
import { eq, and, desc, isNull, or, gte, lte, sql } from "drizzle-orm";

/**
 * Data access for the notification subsystem (in-app notifications,
 * announcements, dismissals, per-event triggers). Wraps the shared `getDb()`
 * helper; queries are relocated verbatim from the original router. Each helper
 * returns `null` when the DB is unavailable so callers can preserve their
 * original short-circuit responses.
 */

// ── Notifications ─────────────────────────────────────────────────────────────

export async function listNotifications(userId: number, limit: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnread(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false))
    );
  return row;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return true;
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false))
    );
  return true;
}

export async function deleteNotification(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return true;
}

export async function getUserTenant(userId: number) {
  const db = await getDb();
  if (!db) return { db: null as null, user: undefined };
  const [targetUser] = await db
    .select({ tenantId: users.tenantId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { db, user: targetUser };
}

export async function insertNotification(values: {
  userId: number;
  tenantId?: number;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  const [inserted] = await db.insert(notifications).values(values).returning();
  return inserted;
}

export async function listTenantUsers(tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.tenantId, tenantId));
}

export async function insertNotifications(
  rows: Array<{
    userId: number;
    tenantId: number;
    type: string;
    title: string;
    body?: string;
    link?: string;
    read: boolean;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(rows);
}

// ── Announcements ─────────────────────────────────────────────────────────────

export async function listDismissals(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select({ announcementId: announcementDismissals.announcementId })
    .from(announcementDismissals)
    .where(eq(announcementDismissals.userId, userId));
}

export async function listActiveAnnouncements(now: Date) {
  const db = await getDb();
  if (!db) return null;
  return db
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
}

export async function insertAnnouncement(values: {
  adminId: number;
  title: string;
  body: string;
  type: "banner" | "toast" | "modal";
  severity: "info" | "success" | "warning" | "error";
  dismissible: boolean;
  startsAt: Date;
  endsAt?: Date;
  active: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(announcements).values(values).returning();
  return result;
}

export async function listAllAnnouncements() {
  const db = await getDb();
  if (!db) return null;
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function toggleAnnouncement(id: number, active: boolean) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(announcements)
    .set({ active })
    .where(eq(announcements.id, id));
  return true;
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(announcements).where(eq(announcements.id, id));
  return true;
}

export async function insertDismissal(userId: number, announcementId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.insert(announcementDismissals).values({ userId, announcementId });
  } catch {
    // Duplicate — already dismissed, ignore
  }
  return true;
}

// ── Notification Triggers ──────────────────────────────────────────────────────

export async function listTriggers(tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(notificationTriggers)
    .where(eq(notificationTriggers.tenantId, tenantId));
}

export async function getTrigger(tenantId: number, event: string) {
  const db = await getDb();
  if (!db) return { db: null as null, existing: undefined };
  const [existing] = await db
    .select()
    .from(notificationTriggers)
    .where(
      and(
        eq(notificationTriggers.tenantId, tenantId),
        eq(notificationTriggers.event, event)
      )
    )
    .limit(1);
  return { db, existing };
}

export async function updateTrigger(
  id: number,
  values: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notificationTriggers)
    .set(values)
    .where(eq(notificationTriggers.id, id));
}

export async function insertTrigger(values: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .insert(notificationTriggers)
    .values(values as typeof notificationTriggers.$inferInsert)
    .returning();
  return result;
}

export async function deleteTrigger(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(notificationTriggers).where(eq(notificationTriggers.id, id));
  return true;
}
