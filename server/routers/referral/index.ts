import { z } from "zod";
import {
  protectedProcedure,
  publicRateLimitedProcedure,
  router,
} from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import * as service from "./referral.service";

export const referralRouter = router({
  // ── Generate / Get Referral Code ────────────────────────────────────────────
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    return service.getMyCode(ctx.user.id);
  }),

  // ── Track Referral Click (public — called when someone visits via referral link) ──
  trackClick: publicRateLimitedProcedure(publicFormLimiter, "referral:click")
    .input(
      z.object({
        referralCode: z.string().min(1).max(32),
        platform: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return service.trackClick(input);
    }),

  // ── Record Signup via Referral ──────────────────────────────────────────────
  recordSignup: protectedProcedure
    .input(z.object({ referralCode: z.string().min(1).max(32) }))
    .mutation(async ({ ctx, input }) => {
      return service.recordSignup(ctx.user, input);
    }),

  // ── Award Social Share Credits ──────────────────────────────────────────────
  awardSocialShare: protectedProcedure
    .input(
      z.object({
        platform: z.enum([
          "twitter",
          "instagram",
          "linkedin",
          "facebook",
          "tiktok",
        ]),
        postId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.awardSocialShare(ctx.user.id, input);
    }),

  // ── Get Credit Balance ──────────────────────────────────────────────────────
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    return service.getBalance(ctx.user.id);
  }),

  // ── Get Credit Transaction History ─────────────────────────────────────────
  getTransactions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return service.getTransactions(ctx.user.id, input.limit);
    }),

  // ── Get Referral Stats ──────────────────────────────────────────────────────
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return service.getStats(ctx.user.id);
  }),

  // ── Redeem Credits Against Subscription ────────────────────────────────────
  redeemCredits: protectedProcedure
    .input(z.object({ amount: z.number().min(100).max(10000) }))
    .mutation(async ({ ctx, input }) => {
      return service.redeemCredits(ctx.user.id, input.amount);
    }),
});
