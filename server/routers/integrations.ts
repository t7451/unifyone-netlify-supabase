import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getTenantById, logWebhookEvent, updateTenant } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const requireTenant = (tenantId: number | null | undefined) => {
  if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant." });
  return tenantId;
};

export const integrationsRouter = router({
  // Stripe: create checkout session for subscription
  stripeCreateCheckout: protectedProcedure.input(z.object({
    planSlug: z.string(),
    billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const tenant = await getTenantById(tenantId);
    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

    // In production, use Stripe SDK here. For now, return a mock URL.
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const session = await stripe.checkout.sessions.create({...});
    return {
      url: `https://checkout.stripe.com/pay/mock_${input.planSlug}_${input.billingCycle}`,
      sessionId: `cs_mock_${Date.now()}`,
    };
  }),

  // Stripe: get customer portal URL
  stripePortal: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const tenant = await getTenantById(tenantId);
    if (!tenant?.stripeCustomerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No Stripe subscription found." });
    }
    return { url: `https://billing.stripe.com/p/login/mock_${tenant.stripeCustomerId}` };
  }),

  // Shopify: connect store
  shopifyConnect: protectedProcedure.input(z.object({
    shopDomain: z.string().min(3),
    accessToken: z.string().min(10),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    await updateTenant(tenantId, {
      shopifyShopDomain: input.shopDomain,
      shopifyAccessToken: input.accessToken,
      shopifySyncEnabled: true,
    });
    await logWebhookEvent("shopify", "store.connected", { shopDomain: input.shopDomain }, tenantId);
    return { success: true, message: "Shopify store connected successfully." };
  }),

  // Shopify: disconnect store
  shopifyDisconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    await updateTenant(tenantId, {
      shopifyShopDomain: undefined,
      shopifyAccessToken: undefined,
      shopifySyncEnabled: false,
    });
    return { success: true };
  }),

  // Shopify: trigger product sync
  shopifySync: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const tenant = await getTenantById(tenantId);
    if (!tenant?.shopifyShopDomain || !tenant?.shopifyAccessToken) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Shopify not connected." });
    }
    // In production: call Shopify Admin API to fetch products and sync
    await logWebhookEvent("shopify", "products.sync.requested", { shopDomain: tenant.shopifyShopDomain }, tenantId);
    return { success: true, message: "Product sync initiated. Products will appear shortly." };
  }),

  // Shopify: update direct checkout URL
  shopifySetCheckoutUrl: protectedProcedure.input(z.object({
    checkoutUrl: z.string().url().or(z.literal("")),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    await updateTenant(tenantId, { shopifyCheckoutUrl: input.checkoutUrl || undefined });
    return { success: true };
  }),

  // n8n: update webhook URL
  n8nUpdate: protectedProcedure.input(z.object({
    webhookUrl: z.string().url(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    await updateTenant(tenantId, { n8nWebhookUrl: input.webhookUrl });
    return { success: true };
  }),

  // n8n: trigger a workflow
  n8nTrigger: protectedProcedure.input(z.object({
    event: z.string(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const tenant = await getTenantById(tenantId);
    if (!tenant?.n8nWebhookUrl) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "n8n webhook URL not configured." });
    }

    try {
      const response = await fetch(tenant.n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: input.event, tenantId, payload: input.payload }),
      });
      await logWebhookEvent("n8n", input.event, input.payload ?? {}, tenantId);
      return { success: response.ok, status: response.status };
    } catch (err) {
      await logWebhookEvent("n8n", input.event, { error: String(err) }, tenantId);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to trigger n8n workflow." });
    }
  }),

  // Get integration status for the current tenant
  status: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const tenant = await getTenantById(tenantId);
    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      stripe: {
        connected: !!tenant.stripeCustomerId,
        subscriptionStatus: tenant.subscriptionStatus,
        currentPeriodEnd: tenant.subscriptionCurrentPeriodEnd,
      },
      shopify: {
        connected: !!tenant.shopifyShopDomain && tenant.shopifySyncEnabled,
        shopDomain: tenant.shopifyShopDomain,
      },
      n8n: {
        configured: !!tenant.n8nWebhookUrl,
        webhookUrl: tenant.n8nWebhookUrl,
      },
      paypal: {
        configured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
      },
      shopifyCheckoutUrl: tenant.shopifyCheckoutUrl || null,
    };
  }),
});
