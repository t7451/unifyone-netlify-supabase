import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { referrals, creditTransactions, users } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

// Credit award amounts (100 credits = $1 off next invoice)
const CREDIT_AWARDS = {
  referral_click: 0,       // no credits for clicks alone
  referral_signup: 500,    // 500 credits when referred user signs up
  referral_conversion: 2000, // 2000 credits when referred user pays
  social_share_twitter: 50,
  social_share_instagram: 60,
  social_share_linkedin: 75,
  social_share_facebook: 50,
  social_share_tiktok: 60,
};

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

async function awardCredits(
  db: Awaited<ReturnType<typeof requireDb>>,
  userId: number,
  amount: number,
  source: typeof creditTransactions.$inferInsert["source"],
  description: string,
  referralId?: number,
  socialPostId?: number,
) {
  if (amount <= 0) return;

  // Get current balance
  const [user] = await db.select({ creditBalance: users.creditBalance }).from(users).where(eq(users.id, userId));
  const currentBalance = user?.creditBalance ?? 0;
  const newBalance = currentBalance + amount;

  // Update user balance
  await db.update(users).set({ creditBalance: newBalance }).where(eq(users.id, userId));

  // Record transaction
  await db.insert(creditTransactions).values({
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

export const referralRouter = router({
  // ── Generate / Get Referral Code ────────────────────────────────────────────
  getMyCode: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();

      // Check if user already has a referral code
      const [user] = await db.select({
        referralCode: users.referralCode,
        creditBalance: users.creditBalance,
      }).from(users).where(eq(users.id, ctx.user.id));

      if (user?.referralCode) {
        return { referralCode: user.referralCode, creditBalance: user.creditBalance ?? 0 };
      }

      // Generate a new unique code
      const code = crypto.randomBytes(6).toString("hex").toUpperCase();
      await db.update(users).set({ referralCode: code }).where(eq(users.id, ctx.user.id));

      return { referralCode: code, creditBalance: 0 };
    }),

  // ── Track Referral Click (public — called when someone visits via referral link) ──
  trackClick: publicProcedure
    .input(z.object({
      referralCode: z.string().min(1).max(32),
      platform: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Find the referrer
      const [referrer] = await db.select({ id: users.id }).from(users)
        .where(eq(users.referralCode, input.referralCode));

      if (!referrer) return { success: false };

      // Create or update referral record
      await db.insert(referrals).values({
        referrerId: referrer.id,
        referralCode: input.referralCode,
        platform: input.platform,
        utmSource: input.platform ?? "direct",
        status: "clicked",
        clickCount: 1,
      });

      return { success: true };
    }),

  // ── Record Signup via Referral ──────────────────────────────────────────────
  recordSignup: protectedProcedure
    .input(z.object({ referralCode: z.string().min(1).max(32) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const [referrer] = await db.select({ id: users.id }).from(users)
        .where(eq(users.referralCode, input.referralCode));

      if (!referrer || referrer.id === ctx.user.id) return { success: false };

      // Update referral status
      const existing = await db.select().from(referrals)
        .where(and(eq(referrals.referralCode, input.referralCode), eq(referrals.referrerId, referrer.id)));

      if (existing.length > 0) {
        await db.update(referrals)
          .set({ status: "signed_up", referredUserId: ctx.user.id, referredEmail: ctx.user.email ?? undefined })
          .where(eq(referrals.id, existing[0].id));

        // Award signup credits to referrer
        await awardCredits(
          db, referrer.id, CREDIT_AWARDS.referral_signup,
          "referral_signup",
          `${ctx.user.name ?? "A new user"} signed up using your referral link`,
          existing[0].id,
        );
      }

      return { success: true };
    }),

  // ── Award Social Share Credits ──────────────────────────────────────────────
  awardSocialShare: protectedProcedure
    .input(z.object({
      platform: z.enum(["twitter", "instagram", "linkedin", "facebook", "tiktok"]),
      postId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const key = `social_share_${input.platform}` as keyof typeof CREDIT_AWARDS;
      const amount = CREDIT_AWARDS[key] ?? 50;

      await awardCredits(
        db, ctx.user.id, amount,
        "social_share",
        `Shared on ${input.platform} — ${amount} credits earned`,
        undefined,
        input.postId,
      );

      return { creditsAwarded: amount };
    }),

  // ── Get Credit Balance ──────────────────────────────────────────────────────
  getBalance: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const [user] = await db.select({ creditBalance: users.creditBalance }).from(users)
        .where(eq(users.id, ctx.user.id));
      return { creditBalance: user?.creditBalance ?? 0 };
    }),

  // ── Get Credit Transaction History ─────────────────────────────────────────
  getTransactions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      return db.select().from(creditTransactions)
        .where(eq(creditTransactions.userId, ctx.user.id))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(input.limit);
    }),

  // ── Get Referral Stats ──────────────────────────────────────────────────────
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();

      const myReferrals = await db.select().from(referrals)
        .where(eq(referrals.referrerId, ctx.user.id))
        .orderBy(desc(referrals.createdAt));

      const totalClicks = myReferrals.reduce((sum, r) => sum + (r.clickCount ?? 0), 0);
      const signups = myReferrals.filter(r => r.status === "signed_up" || r.status === "converted").length;
      const conversions = myReferrals.filter(r => r.status === "converted").length;
      const totalCreditsEarned = myReferrals.reduce((sum, r) => sum + (r.creditsAwarded ?? 0), 0);

      const [user] = await db.select({ creditBalance: users.creditBalance, referralCode: users.referralCode })
        .from(users).where(eq(users.id, ctx.user.id));

      return {
        referralCode: user?.referralCode ?? null,
        creditBalance: user?.creditBalance ?? 0,
        totalClicks,
        signups,
        conversions,
        totalCreditsEarned,
        referrals: myReferrals.slice(0, 20),
      };
    }),

  // ── Redeem Credits Against Subscription ────────────────────────────────────
  redeemCredits: protectedProcedure
    .input(z.object({ amount: z.number().min(100).max(10000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [user] = await db.select({ creditBalance: users.creditBalance }).from(users)
        .where(eq(users.id, ctx.user.id));

      const balance = user?.creditBalance ?? 0;
      if (balance < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Insufficient credits. You have ${balance}, need ${input.amount}.` });
      }

      const newBalance = balance - input.amount;
      const dollarValue = (input.amount / 100).toFixed(2);

      await db.update(users).set({ creditBalance: newBalance }).where(eq(users.id, ctx.user.id));
      await db.insert(creditTransactions).values({
        userId: ctx.user.id,
        amount: -input.amount,
        type: "redeemed",
        source: "subscription_redemption",
        description: `Redeemed ${input.amount} credits ($${dollarValue} off next invoice)`,
        balanceAfter: newBalance,
      });

      return { success: true, creditsRedeemed: input.amount, dollarValue, newBalance };
    }),
});
