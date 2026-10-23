import { and, eq, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  earningsImportBatches,
  gigShifts,
  importedEarnings,
  workExpenses,
} from "../../../drizzle/schema";
import { getDb } from "../../db";

/** Select only fields needed for profit inputs; never read notes or raw CSV rows. */
export async function loadRecordedWork(
  userId: number,
  from: Date,
  through: Date,
  expenseRange: { startDate: string | null; endDate: string }
) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Work insights need a configured database.",
    });
  const [shifts, imported, expenses] = await Promise.all([
    db
      .select({
        platform: gigShifts.platform,
        grossEarnings: gigShifts.grossEarnings,
        tips: gigShifts.tips,
        bonuses: gigShifts.bonuses,
        durationMinutes: gigShifts.durationMinutes,
        totalMiles: gigShifts.totalMiles,
      })
      .from(gigShifts)
      .where(
        and(
          eq(gigShifts.userId, userId),
          eq(gigShifts.status, "completed"),
          gte(gigShifts.startTime, from),
          lte(gigShifts.startTime, through)
        )
      ),
    db
      .select({
        grossEarnings: importedEarnings.grossEarnings,
        tips: importedEarnings.tips,
        bonuses: importedEarnings.bonuses,
        totalMiles: importedEarnings.totalMiles,
      })
      .from(importedEarnings)
      .innerJoin(
        earningsImportBatches,
        eq(importedEarnings.importBatchId, earningsImportBatches.id)
      )
      .where(
        and(
          eq(importedEarnings.userId, userId),
          eq(earningsImportBatches.userId, userId),
          eq(earningsImportBatches.status, "committed"),
          gte(importedEarnings.earnedDate, from),
          lte(importedEarnings.earnedDate, through)
        )
      ),
    db
      .select({
        amountCents: workExpenses.amountCents,
        category: workExpenses.category,
      })
      .from(workExpenses)
      .where(
        and(
          eq(workExpenses.userId, userId),
          expenseRange.startDate
            ? gte(workExpenses.expenseDate, expenseRange.startDate)
            : undefined,
          lte(workExpenses.expenseDate, expenseRange.endDate)
        )
      ),
  ]);
  return { shifts, imported, expenses };
}
