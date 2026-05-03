import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getTenantById, logWebhookEvent, updateTenant } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

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
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No Stripe subscription found.",
      });
    }
    return {
      url: `https://billing.stripe.com/p/login/mock_${tenant.stripeCustomerId}`,
    };
  }),

  // Shopify: connect store — validates the access token by hitting the Admin
  // API for shop.json BEFORE persisting, so a bogus token can't be saved.
  // Also upserts the canonical record into shopify_stores so the rest of the
  // app (shopifyStores.* router, sync monitor) sees the connection.
  shopifyConnect: protectedProcedure
    .input(
      z.object({
        shopDomain: z.string().min(3),
        accessToken: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const shop = input.shopDomain.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Shopify shop domain.",
        });
      }
      // Validate token live
      let shopMeta: {
        name?: string;
        email?: string;
        currency?: string;
        plan_name?: string;
      } | null = null;
      try {
        const r = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
          headers: { "X-Shopify-Access-Token": input.accessToken },
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Shopify rejected the access token (HTTP ${r.status}).`,
          });
        }
        const j = (await r.json()) as { shop: typeof shopMeta };
        shopMeta = j.shop ?? null;
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not reach Shopify Admin API: ${String(err)}`,
        });
      }

      // Persist on the tenant record (legacy fields) AND upsert into shopify_stores
      await updateTenant(tenantId, {
        shopifyShopDomain: shop,
        shopifyAccessToken: input.accessToken,
        shopifySyncEnabled: true,
      });

      try {
        const { getDb } = await import("../db");
        const { shopifyStores } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (db) {
          const existing = await db
            .select({ id: shopifyStores.id })
            .from(shopifyStores)
            .where(eq(shopifyStores.shopDomain, shop))
            .limit(1);
          if (existing.length) {
            await db
              .update(shopifyStores)
              .set({
                userId: ctx.user.id,
                tenantId,
                accessToken: input.accessToken,
                shopName: shopMeta?.name,
                shopEmail: shopMeta?.email,
                shopCurrency: shopMeta?.currency ?? "USD",
                shopPlan: shopMeta?.plan_name,
                status: "active",
              })
              .where(eq(shopifyStores.id, existing[0].id));
          } else {
            await db.insert(shopifyStores).values({
              userId: ctx.user.id,
              tenantId,
              shopDomain: shop,
              accessToken: input.accessToken,
              shopName: shopMeta?.name,
              shopEmail: shopMeta?.email,
              shopCurrency: shopMeta?.currency ?? "USD",
              shopPlan: shopMeta?.plan_name,
              status: "active",
            });
          }
        }
      } catch (err) {
        console.error("[shopifyConnect] failed to upsert shopify_stores", err);
      }

      await logWebhookEvent(
        "shopify",
        "store.connected",
        { shopDomain: shop, validated: true },
        tenantId
      );
      return {
        success: true,
        message: "Shopify store connected successfully.",
        shopName: shopMeta?.name,
      };
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
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Shopify not connected.",
      });
    }
    // In production: call Shopify Admin API to fetch products and sync
    await logWebhookEvent(
      "shopify",
      "products.sync.requested",
      { shopDomain: tenant.shopifyShopDomain },
      tenantId
    );
    return {
      success: true,
      message: "Product sync initiated. Products will appear shortly.",
    };
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
      await updateTenant(tenantId, {
        shopifyCheckoutUrl: input.checkoutUrl || undefined,
      });
      return { success: true };
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
      await updateTenant(tenantId, { n8nWebhookUrl: input.webhookUrl });
      return { success: true };
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
      const tenant = await getTenantById(tenantId);
      if (!tenant?.n8nWebhookUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "n8n webhook URL not configured.",
        });
      }

      try {
        const response = await fetch(tenant.n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: input.event,
            tenantId,
            payload: input.payload,
          }),
        });
        await logWebhookEvent(
          "n8n",
          input.event,
          input.payload ?? {},
          tenantId
        );
        return { success: response.ok, status: response.status };
      } catch (err) {
        await logWebhookEvent(
          "n8n",
          input.event,
          { error: String(err) },
          tenantId
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to trigger n8n workflow.",
        });
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
        configured: !!(
          process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
        ),
        webhookConfigured: !!process.env.PAYPAL_WEBHOOK_ID,
      },
      square: {
        configured: !!(
          process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID
        ),
        webhookConfigured: !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
        environment: process.env.SQUARE_ENVIRONMENT || "production",
      },
      shopifyCheckoutUrl: tenant.shopifyCheckoutUrl || null,
    };
  }),
});
