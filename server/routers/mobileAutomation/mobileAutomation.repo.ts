import { getDb } from "../../db";
import {
  n8nSchedules,
  deepLinkAttributions,
  metaPixelEvents,
  mobilePushSchedules,
} from "../../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

/**
 * Data access for mobile-automation features: n8n schedules, deep-link
 * attributions, CAPI event log, and mobile push schedules. Wraps the shared
 * `getDb()` helper; queries are relocated verbatim from the original router.
 * Helpers return `null` when the DB is unavailable so callers preserve their
 * original short-circuit responses.
 */

// ── n8n Schedules ─────────────────────────────────────────────────────────────

export async function listSchedules(tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(n8nSchedules)
    .where(eq(n8nSchedules.tenantId, tenantId))
    .orderBy(desc(n8nSchedules.createdAt));
}

export async function insertSchedule(values: typeof n8nSchedules.$inferInsert) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(n8nSchedules).values(values);
  return true;
}

export async function updateSchedule(
  id: number,
  tenantId: number,
  values: Partial<typeof n8nSchedules.$inferInsert>
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(n8nSchedules)
    .set(values)
    .where(and(eq(n8nSchedules.id, id), eq(n8nSchedules.tenantId, tenantId)));
  return true;
}

export async function deleteSchedule(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(n8nSchedules)
    .where(and(eq(n8nSchedules.id, id), eq(n8nSchedules.tenantId, tenantId)));
  return true;
}

export async function getSchedule(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return { db: null as null, schedule: undefined };
  const [schedule] = await db
    .select()
    .from(n8nSchedules)
    .where(and(eq(n8nSchedules.id, id), eq(n8nSchedules.tenantId, tenantId)))
    .limit(1);
  return { db, schedule };
}

export async function recordScheduleRun(
  id: number,
  values: Partial<typeof n8nSchedules.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(n8nSchedules).set(values).where(eq(n8nSchedules.id, id));
}

// ── Deep Link Attributions ────────────────────────────────────────────────────

export async function insertDeepLink(
  values: typeof deepLinkAttributions.$inferInsert
) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(deepLinkAttributions).values(values);
  return true;
}

export async function markDeepLinkConverted(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(deepLinkAttributions)
    .set({ converted: true, convertedAt: new Date() })
    .where(eq(deepLinkAttributions.id, id));
  return true;
}

export async function listDeepLinksSince(since: Date) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(deepLinkAttributions)
    .where(gte(deepLinkAttributions.createdAt, since));
}

export async function listDeepLinks(limit: number, offset: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(deepLinkAttributions)
    .orderBy(desc(deepLinkAttributions.createdAt))
    .limit(limit)
    .offset(offset);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(deepLinkAttributions);
  return { rows, total: Number(count) };
}

// ── CAPI Event Log ────────────────────────────────────────────────────────────

export async function listCapiEvents(
  userId: number,
  limit: number,
  offset: number
) {
  const db = await getDb();
  if (!db) return null;
  const events = await db
    .select()
    .from(metaPixelEvents)
    .where(eq(metaPixelEvents.userId, userId))
    .orderBy(desc(metaPixelEvents.sentAt))
    .limit(limit)
    .offset(offset);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(metaPixelEvents)
    .where(eq(metaPixelEvents.userId, userId));
  return { events, total: Number(count) };
}

export async function listCapiEventNames(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select({ eventName: metaPixelEvents.eventName })
    .from(metaPixelEvents)
    .where(eq(metaPixelEvents.userId, userId));
}

// ── Mobile Push Schedules ──────────────────────────────────────────────────────

export async function listPushSchedules(tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(mobilePushSchedules)
    .where(eq(mobilePushSchedules.tenantId, tenantId))
    .orderBy(desc(mobilePushSchedules.createdAt));
}

export async function insertPushSchedule(
  values: typeof mobilePushSchedules.$inferInsert
) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(mobilePushSchedules).values(values);
  return true;
}

export async function updatePushSchedule(
  id: number,
  tenantId: number,
  values: Partial<typeof mobilePushSchedules.$inferInsert>
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(mobilePushSchedules)
    .set(values)
    .where(
      and(
        eq(mobilePushSchedules.id, id),
        eq(mobilePushSchedules.tenantId, tenantId)
      )
    );
  return true;
}

export async function deletePushSchedule(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(mobilePushSchedules)
    .where(
      and(
        eq(mobilePushSchedules.id, id),
        eq(mobilePushSchedules.tenantId, tenantId)
      )
    );
  return true;
}

export async function getPushSchedule(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return { db: null as null, schedule: undefined };
  const [schedule] = await db
    .select()
    .from(mobilePushSchedules)
    .where(
      and(
        eq(mobilePushSchedules.id, id),
        eq(mobilePushSchedules.tenantId, tenantId)
      )
    )
    .limit(1);
  return { db, schedule };
}

export async function recordPushSent(
  id: number,
  values: Partial<typeof mobilePushSchedules.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(mobilePushSchedules)
    .set(values)
    .where(eq(mobilePushSchedules.id, id));
}
