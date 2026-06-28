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
    .select({ miles: mileageLogs.miles })
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
