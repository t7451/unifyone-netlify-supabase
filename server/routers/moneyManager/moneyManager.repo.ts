/**
 * server/routers/moneyManager/moneyManager.repo.ts
 *
 * Data-access layer for the Money Manager feature. Wraps the Drizzle queries
 * against gigShifts, mileageLogs, financialRules, subscriptionEntitlements,
 * userPoints, and pointsTransactions. Every function takes a live db handle
 * (resolved by the service layer via getDb) — null-handling and response
 * shaping stay in the service/transport layers so behavior is unchanged.
 */

import { getDb } from "../../db";
import {
  gigShifts,
  mileageLogs,
  financialRules,
  subscriptionEntitlements,
  userPoints,
  pointsTransactions,
  importedEarnings,
  earningsImportBatches,
  savingsEnvelopes,
  envelopeTransactions,
} from "../../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export { getDb };

export type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// ── Points ────────────────────────────────────────────────────────────────────
export function getUserPointsRow(db: Db, userId: number) {
  return db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);
}

export function updateUserPoints(
  db: Db,
  userId: number,
  values: {
    totalPoints: number;
    lifetimePoints: number;
    level: number;
    lastActivityAt: Date;
  }
) {
  return db.update(userPoints).set(values).where(eq(userPoints.userId, userId));
}

export function insertUserPoints(
  db: Db,
  values: {
    userId: number;
    totalPoints: number;
    lifetimePoints: number;
    level: number;
    lastActivityAt: Date;
  }
) {
  return db.insert(userPoints).values(values);
}

export function insertPointsTransaction(
  db: Db,
  values: {
    userId: number;
    points: number;
    action: string;
    description: string;
    referenceId?: string;
    balanceAfter: number;
  }
) {
  return db.insert(pointsTransactions).values(values);
}

export function getPointsBalanceRow(db: Db, userId: number) {
  return db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);
}

export function listPointsTransactions(
  db: Db,
  userId: number,
  limit: number,
  offset: number
) {
  return db
    .select()
    .from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId))
    .orderBy(desc(pointsTransactions.createdAt))
    .limit(limit)
    .offset(offset);
}

// ── Gig Shifts ──────────────────────────────────────────────────────────────
export function insertShift(db: Db, values: typeof gigShifts.$inferInsert) {
  return db.insert(gigShifts).values(values).returning({ id: gigShifts.id });
}

/** Owner lock and separate statements share a READ COMMITTED Neon transaction.
 * The select after acquiring the lock sees the previous starter's committed row. */
export async function startOrResumeShift(
  db: Db,
  userId: number,
  platform: string,
  startLat?: number,
  startLng?: number
) {
  const [, , , active] = await db.batch([
    db.execute(sql`set transaction isolation level read committed`),
    db.execute(sql`select pg_advisory_xact_lock(718331, ${userId})`),
    db.execute(sql`insert into gig_shifts ("userId", platform, "startTime", "startLat", "startLng", status)
      select ${userId}, ${platform}, now() at time zone 'UTC', ${startLat?.toFixed(7) ?? null}, ${startLng?.toFixed(7) ?? null}, 'active'
      where not exists (select 1 from gig_shifts where "userId" = ${userId} and status = 'active')`),
    db
      .select({
        id: gigShifts.id,
        startTime: gigShifts.startTime,
        platform: gigShifts.platform,
      })
      .from(gigShifts)
      .where(and(eq(gigShifts.userId, userId), eq(gigShifts.status, "active")))
      .orderBy(desc(gigShifts.startTime), desc(gigShifts.id))
      .limit(1),
  ]);
  return active[0];
}

/** The completion and its mileage record commit together; only one active-row
 * claimant can win, so simultaneous end requests cannot duplicate mileage. */
