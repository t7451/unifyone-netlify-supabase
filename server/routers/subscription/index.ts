import { z } from "zod";
import {
  protectedIpRateLimitedProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../../_core/trpc";
import { subscriptionChangePlanLimiter } from "../../_core/rateLimiter";
import * as service from "./subscription.service";

export const subscriptionRouter = router({
  /**
   * Public: list all active plans (for landing page pricing section)
   */
  getPlans: publicProcedure.query(async () => {
    return service.getPlans();
  }),

  /**
   * Returns the current tenant's subscription status, plan details,
   * and usage metrics in a single call for the dashboard widget.
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return service.getStatus(ctx.user);
  }),

  /**
   * Create a checkout session for a subscription plan.
   * Stripe remains primary for recurring subscriptions. If Stripe is unavailable
   * or blocked, fall back to Square/PayPal one-time first-period collection and
   * finally manual invoice intake so checkout never dead-ends.
   */
  createCheckout: protectedProcedure
    .input(
      z.object({
        planSlug: z.string().optional(),
        priceId: z.string().optional(),
        billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
        origin: z.string(),
        preferredProvider: z
          .enum(["stripe", "square", "paypal", "shopify", "manual"])
          .optional(),
        allowFallback: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.createCheckout(ctx.user, ctx.req, input);
    }),

  /**
   * Create a Stripe Customer Portal session for managing subscriptions.
   */
  /**
   * Switch the current user's tenant to a different plan in-place via Stripe
   * subscriptions.update with proration. The user provides a target plan
   * slug + billing cycle; we look up the matching Stripe price id and patch
   * the active Stripe Subscription's price.
   *
   * Safe-by-default:
   *  - No active subscription -> BAD_REQUEST (use createCheckout instead)
   *  - Plan not found -> NOT_FOUND
   *  - Plan has no Stripe price for the chosen cycle -> BAD_REQUEST
   *  - Same plan/cycle as current -> NO_OP success
   */
  changePlan: protectedIpRateLimitedProcedure(
    subscriptionChangePlanLimiter,
    "subscription:change-plan"
  )
    .input(
      z.object({
        planSlug: z.string().min(1).max(50),
        billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.changePlan(ctx.user, input);
    }),

  createPortalSession: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return service.createPortalSession(ctx.user, ctx.req, input);
    }),

  /**
   * Get credit balance from Supabase credit_balances table.
   *
   * Security: `ctx.user.id` is sourced exclusively from the verified JWT session
   * (set by `protectedProcedure`). It is never taken from user input, so querying
   * Supabase with it is safe — the caller can only retrieve their own balance.
   */
  getCreditBalance: protectedProcedure.query(async ({ ctx }) => {
    return service.getCreditBalance(ctx.user);
  }),

  /**
   * Get subscription tier info from Supabase.
   *
   * Security: same as getCreditBalance — `ctx.user.id` is from the verified session.
   */
  getSubscriptionTier: protectedProcedure.query(async ({ ctx }) => {
    return service.getSubscriptionTier(ctx.user);
  }),

  /**
   * List available subscription tiers for the pricing page.
   */
  getSubscriptionTiers: publicProcedure.query(async () => {
    return service.getSubscriptionTiers();
  }),

  /**
   * Credit usage history — paginated, with source filter.
   * Reads from Supabase credit_usage_events (the full payment-flow log).
   *
   * Security: same as getCreditBalance — `ctx.user.id` is from the verified session.
   * The `userId` is never taken from request input.
   */
  getCreditUsage: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        source: z.string().optional(),
        onlyOverages: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return service.getCreditUsage(ctx.user, input);
    }),

  /**
   * Aggregated credit usage summary by source, over a period.
   * Uses the credit_usage_summary RPC.
   */
  getCreditUsageSummary: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      return service.getCreditUsageSummary(ctx.user, input);
    }),

  /**
   * Pending overage queue for the current user — shows which charges
   * are waiting to be reported to Stripe as invoice items.
   */
  getPendingOverages: protectedProcedure.query(async ({ ctx }) => {
    return service.getPendingOverages(ctx.user);
  }),

  /**
   * Returns invoice history from Stripe for the current tenant.
   * Falls back gracefully if no Stripe customer is configured.
   */
  getInvoices: protectedProcedure.query(async ({ ctx }) => {
    return service.getInvoices(ctx.user);
  }),
});
