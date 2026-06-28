import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../../db";
import { revenueStreams } from "../../../drizzle/schema";

/**
 * Data access for revenue streams. Wraps the shared Drizzle `getDb` helper so
 * the service layer never touches the database client directly. Each function
 * returns `null` when the database is unavailable; callers decide how to react.
 */

export async function listStreamsByUser(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(revenueStreams)
    .where(eq(revenueStreams.userId, userId))
    .orderBy(desc(revenueStreams.monthlyValue));
}

export async function insertStream(values: typeof revenueStreams.$inferInsert) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(revenueStreams).values(values);
  return { success: true } as const;
}

export async function updateStream(
  id: number,
  userId: number,
  updateData: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(revenueStreams)
    .set(updateData)
    .where(and(eq(revenueStreams.id, id), eq(revenueStreams.userId, userId)));
  return { success: true } as const;
}

export async function deleteStream(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  await db
    .delete(revenueStreams)
    .where(and(eq(revenueStreams.id, id), eq(revenueStreams.userId, userId)));
  return { success: true } as const;
}

export async function selectStreamsForSummary(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(revenueStreams)
    .where(eq(revenueStreams.userId, userId));
}