export async function completeShiftWithMileage(
  db: Db,
  userId: number,
  shiftId: number,
  values: {
    endTime: Date;
    durationMinutes: number;
    grossEarnings: string;
    tips: string;
    bonuses: string;
    totalMiles: string;
    endLat?: string;
    endLng?: string;
    notes?: string;
  },
  mileage: {
    date: Date;
    miles: string;
    irsRateCents: string;
    deductionCents: number;
  } | null
) {
  const result = await db.execute(sql`with completed as (
    update gig_shifts set "endTime" = ${values.endTime.toISOString()}::timestamp,
      "durationMinutes" = ${values.durationMinutes}, "grossEarnings" = ${values.grossEarnings}, tips = ${values.tips}, bonuses = ${values.bonuses},
      "totalMiles" = ${values.totalMiles}, "endLat" = ${values.endLat ?? null}, "endLng" = ${values.endLng ?? null}, notes = ${values.notes ?? null}, status = 'completed', "updatedAt" = now()
    where id = ${shiftId} and "userId" = ${userId} and status = 'active' returning id
  ), logged as (
    insert into mileage_logs ("userId", "shiftId", date, miles, purpose, "irsRateCents", "deductionCents")
    select ${userId}, id, ${mileage?.date.toISOString() ?? values.endTime.toISOString()}::timestamp,
      ${mileage?.miles ?? "0"}, 'business', ${mileage?.irsRateCents ?? "0"}, ${mileage?.deductionCents ?? 0}
    from completed where ${mileage !== null} returning id
  ) select id from completed`);
  return result.rows.length > 0;
}
export async function getOwnedShiftMileageDate(
  db: Db,
  userId: number,
  shiftId: number
) {
  const [row] = await db
    .select({ date: mileageLogs.date })
    .from(mileageLogs)
    .where(
      and(eq(mileageLogs.userId, userId), eq(mileageLogs.shiftId, shiftId))
    )
    .limit(1);
  return row?.date ?? null;
}

export function getOwnedShift(db: Db, shiftId: number, userId: number) {
  return db
    .select()
    .from(gigShifts)
    .where(and(eq(gigShifts.id, shiftId), eq(gigShifts.userId, userId)))
    .limit(1);
}

export function updateOwnedShift(
  db: Db,
  shiftId: number,
  userId: number,
  values: Partial<typeof gigShifts.$inferInsert>
) {
  return db
    .update(gigShifts)
    .set(values)
    .where(and(eq(gigShifts.id, shiftId), eq(gigShifts.userId, userId)));
}

export function getActiveShiftRow(db: Db, userId: number) {
  return db
    .select()
    .from(gigShifts)
    .where(and(eq(gigShifts.userId, userId), eq(gigShifts.status, "active")))
    .orderBy(desc(gigShifts.startTime))
    .limit(1);
}

export function getActiveOwnedShift(db: Db, shiftId: number, userId: number) {
  return db
    .select()
    .from(gigShifts)
    .where(
      and(
        eq(gigShifts.id, shiftId),
        eq(gigShifts.userId, userId),
        eq(gigShifts.status, "active")
      )
    )
    .limit(1);
}

export function listShiftsFiltered(
  db: Db,
  conditions: SQL[],
  limit: number,
  offset: number
) {
  return db
    .select()
    .from(gigShifts)
    .where(and(...conditions))
    .orderBy(desc(gigShifts.startTime))
    .limit(limit)
    .offset(offset);
}

export function countShiftsFiltered(db: Db, conditions: SQL[]) {
  return db
    .select({ count: sql<number>`count(*)` })
    .from(gigShifts)
    .where(and(...conditions));
}

export function getCompletedShiftsSince(
  db: Db,
  userId: number,
  startDate: Date
) {
  return db
    .select()
    .from(gigShifts)
    .where(
      and(
        eq(gigShifts.userId, userId),
        eq(gigShifts.status, "completed"),
        gte(gigShifts.startTime, startDate)
      )
    );
}

export function getCompletedShiftsSinceOrdered(
  db: Db,
  userId: number,
  startDate: Date
) {
  return db
    .select()
    .from(gigShifts)
    .where(
      and(
        eq(gigShifts.userId, userId),
        eq(gigShifts.status, "completed"),
        gte(gigShifts.startTime, startDate)
      )
    )
    .orderBy(desc(gigShifts.startTime));
}

export function getRecentCompletedShifts(
  db: Db,
  userId: number,
  limit: number
) {
  return db
    .select()
    .from(gigShifts)
    .where(and(eq(gigShifts.userId, userId), eq(gigShifts.status, "completed")))
    .orderBy(desc(gigShifts.startTime))
    .limit(limit);
}

