import { z } from "zod";
import { adminProcedure, operatorProcedure, router } from "../../_core/trpc";
import * as service from "./rewards.service";

export const rewardsRouter = router({
  /** Get current user's Rewards Keys balance */
  getBalance: operatorProcedure.query(async ({ ctx }) => {
    return service.getBalance(ctx.user.id);
  }),

  /** List all active reward opportunities with user's claim count */
  listOpportunities: operatorProcedure.query(async ({ ctx }) => {
    return service.listOpportunities(ctx.user.id);
  }),

  /** Claim a reward opportunity */
  claimOpportunity: operatorProcedure
    .input(z.object({ opportunityId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.claimOpportunity(ctx.user, input.opportunityId);
    }),

  /** Get user's reward claim history */
  getHistory: operatorProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return service.getHistory(ctx.user.id, input.limit);
    }),

  /** Get credit transaction history */
  getCreditHistory: operatorProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      return service.getCreditHistory(ctx.user.id, input.limit);
    }),

  // ─── Admin ────────────────────────────────────────────────────────────────

  adminListOpportunities: adminProcedure.query(async ({ ctx: _ctx }) => {
    return service.adminListOpportunities();
  }),

  adminCreateOpportunity: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        credits: z.number().min(1),
        category: z
          .enum([
            "signup",
            "referral",
            "purchase",
            "engagement",
            "milestone",
            "promotion",
          ])
          .default("engagement"),
        maxClaimsPerUser: z.number().min(1).default(1),
        totalMaxClaims: z.number().optional(),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx: _ctx, input }) => {
      return service.adminCreateOpportunity(input);
    }),

  adminToggleOpportunity: adminProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ ctx: _ctx, input }) => {
      return service.adminToggleOpportunity(input.id, input.active);
    }),

  adminGetStats: adminProcedure.query(async ({ ctx: _ctx }) => {
    return service.adminGetStats();
  }),
});
