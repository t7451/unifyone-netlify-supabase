import { z } from "zod";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  rewardOpportunities,
  rewardClaims,
  creditTransactions,
  users,
} from "../../drizzle/schema";

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const rewardsRouter = router({
  /** Get current user's Rewards Keys balance */
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { balance: 0 };

    const [user] = await db
      .select({ creditBalance: users.creditBalance })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return { balance: user?.creditBalance ?? 0 };
  }),

  /** List all active reward opportunities with user's claim count */
  listOpportunities: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const opportunities = await db
      .select()
      .from(rewardOpportunities)
      .where(eq(rewardOpportunities.active, true))
      .orderBy(desc(rewardOpportunities.credits));

    const userClaims = await db
      .select({
        opportunityId: rewardClaims.opportunityId,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(rewardClaims)
      .where(
        and(
          eq(rewardClaims.userId, ctx.user.id),
          eq(rewardClaims.status, "completed")
        )
      )
      .groupBy(rewardClaims.opportunityId);

    const claimMap = new Map(userClaims.map((c) => [c.opportunityId, Number(c.count)]));

    return opportunities.map((opp) => ({
      ...opp,
      userClaimCount: claimMap.get(opp.id) ?? 0,
      canClaim:
        (claimMap.get(opp.id) ?? 0) < opp.maxClaimsPerUser &&
        (opp.totalMaxClaims === null || opp.claimCount < opp.totalMaxClaims) &&
        (!opp.expiresAt || new Date(opp.expiresAt) > new Date()),
    }));
  }),

  /** Claim a reward opportunity */
  claimOpportunity: protectedProcedure
    .input(z.object({ opportunityId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [opp] = await db
        .select()
        .from(rewardOpportunities)
        .where(eq(rewardOpportunities.id, input.opportunityId))
        .limit(1);

      if (!opp || !opp.active) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Opportunity not found or inactive" });
      }

      if (opp.expiresAt && new Date(opp.expiresAt) <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This opportunity has expired" });
      }

      if (opp.totalMaxClaims !== null && opp.claimCount >= opp.totalMaxClaims) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This opportunity has reached its claim limit" });
      }

      const [userClaimRow] = await db
        .select({ count: sql<number>`COUNT(*)`.as("count") })
        .from(rewardClaims)
        .where(
          and(
            eq(rewardClaims.userId, ctx.user.id),
            eq(rewardClaims.opportunityId, input.opportunityId),
            eq(rewardClaims.status, "completed")
          )
        );

      if (Number(userClaimRow?.count ?? 0) >= opp.maxClaimsPerUser) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already claimed this reward" });
      }

      const metaEventId = generateEventId();

      await db.insert(rewardClaims).values({
        userId: ctx.user.id,
        opportunityId: input.opportunityId,
        credits: opp.credits,
        status: "completed",
        metaEventId,
      });

      await db
        .update(rewardOpportunities)
        .set({ claimCount: sql`${rewardOpportunities.claimCount} + 1` })
        .where(eq(rewardOpportunities.id, input.opportunityId));

      const [currentUser] = await db
        .select({ creditBalance: users.creditBalance })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const newBalance = (currentUser?.creditBalance ?? 0) + opp.credits;

      await db
        .update(users)
        .set({ creditBalance: newBalance })
        .where(eq(users.id, ctx.user.id));

      await db.insert(creditTransactions).values({
        userId: ctx.user.id,
        amount: opp.credits,
        type: "earned",
        source: "bonus",
        description: `Reward: ${opp.title}`,
        balanceAfter: newBalance,
      });

      return {
        success: true,
        credits: opp.credits,
        newBalance,
        metaEventId,
        opportunityTitle: opp.title,
      };
    }),

  /** Get user's reward claim history */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

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
        .where(eq(rewardClaims.userId, ctx.user.id))
        .orderBy(desc(rewardClaims.claimedAt))
        .limit(input.limit);
    }),

  /** Get credit transaction history */
  getCreditHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, ctx.user.id))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(input.limit);
    }),

  // ─── Admin ────────────────────────────────────────────────────────────────

  adminListOpportunities: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(rewardOpportunities)
      .orderBy(desc(rewardOpportunities.createdAt));
  }),

  adminCreateOpportunity: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        credits: z.number().min(1),
        category: z.enum(["signup", "referral", "purchase", "engagement", "milestone", "promotion"]).default("engagement"),
        maxClaimsPerUser: z.number().min(1).default(1),
        totalMaxClaims: z.number().optional(),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.insert(rewardOpportunities).values({
        title: input.title,
        description: input.description,
        credits: input.credits,
        category: input.category,
        maxClaimsPerUser: input.maxClaimsPerUser,
        totalMaxClaims: input.totalMaxClaims ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      });

      return { success: true };
    }),

  adminToggleOpportunity: protectedProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(rewardOpportunities)
        .set({ active: input.active })
        .where(eq(rewardOpportunities.id, input.id));

      return { success: true };
    }),

  adminGetStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return { totalClaims: 0, totalCreditsIssued: 0, activeOpportunities: 0, claimsLast7Days: 0 };

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

    return {
      totalClaims: Number(totalClaims?.count ?? 0),
      totalCreditsIssued: Number(totalCreditsIssued?.total ?? 0),
      activeOpportunities: Number(activeOpps?.count ?? 0),
      claimsLast7Days: Number(recentClaims?.count ?? 0),
    };
  }),
});
