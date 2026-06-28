import { eq, desc, count } from "drizzle-orm";
import { getDb } from "../../db";
import { sovereignWaitlist } from "../../../drizzle/schema";

type WaitlistStatus =
  | "pending"
  | "contacted"
  | "qualified"
  | "converted"
  | "rejected";

/** Data access for the Sovereign waitlist. Wraps the shared `getDb` helper. */
export async function findWaitlistByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select({
      id: sovereignWaitlist.id,
      position: sovereignWaitlist.position,
    })
    .from(sovereignWaitlist)
    .where(eq(sovereignWaitlist.email, email))
    .limit(1);
}

export async function countWaitlist(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [{ total }] = await db
    .select({ total: count() })
    .from(sovereignWaitlist);
  return total || 0;
}

export async function insertWaitlistEntry(
  values: typeof sovereignWaitlist.$inferInsert
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(sovereignWaitlist).values(values);
}

export async function listWaitlistEntries(input: {
  limit: number;
  offset: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const query = db
    .select()
    .from(sovereignWaitlist)
    .orderBy(desc(sovereignWaitlist.createdAt))
    .limit(input.limit)
    .offset(input.offset);
  const entries = await query;
  const [{ total }] = await db
    .select({ total: count() })
    .from(sovereignWaitlist);
  return { entries, total: total || 0 };
}

export async function updateWaitlistStatus(input: {
  id: number;
  status: WaitlistStatus;
  notes?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(sovereignWaitlist)
    .set({ status: input.status, notes: input.notes })
    .where(eq(sovereignWaitlist.id, input.id));
}
