import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { referrals, creditTransactions, users } from "../../../drizzle/schema";

type CreditTxInsert = typeof creditTransactions.$inferInsert;
type ReferralInsert = typeof referrals.$inferInsert;

export async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

export type Db = Awaited<ReturnType<typeof requireDb>>;

export async function getUserCreditBalance(db: Db, userId: number) {
  const [user] = await db
    .select({ creditBalance: users.creditBalance })
    .from(users)
    .where(eq(users.id, userId));
  return user?.creditBalance ?? 0;
}

export async function setUserCreditBalance(
  db: Db,
  userId: number,
  newBalance: number
) {
  await db
    .update(users)
    .set({ creditBalance: newBalance })
    .where(eq(users.id, userId));
}

export async function insertCreditTransaction(db: Db, values: CreditTxInsert) {
  await db.insert(creditTransactions).values(values);
}

export async function getUserReferralInfo(db: Db, userId: number) {
  const [user] = await db
    .select({
      referralCode: users.referralCode,
      creditBalance: users.creditBalance,
    })
    .from(users)
    .where(eq(users.id, userId));
  return user;
}

export async function setReferralCode(db: Db, userId: number, code: string) {
  await db
    .update(users)
    .set({ referralCode: code })
    .where(eq(users.id, userId));
}

export async function findUserByReferralCode(db: Db, referralCode: string) {
  const [referrer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.referralCode, referralCode));
  return referrer;
}

export async function insertReferral(db: Db, values: ReferralInsert) {
  await db.insert(referrals).values(values);
}

export async function findReferralByCodeAndReferrer(
  db: Db,
  referralCode: string,
  referrerId: number
) {
  return db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referralCode, referralCode),
        eq(referrals.referrerId, referrerId)
      )
    );
}

export async function updateReferralOnSignup(
  db: Db,
  referralId: number,
  data: {
    status: "signed_up";
    referredUserId: number;
    referredEmail?: string;
  }
) {
  await db.update(referrals).set(data).where(eq(referrals.id, referralId));
}

export async function getUserBalance(db: Db, userId: number) {
  const [user] = await db
    .select({ creditBalance: users.creditBalance })
    .from(users)
    .where(eq(users.id, userId));
  return user?.creditBalance ?? 0;
}

export async function listTransactions(db: Db, userId: number, limit: number) {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

export async function listReferralsByReferrer(db: Db, referrerId: number) {
  return db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, referrerId))
    .orderBy(desc(referrals.createdAt));
}

export async function getUserBalanceAndCode(db: Db, userId: number) {
  const [user] = await db
    .select({
      creditBalance: users.creditBalance,
      referralCode: users.referralCode,
    })
    .from(users)
    .where(eq(users.id, userId));
  return user;
}
