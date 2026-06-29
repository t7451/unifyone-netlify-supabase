/**
 * server/routers/gigWorker/index.ts
 *
 * tRPC router for gig worker billing. Transport layer only: procedures,
 * input schemas, and auth. Business logic and data access live in
 * gigWorker.service.ts / gigWorker.repo.ts.
 */

import { z } from "zod";
import {
  operatorProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../../_core/trpc";
import { gigWorkerService } from "./gigWorker.service";

export const gigWorkerRouter = router({
  /**
   * Public: list all active gig worker plans (for the pricing page).
   * Seeds default plans on first call if the table is empty.
   */
  getPlans: publicProcedure.query(async () => {
    return gigWorkerService.getPlans();
  }),

  /**
   * Operator-only: get the current user's gig worker subscription and AI usage.
   * Operator-gated (not just protected) because this auto-provisions a starter
   * entitlement on first load — commerce-primary tenants must not create gig
   * subscription rows just by reading gig data.
   */
  getSubscription: operatorProcedure.query(async ({ ctx }) => {
    return gigWorkerService.getSubscription(ctx.user.id);
  }),

  /**
   * Protected: check whether the current user has access to a specific gig feature.
   * Returns the feature gate status and which plan is required if not accessible.
   */
  checkFeatureAccess: protectedProcedure
    .input(z.object({ feature: z.string() }))
    .query(async ({ ctx, input }) => {
      return gigWorkerService.checkFeatureAccess(ctx.user.id, input.feature);
    }),

  /**
   * Operator-only: create a Stripe Checkout session for a gig worker plan.
   */
  createCheckout: operatorProcedure
    .input(
      z.object({
        planSlug: z.string(),
        billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
        origin: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return gigWorkerService.createCheckout(ctx, input);
    }),

  /**
   * Protected: get AI usage for the current billing period.
   */
  getAIUsage: protectedProcedure.query(async ({ ctx }) => {
    return gigWorkerService.getAIUsage(ctx.user.id);
  }),

  /**
   * Operator-only: record AI credit consumption for a gig worker action.
   * Called internally from gig-context AI calls.
   */
  recordAIUsage: operatorProcedure
    .input(
      z.object({
        tokens: z.number().int().min(0),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return gigWorkerService.recordAIUsage(ctx.user.id, input);
    }),

  /**
   * Operator-only: cancel (at period end) the current gig worker subscription.
   * Calls the Stripe SDK directly — no HTTP round-trip to an origin-derived URL.
   */
  cancelSubscription: operatorProcedure.mutation(async ({ ctx }) => {
    return gigWorkerService.cancelSubscription(ctx.user.id);
  }),
});
