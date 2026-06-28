import { eq, and, desc, sql, gte } from "drizzle-orm";
import { getDb } from "../../db";
import {
  rewardOpportunities,
  rewardClaims,
  creditTransactions,
  users,
} from "../../../drizzle/schema";

/**
 * Data-access layer for the rewards router. Wraps the shared `getDb()` Drizzle
 * client; queries are relocated verbatim from the original router so behavior
 * and SQL are identical.
 */

/** Whether the shared Drizzle client is available (mirrors `if (!db)` guards). */
export async function isDbAvailable(): Promise<boolean> {
  return (await getDb()) != null;
}

export async function getUserCreditBalance(
  userId: number
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const [user] = await db
    .select({ creditBalance: users.creditBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.creditBalance ?? null;
}

export async function listActiveOpportunities() {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(rewardOpportunities)
    .where(eq(rewardOpportunities.active, true))
    .orderBy(desc(rewardOpportunities.credits));
}

export async function getCompletedClaimCountsByOpportunity(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      opportunityId: rewardClaims.opportunityId,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(rewardClaims)
    .where(
      and(eq(rewardClaims.userId, userId), eq(rewardClaims.status, "completed"))
    )
    .groupBy(rewardClaims.opportunityId);
}

export async function getOpportunityById(opportunityId: number) {
  const db = await getDb();
  if (!db) return null;

  const [opp] = await db
    .select()
    .from(rewardOpportunities)
    .where(eq(rewardOpportunities.id, opportunityId))
    .limit(1);

  return opp ?? null;
}

export async function getCompletedClaimCountForUserOpportunity(
  userId: number,
  opportunityId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [userClaimRow] = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(rewardClaims)
    .where(
      and(
        eq(rewardClaims.userId, userId),
        eq(rewardClaims.opportunityId, opportunityId),
        eq(rewardClaims.status, "completed")
      )
    );

  return Number(userClaimRow?.count ?? 0);
}

export async function insertRewardClaim(values: {
  userId: number;
  opportunityId: number;
  credits: number;
  status: "completed";
  metaEventId: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(rewardClaims).values(values);
}

export async function incrementOpportunityClaimCount(opportunityId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(rewardOpportunities)
    .set({ claimCount: sql`${rewardOpportunities.claimCount} + 1` })
    .where(eq(rewardOpportunities.id, opportunityId));
}

export async function setUserCreditBalance(userId: number, newBalance: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({ creditBalance: newBalance })
    .where(eq(users.id, userId));
}

export async function insertCreditTransaction(values: {
  userId: number;
  amount: number;
  type: "earned";
  source: "bonus";
  description: string;
  balanceAfter: number;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(creditTransactions).values(values);
}

export async function getRewardClaimHistory(userId: number, limit: number) {
  const db = await getDb();
  if (!db) return null;

  return db
    .select({
      id: rewardClaims.id,
      credits: rewardClaims.credits,
      status: rewardClaims.status,
      claimedAt: rewardClaims.claimedAt,
      opportunityTitle: rewardOpportunities.title,
      opportunityCategory: rewardOpportunities.category,
    })
    .from(rewardClaims)
    .leftJoin(
      rewardOpportunities,
      eq(rewardClaims.opportunityId, rewardOpportunities.id)
    )
    .where(eq(rewardClaims.userId, userId))
    .orderBy(desc(rewardClaims.claimedAt))
    .limit(limit);
}

export async function getCreditTransactionHistory(
  userId: number,
  limit: number
) {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

export async function adminListAllOpportunities() {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(rewardOpportunities)
    .orderBy(desc(rewardOpportunities.createdAt));
}

export async function insertOpportunity(values: {
  title: string;
  description: string | undefined;
  credits: number;
  category:
    | "signup"
    | "referral"
    | "purchase"
    | "engagement"
    | "milestone"
    | "promotion";
  maxClaimsPerUser: number;
  totalMaxClaims: number | null;
  expiresAt: Date | null;
}) {
  const db = await getDb();
  if (!db) return false;

  await db.insert(rewardOpportunities).values(values);
  return true;
}

export async function setOpportunityActive(id: number, active: boolean) {
  const db = await getDb();
  if (!db) return false;

  await db
    .update(rewardOpportunities)
    .set({ active })
    .where(eq(rewardOpportunities.id, id));
  return true;
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;

  const [totalClaims] = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(rewardClaims)
    .where(eq(rewardClaims.status, "completed"));

  const [totalCreditsIssued] = await db
    .select({ total: sql<number>`COALESCE(SUM(credits), 0)`.as("total") })
    .from(rewardClaims)
    .where(eq(rewardClaims.status, "completed"));

  const [activeOpps] = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(rewardOpportunities)
    .where(eq(rewardOpportunities.active, true));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentClaims] = await db
    .select({ count: sql<number>`COUNT(*)`.as("count") })
    .from(rewardClaims)
    .where(
      and(
        eq(rewardClaims.status, "completed"),
        gte(rewardClaims.claimedAt, sevenDaysAgo)
      )
    );

  return { totalClaims, totalCreditsIssued, activeOpps, recentClaims };
}
