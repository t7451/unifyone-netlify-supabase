/**
 * server/routers/moneyManager/points.service.ts
 *
 * Points use-cases: awarding points (shared side effect used by shift,
 * mileage, and rule flows) plus the points balance / history reads.
 */

import type { Db } from "./moneyManager.repo";
import * as repo from "./moneyManager.repo";

// Points awarded per action
export const POINTS = {
  shift_completed: 25,
  mileage_logged: 10,
  rule_created: 15,
  rule_triggered: 5,
};

export async function awardPoints(
  db: Db | null,
  userId: number,
  action: string,
  points: number,
  description: string,
  referenceId?: string
) {
  if (!db) return;
  // Get or create user_points row
  const [existing] = await repo.getUserPointsRow(db, userId);

  const currentBalance = existing?.totalPoints ?? 0;
  const newBalance = currentBalance + points;
  const newLifetime = (existing?.lifetimePoints ?? 0) + points;
  const newLevel = Math.floor(1 + Math.sqrt(newLifetime / 50));

  if (existing) {
    await repo.updateUserPoints(db, userId, {
      totalPoints: newBalance,
      lifetimePoints: newLifetime,
      level: newLevel,
      lastActivityAt: new Date(),
    });
  } else {
    await repo.insertUserPoints(db, {
      userId,
      totalPoints: newBalance,
      lifetimePoints: newLifetime,
      level: newLevel,
      lastActivityAt: new Date(),
    });
  }

  await repo.insertPointsTransaction(db, {
    userId,
    points,
    action,
    description,
    referenceId,
    balanceAfter: newBalance,
  });

  return newBalance;
}

export const pointsService = {
  async getPointsBalance(userId: number) {
    const db = await repo.getDb();
    if (!db)
      return { totalPoints: 0, lifetimePoints: 0, level: 1, streakDays: 0 };
    const [pts] = await repo.getPointsBalanceRow(db, userId);
    return (
      pts ?? { totalPoints: 0, lifetimePoints: 0, level: 1, streakDays: 0 }
    );
  },

  async getPointsHistory(
    userId: number,
    input: { limit: number; offset: number }
  ) {
    const db = await repo.getDb();
    if (!db) return [];
    return repo.listPointsTransactions(db, userId, input.limit, input.offset);
  },
};