export function getCompletedShiftEarningsSince(
  db: Db,
  userId: number,
  startDate: Date
) {
  return db
    .select({
      id: gigShifts.id,
      startTime: gigShifts.startTime,
      grossEarnings: gigShifts.grossEarnings,
      tips: gigShifts.tips,
      bonuses: gigShifts.bonuses,
      totalMiles: gigShifts.totalMiles,
    })
    .from(gigShifts)
    .where(
      and(
        eq(gigShifts.userId, userId),
        eq(gigShifts.status, "completed"),
        gte(gigShifts.startTime, startDate)
      )
    );
}

export function getCompletedShiftMilesSince(
  db: Db,
  userId: number,
  startDate: Date
) {
  return db
    .select({
      id: gigShifts.id,
      totalMiles: gigShifts.totalMiles,
      startTime: gigShifts.startTime,
    })
    .from(gigShifts)
    .where(
      and(
        eq(gigShifts.userId, userId),
        eq(gigShifts.status, "completed"),
        gte(gigShifts.startTime, startDate)
      )
    );
}

// ── Mileage Logs ──────────────────────────────────────────────────────────────
export function insertMileageLog(
  db: Db,
  values: typeof mileageLogs.$inferInsert
) {
  return db.insert(mileageLogs).values(values);
}

export function getMileageLogsBetween(
  db: Db,
  userId: number,
  startOfYear: Date,
  endOfYear: Date
) {
  return db
    .select()
    .from(mileageLogs)
    .where(
      and(
        eq(mileageLogs.userId, userId),
        gte(mileageLogs.date, startOfYear),
        lte(mileageLogs.date, endOfYear)
      )
    )
    .orderBy(desc(mileageLogs.date));
}

export function getRecentMileageLogs(db: Db, userId: number, limit: number) {
  return db
    .select()
    .from(mileageLogs)
    .where(eq(mileageLogs.userId, userId))
    .orderBy(desc(mileageLogs.date))
    .limit(limit);
}

export function getMileageMilesSince(
  db: Db,
  userId: number,
  startOfYear: Date
) {
  return db
    .select({
      miles: mileageLogs.miles,
      shiftId: mileageLogs.shiftId,
      date: mileageLogs.date,
      irsRateCents: mileageLogs.irsRateCents,
      deductionCents: mileageLogs.deductionCents,
    })
    .from(mileageLogs)
    .where(
      and(eq(mileageLogs.userId, userId), gte(mileageLogs.date, startOfYear))
    );
}

export function getMileageDeductionsSince(
  db: Db,
  userId: number,
  startOfYear: Date
) {
  return db
    .select({
      deductionCents: mileageLogs.deductionCents,
      miles: mileageLogs.miles,
      shiftId: mileageLogs.shiftId,
      date: mileageLogs.date,
      irsRateCents: mileageLogs.irsRateCents,
    })
    .from(mileageLogs)
    .where(
      and(eq(mileageLogs.userId, userId), gte(mileageLogs.date, startOfYear))
    );
}

// ── Financial Rules ───────────────────────────────────────────────────────────
export function listRules(db: Db, userId: number) {
  return db
    .select()
    .from(financialRules)
    .where(eq(financialRules.userId, userId))
    .orderBy(desc(financialRules.createdAt));
}

export function insertRule(db: Db, values: typeof financialRules.$inferInsert) {
  return db.insert(financialRules).values(values);
}

export function updateRuleEnabled(
  db: Db,
  ruleId: number,
  userId: number,
  enabled: boolean
) {
  return db
    .update(financialRules)
    .set({ enabled })
    .where(
      and(eq(financialRules.id, ruleId), eq(financialRules.userId, userId))
    );
}

export function deleteRule(db: Db, ruleId: number, userId: number) {
  return db
    .delete(financialRules)
    .where(
      and(eq(financialRules.id, ruleId), eq(financialRules.userId, userId))
    );
}

// ── Subscription Entitlements ─────────────────────────────────────────────────
export function getActiveEntitlement(db: Db, userId: number) {
  return db
    .select()
    .from(subscriptionEntitlements)
    .where(
      and(
        eq(subscriptionEntitlements.userId, userId),
        eq(subscriptionEntitlements.status, "active")
      )
    )
    .orderBy(desc(subscriptionEntitlements.createdAt))
    .limit(1);
}

// ── Earnings Import ───────────────────────────────────────────────────────────
// Multi-platform earnings imported from CSV / 1099 exports. Batches are the
// per-file audit/undo unit; imported rows reference a batch. Every query is
// scoped by userId — imports carry no tenant column and belong to one operator.
export function insertImportBatch(
  db: Db,
  values: typeof earningsImportBatches.$inferInsert
) {
  return db
    .insert(earningsImportBatches)
    .values(values)
    .returning({ id: earningsImportBatches.id });
}

