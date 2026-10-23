import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { workExpenses } from "../../../drizzle/schema";
import { getDb } from "../../db";
import type { CanonicalExpense } from "./service";

export type StoredExpense = typeof workExpenses.$inferSelect;
async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Expenses need a configured database.",
    });
  return db;
}
export async function insert(userId: number, input: CanonicalExpense) {
  await (
    await database()
  )
    .insert(workExpenses)
    .values({ ...input, userId })
    .onConflictDoNothing({
      target: [workExpenses.userId, workExpenses.clientReference],
    });
}
export async function findByReference(userId: number, reference: string) {
  const [expense] = await (
    await database()
  )
    .select()
    .from(workExpenses)
    .where(
      and(
        eq(workExpenses.userId, userId),
        eq(workExpenses.clientReference, reference)
      )
    )
    .limit(1);
  return expense;
}
export async function list(
  userId: number,
  range: { startDate: string | null; endDate: string },
  limit: number,
  offset: number
) {
  const db = await database();
  const where = and(
    eq(workExpenses.userId, userId),
    lte(workExpenses.expenseDate, range.endDate),
    ...(range.startDate ? [gte(workExpenses.expenseDate, range.startDate)] : [])
  );
  const [entries, totalsByCategory] = await db.batch([
    db
      .select({
        id: workExpenses.id,
        expenseDate: workExpenses.expenseDate,
        amountCents: workExpenses.amountCents,
        category: workExpenses.category,
        merchant: workExpenses.merchant,
        notes: workExpenses.notes,
        createdAt: workExpenses.createdAt,
      })
      .from(workExpenses)
      .where(where)
      .orderBy(desc(workExpenses.expenseDate), desc(workExpenses.id))
      .limit(limit)
      .offset(offset),
    db
      .select({
        category: workExpenses.category,
        amountCents: sql<string>`sum(${workExpenses.amountCents})::text`,
        count: sql<string>`count(*)::text`,
      })
      .from(workExpenses)
      .where(where)
      .groupBy(workExpenses.category),
  ]);
  return { entries, totalsByCategory };
}
export async function remove(userId: number, expenseId: number) {
  await (await database())
    .delete(workExpenses)
    .where(
      and(eq(workExpenses.userId, userId), eq(workExpenses.id, expenseId))
    );
}
