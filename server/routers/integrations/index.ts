/**
 * server/routers/integrations/index.ts
 *
 * Transport layer for the integrations router: procedure definitions, zod
 * input schemas, and tenant gating. Business logic lives in
 * `integrations.service.ts`; data access in `integrations.repo.ts`.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import * as service from "./integrations.service";

const requireTenant = (tenantId: number | null | undefined) => {
  if (!tenantId)
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant." });
  return tenantId;
};

export const integrationsRouter = router({
  // Stripe: create checkout session for subscription
  stripeCreateCheckout: protectedProcedure
    .input(
      z.object({
        planSlug: z.string(),
        billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return service.stripeCreateCheckout(tenantId, input);
    }),

  // Stripe: get customer portal URL
  stripePortal: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return service.stripePortal(tenantId);
  }),

  // Shopify: connect store
  shopifyConnect: protectedProcedure
    .input(
      z.object({
        shopDomain: z.string().min(3),
        accessToken: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return service.shopifyConnect(tenantId, input);
    }),

  // Shopify: disconnect store
  shopifyDisconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return service.shopifyDisconnect(tenantId);
  }),

  // Shopify: trigger product sync
  shopifySync: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return service.shopifySync(tenantId);
  }),

  // Shopify: update direct checkout URL
  shopifySetCheckoutUrl: protectedProcedure
    .input(
      z.object({
        checkoutUrl: z.string().url().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return service.shopifySetCheckoutUrl(tenantId, input);
    }),

  // n8n: update webhook URL
  n8nUpdate: protectedProcedure
    .input(
      z.object({
        webhookUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return service.n8nUpdate(tenantId, input);
    }),

  // n8n: trigger a workflow
  n8nTrigger: protectedProcedure
    .input(
      z.object({
        event: z.string(),
        payload: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return service.n8nTrigger(tenantId, input);
    }),

  // Get integration status for the current tenant
  status: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return service.status(tenantId);
  }),
});