export function insertImportedEarnings(
  db: Db,
  rows: Array<typeof importedEarnings.$inferInsert>
) {
  return db
    .insert(importedEarnings)
    .values(rows)
    .returning({ id: importedEarnings.id });
}

export function getImportBatches(db: Db, userId: number) {
  return db
    .select()
    .from(earningsImportBatches)
    .where(eq(earningsImportBatches.userId, userId))
    .orderBy(desc(earningsImportBatches.createdAt));
}

export function getImportedEarningsSince(
  db: Db,
  userId: number,
  startDate: Date
) {
  return db
    .select()
    .from(importedEarnings)
    .where(
      and(
        eq(importedEarnings.userId, userId),
        gte(importedEarnings.earnedDate, startDate)
      )
    );
}

// Scoped by both batchId AND userId so an operator can only delete their own
// batch — the userId guard defends against a forged batchId from another user.
export function deleteImportBatch(db: Db, batchId: number, userId: number) {
  return db
    .delete(earningsImportBatches)
    .where(
      and(
        eq(earningsImportBatches.id, batchId),
        eq(earningsImportBatches.userId, userId)
      )
    );
}

export function deleteImportedEarningsForBatch(
  db: Db,
  batchId: number,
  userId: number
) {
  return db
    .delete(importedEarnings)
    .where(
      and(
        eq(importedEarnings.importBatchId, batchId),
        eq(importedEarnings.userId, userId)
      )
    );
}

// ── Set-Aside / Envelope Ledger ───────────────────────────────────────────────
export function getEnvelopeRow(db: Db, envelopeId: number, userId: number) {
  return db
    .select()
    .from(savingsEnvelopes)
    .where(
      and(
        eq(savingsEnvelopes.id, envelopeId),
        eq(savingsEnvelopes.userId, userId)
      )
    )
    .limit(1);
}

export function getEnvelopeByCategory(
  db: Db,
  userId: number,
  category: "tax" | "savings" | "emergency" | "goal"
) {
  return db
    .select()
    .from(savingsEnvelopes)
    .where(
      and(
        eq(savingsEnvelopes.userId, userId),
        eq(savingsEnvelopes.category, category)
      )
    )
    .orderBy(desc(savingsEnvelopes.createdAt))
    .limit(1);
}

export function insertEnvelope(
  db: Db,
  values: typeof savingsEnvelopes.$inferInsert
) {
  return db
    .insert(savingsEnvelopes)
    .values(values)
    .returning({ id: savingsEnvelopes.id });
}

export function updateEnvelopeBalance(
  db: Db,
  envelopeId: number,
  userId: number,
  amountCents: number
) {
  return db
    .update(savingsEnvelopes)
    .set({
      balanceCents: sql`${savingsEnvelopes.balanceCents} + ${amountCents}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(savingsEnvelopes.id, envelopeId),
        eq(savingsEnvelopes.userId, userId)
      )
    );
}

export function listEnvelopes(db: Db, userId: number) {
  return db
    .select()
    .from(savingsEnvelopes)
    .where(eq(savingsEnvelopes.userId, userId))
    .orderBy(desc(savingsEnvelopes.createdAt));
}

export function insertEnvelopeTransaction(
  db: Db,
  values: typeof envelopeTransactions.$inferInsert
) {
  return db.insert(envelopeTransactions).values(values);
}

export function getEnvelopeTransactionByIdempotencyKey(
  db: Db,
  userId: number,
  idempotencyKey: string
) {
  return db
    .select()
    .from(envelopeTransactions)
    .where(
      and(
        eq(envelopeTransactions.userId, userId),
        eq(envelopeTransactions.idempotencyKey, idempotencyKey)
      )
    )
    .limit(1);
}

export function listEnvelopeTransactions(
  db: Db,
  envelopeId: number,
  userId: number
) {
  return db
    .select()
    .from(envelopeTransactions)
    .where(
      and(
        eq(envelopeTransactions.envelopeId, envelopeId),
        eq(envelopeTransactions.userId, userId)
      )
    )
    .orderBy(desc(envelopeTransactions.createdAt));
}
