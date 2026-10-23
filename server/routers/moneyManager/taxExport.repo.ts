/** Annual accountant packet queries. Every source is owner-scoped before aggregation. */
import { and, asc, eq, gte, inArray, lt, lte, or } from "drizzle-orm";
import {
  earningsImportBatches,
  gigShifts,
  importedEarnings,
  mileageLogs,
  workExpenses,
} from "../../../drizzle/schema";
import type { Db } from "./moneyManager.repo";

export async function getAnnualRecords(db: Db, userId: number, year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const next = new Date(Date.UTC(year + 1, 0, 1));
  const [shifts, mileage, imports, expenses, mileageElsewhere] =
    await Promise.all([
      db
        .select()
        .from(gigShifts)
        .where(
          and(
            eq(gigShifts.userId, userId),
            eq(gigShifts.status, "completed"),
            inArray(gigShifts.entrySource, ["timer", "manual"]),
            gte(gigShifts.startTime, start),
            lt(gigShifts.startTime, next)
          )
        )
        .orderBy(asc(gigShifts.startTime), asc(gigShifts.id)),
      db
        .select()
        .from(mileageLogs)
        .where(
          and(
            eq(mileageLogs.userId, userId),
            gte(mileageLogs.date, start),
            lt(mileageLogs.date, next)
          )
        )
        .orderBy(asc(mileageLogs.date), asc(mileageLogs.id)),
      db
        .select({
          id: importedEarnings.id,
          batchId: importedEarnings.importBatchId,
          date: importedEarnings.earnedDate,
          platform: importedEarnings.platform,
          grossEarnings: importedEarnings.grossEarnings,
          tips: importedEarnings.tips,
          bonuses: importedEarnings.bonuses,
          totalMiles: importedEarnings.totalMiles,
        })
        .from(importedEarnings)
        .innerJoin(
          earningsImportBatches,
          eq(earningsImportBatches.id, importedEarnings.importBatchId)
        )
        .where(
          and(
            eq(importedEarnings.userId, userId),
            eq(earningsImportBatches.userId, userId),
            eq(earningsImportBatches.status, "committed"),
            gte(importedEarnings.earnedDate, start),
            lt(importedEarnings.earnedDate, next)
          )
        )
        .orderBy(asc(importedEarnings.earnedDate), asc(importedEarnings.id)),
      db
        .select({
          id: workExpenses.id,
          date: workExpenses.expenseDate,
          amountCents: workExpenses.amountCents,
          category: workExpenses.category,
          merchant: workExpenses.merchant,
          notes: workExpenses.notes,
        })
        .from(workExpenses)
        .where(
          and(
            eq(workExpenses.userId, userId),
            gte(workExpenses.expenseDate, `${year}-01-01`),
            lte(workExpenses.expenseDate, `${year}-12-31`)
          )
        )
        .orderBy(asc(workExpenses.expenseDate), asc(workExpenses.id)),
      // A saved log owns its calendar date, even when its linked session started
      // in another year. Suppress that session's shift-only mileage fallback.
      db
        .select({ shiftId: mileageLogs.shiftId })
        .from(mileageLogs)
        .innerJoin(gigShifts, eq(gigShifts.id, mileageLogs.shiftId))
        .where(
          and(
            eq(mileageLogs.userId, userId),
            eq(gigShifts.userId, userId),
            eq(gigShifts.status, "completed"),
            inArray(gigShifts.entrySource, ["timer", "manual"]),
            gte(gigShifts.startTime, start),
            lt(gigShifts.startTime, next),
            or(lt(mileageLogs.date, start), gte(mileageLogs.date, next))
          )
        ),
    ]);
  return { shifts, mileage, imports, expenses, mileageElsewhere };
}
