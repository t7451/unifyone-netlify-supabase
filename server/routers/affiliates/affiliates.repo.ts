import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../../db";
import { affiliatePrograms } from "../../../drizzle/schema";

type ProgramInsert = typeof affiliatePrograms.$inferInsert;

export async function listPrograms(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(affiliatePrograms)
    .where(eq(affiliatePrograms.userId, userId))
    .orderBy(desc(affiliatePrograms.monthlyEarnings));
}

export async function insertProgram(values: ProgramInsert) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(affiliatePrograms).values(values);
  return true;
}

export async function updateProgram(
  id: number,
  userId: number,
  updateData: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(affiliatePrograms)
    .set(updateData)
    .where(
      and(eq(affiliatePrograms.id, id), eq(affiliatePrograms.userId, userId))
    );
  return true;
}

export async function deleteProgram(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(affiliatePrograms)
    .where(
      and(eq(affiliatePrograms.id, id), eq(affiliatePrograms.userId, userId))
    );
  return true;
}

export async function listProgramsForSummary(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(affiliatePrograms)
    .where(eq(affiliatePrograms.userId, userId));
}
