import { getDb } from "../../db";
import { metaPixelEvents } from "../../../drizzle/schema";
import { desc, eq } from "drizzle-orm";

/**
 * Data access for Meta Pixel event records (`meta_pixel_events`). Queries are
 * relocated verbatim from the original router.
 */

export async function insertPixelEvent(values: {
  userId: number | null;
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  customData: Record<string, unknown> | null;
  status: "sent" | "failed" | "skipped";
  responseCode: number | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(metaPixelEvents).values(values);
}

/** Most recent events for a specific user. */
export async function listEventsForUser(userId: number, limit: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(metaPixelEvents)
    .where(eq(metaPixelEvents.userId, userId))
    .orderBy(desc(metaPixelEvents.sentAt))
    .limit(limit);
}

/** Most recent events across all users (admin). */
export async function listAllEvents(limit: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(metaPixelEvents)
    .orderBy(desc(metaPixelEvents.sentAt))
    .limit(limit);
}

/** All event rows (for aggregate stats). */
export async function selectAllEvents() {
  const db = await getDb();
  if (!db) return null;
  return db.select().from(metaPixelEvents);
}
