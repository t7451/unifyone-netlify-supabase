import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { creditTransactions } from "../../../drizzle/schema";
import * as repo from "./referral.repo";

// Credit award amounts (100 credits = $1 off next invoice)
const CREDIT_AWARDS = {
  referral_click: 0, // no credits for clicks alone
  referral_signup: 500, // 500 credits when referred user signs up
  referral_conversion: 2000, // 2000 credits when referred user pays
  social_share_twitter: 50,
  social_share_instagram: 60,
  social_share_linkedin: 75,
  social_share_facebook: 50,
  social_share_tiktok: 60,
};

async function awardCredits(
  db: repo.Db,
  userId: number,
  amount: number,
  source: (typeof creditTransactions.$inferInsert)["source"],
  description: string,
  referralId?: number,
  socialPostId?: number
) {
  if (amount <= 0) return;

  // Get current balance
  const currentBalance = await repo.getUserCreditBalance(db, userId);
  const newBalance = currentBalance + amount;

  // Update user balance
  await repo.setUserCreditBalance(db, userId, newBalance);

  // Record transaction
  await repo.insertCreditTransaction(db, {
    userId,
    amount,
    type: "earned",
    source,
    description,
    balanceAfter: newBalance,
    referralId,
    socialPostId,
  });
}

export async function getMyCode(userId: number) {
  const db = await repo.requireDb();

  // Check if user already has a referral code
  const user = await repo.getUserReferralInfo(db, userId);

  if (user?.referralCode) {
    return {
      referralCode: user.referralCode,
      creditBalance: user.creditBalance ?? 0,
    };
  }

  // Generate a new unique code
  const code = crypto.randomBytes(6).toString("hex").toUpperCase();
  await repo.setReferralCode(db, userId, code);

  return { referralCode: code, creditBalance: 0 };
}

export async function trackClick(input: {
  referralCode: string;
  platform?: string;
}) {
  const db = await repo.requireDb();

  // Find the referrer
  const referrer = await repo.findUserByReferralCode(db, input.referralCode);

  if (!referrer) return { success: false };

  // Create or update referral record
  await repo.insertReferral(db, {
    referrerId: referrer.id,
    referralCode: input.referralCode,
    platform: input.platform,
    utmSource: input.platform ?? "direct",
    status: "clicked",
    clickCount: 1,
  });

  return { success: true };
}

export async function recordSignup(
  user: { id: number; email?: string | null; name?: string | null },
  input: { referralCode: string }
) {
  const db = await repo.requireDb();

  const referrer = await repo.findUserByReferralCode(db, input.referralCode);

  if (!referrer || referrer.id === user.id) return { success: false };

  // Update referral status
  const existing = await repo.findReferralByCodeAndReferrer(
    db,
    input.referralCode,
    referrer.id
  );

  if (existing.length > 0) {
    await repo.updateReferralOnSignup(db, existing[0].id, {
      status: "signed_up",
      referredUserId: user.id,
      referredEmail: user.email ?? undefined,
    });

    // Award signup credits to referrer
    await awardCredits(
      db,
      referrer.id,
      CREDIT_AWARDS.referral_signup,
      "referral_signup",
      `${user.name ?? "A new user"} signed up using your referral link`,
      existing[0].id
    );
  }

  return { success: true };
}

export async function awardSocialShare(
  userId: number,
  input: {
    platform: "twitter" | "instagram" | "linkedin" | "facebook" | "tiktok";
    postId?: number;
  }
) {
  const db = await repo.requireDb();
  const key = `social_share_${input.platform}` as keyof typeof CREDIT_AWARDS;
  const amount = CREDIT_AWARDS[key] ?? 50;

  await awardCredits(
    db,
    userId,
    amount,
    "social_share",
    `Shared on ${input.platform} — ${amount} credits earned`,
    undefined,
    input.postId
  );

  return { creditsAwarded: amount };
}

export async function getBalance(userId: number) {
  const db = await repo.requireDb();
  const creditBalance = await repo.getUserBalance(db, userId);
  return { creditBalance };
}

export async function getTransactions(userId: number, limit: number) {
  const db = await repo.requireDb();
  return repo.listTransactions(db, userId, limit);
}

export async function getStats(userId: number) {
  const db = await repo.requireDb();

  const myReferrals = await repo.listReferralsByReferrer(db, userId);

  const totalClicks = myReferrals.reduce(
    (sum, r) => sum + (r.clickCount ?? 0),
    0
  );
  const signups = myReferrals.filter(
    r => r.status === "signed_up" || r.status === "converted"
  ).length;
  const conversions = myReferrals.filter(r => r.status === "converted").length;
  const totalCreditsEarned = myReferrals.reduce(
    (sum, r) => sum + (r.creditsAwarded ?? 0),
    0
  );

  const user = await repo.getUserBalanceAndCode(db, userId);

  return {
    referralCode: user?.referralCode ?? null,
    creditBalance: user?.creditBalance ?? 0,
    totalClicks,
    signups,
    conversions,
    totalCreditsEarned,
    referrals: myReferrals.slice(0, 20),
  };
}

export async function redeemCredits(userId: number, amount: number) {
  const db = await repo.requireDb();
  const balance = await repo.getUserBalance(db, userId);

  if (balance < amount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Insufficient credits. You have ${balance}, need ${amount}.`,
    });
  }

  const newBalance = balance - amount;
  const dollarValue = (amount / 100).toFixed(2);

  await repo.setUserCreditBalance(db, userId, newBalance);
  await repo.insertCreditTransaction(db, {
    userId,
    amount: -amount,
    type: "redeemed",
    source: "subscription_redemption",
    description: `Redeemed ${amount} credits ($${dollarValue} off next invoice)`,
    balanceAfter: newBalance,
  });

  return {
    success: true,
    creditsRedeemed: amount,
    dollarValue,
    newBalance,
  };
}
