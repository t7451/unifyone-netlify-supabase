/**
 * server/routers/integrations/integrations.service.ts
 *
 * Use-case logic for third-party integrations (Stripe checkout/portal,
 * Shopify connect/sync, n8n webhook dispatch, integration status). All
 * external side effects (HTTP calls, webhook logging) live here; the
 * transport layer (index.ts) only handles validation and shaping.
 *
 * Behavior is identical to the original integrations router — queries,
 * fetch calls, and webhook-log side-effect ordering are preserved exactly.
 */
import { TRPCError } from "@trpc/server";
import { integrationsRepo } from "./integrations.repo";

/** Stripe: create a checkout session for a subscription. */
export async function stripeCreateCheckout(
  tenantId: number,
  input: { planSlug: string; billingCycle: "monthly" | "yearly" }
) {
  const tenant = await integrationsRepo.getTenantById(tenantId);
  if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

  // In production, use Stripe SDK here. For now, return a mock URL.
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const session = await stripe.checkout.sessions.create({...});
  return {
    url: `https://checkout.stripe.com/pay/mock_${input.planSlug}_${input.billingCycle}`,
    sessionId: `cs_mock_${Date.now()}`,
  };
}

/** Stripe: get the customer portal URL. */
export async function stripePortal(tenantId: number) {
  const tenant = await integrationsRepo.getTenantById(tenantId);
  if (!tenant?.stripeCustomerId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No Stripe subscription found.",
    });
  }
  return {
    url: `https://billing.stripe.com/p/login/mock_${tenant.stripeCustomerId}`,
  };
}

/** Shopify: connect a store (validates the token live before persisting). */
export async function shopifyConnect(
  tenantId: number,
  input: { shopDomain: string; accessToken: string }
) {
  // PATCHED:H9 — validate the token live against Shopify Admin API
  // BEFORE persisting, so we catch typo'd / revoked / wrong-shop tokens
  // at connect time instead of silently failing every later sync.
  const cleanDomain = input.shopDomain.trim().replace(/^https?:\/\//, "");
  const verifyRes = await fetch(
    `https://${cleanDomain}/admin/api/2024-01/shop.json`,
    {
      headers: {
        "X-Shopify-Access-Token": input.accessToken,
        "Content-Type": "application/json",
      },
    }
  ).catch(err => {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Could not reach https://${cleanDomain}: ${
        err instanceof Error ? err.message : "network error"
      }`,
    });
  });
  if (!verifyRes.ok) {
    const body = await verifyRes.text().catch(() => "");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        verifyRes.status === 401
          ? "Shopify rejected the access token (401 Unauthorized). Confirm the token belongs to the correct store and hasn't been revoked."
          : verifyRes.status === 404
            ? `Shopify shop not found at https://${cleanDomain}. Check the domain.`
            : `Shopify rejected the credentials (HTTP ${verifyRes.status})${
                body ? ": " + body.slice(0, 200) : ""
              }.`,
    });
  }

  await integrationsRepo.updateTenant(tenantId, {
    shopifyShopDomain: cleanDomain,
    shopifyAccessToken: input.accessToken,
    shopifySyncEnabled: true,
  });
  await integrationsRepo.logWebhookEvent(
    "shopify",
    "store.connected",
    { shopDomain: cleanDomain },
    tenantId
  );
  return {
    success: true,
    message: `Connected to ${cleanDomain}.`,
  };
}

/** Shopify: disconnect a store. */
export async function shopifyDisconnect(tenantId: number) {
  await integrationsRepo.updateTenant(tenantId, {
    shopifyShopDomain: undefined,
    shopifyAccessToken: undefined,
    shopifySyncEnabled: false,
  });
  return { success: true };
}

/** Shopify: trigger a product sync. */
export async function shopifySync(tenantId: number) {
  const tenant = await integrationsRepo.getTenantById(tenantId);
  if (!tenant?.shopifyShopDomain || !tenant?.shopifyAccessToken) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Shopify not connected.",
    });
  }
  // In production: call Shopify Admin API to fetch products and sync
  await integrationsRepo.logWebhookEvent(
    "shopify",
    "products.sync.requested",
    { shopDomain: tenant.shopifyShopDomain },
    tenantId
  );
  return {
    success: true,
    message: "Product sync initiated. Products will appear shortly.",
  };
}

/** Shopify: update the direct checkout URL. */
export async function shopifySetCheckoutUrl(
  tenantId: number,
  input: { checkoutUrl: string }
) {
  await integrationsRepo.updateTenant(tenantId, {
    shopifyCheckoutUrl: input.checkoutUrl || undefined,
  });
  return { success: true };
}

/** n8n: update the webhook URL. */
export async function n8nUpdate(
  tenantId: number,
  input: { webhookUrl: string }
) {
  await integrationsRepo.updateTenant(tenantId, {
    n8nWebhookUrl: input.webhookUrl,
  });
  return { success: true };
}

/** n8n: trigger a workflow via the configured webhook. */
export async function n8nTrigger(
  tenantId: number,
  input: { event: string; payload?: Record<string, unknown> }
) {
  const tenant = await integrationsRepo.getTenantById(tenantId);
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
    await integrationsRepo.logWebhookEvent(
      "n8n",
      input.event,
      input.payload ?? {},
      tenantId
    );
    return { success: response.ok, status: response.status };
  } catch (err) {
    await integrationsRepo.logWebhookEvent(
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
}

/** Get integration status for the current tenant. */
export async function status(tenantId: number) {
  const tenant = await integrationsRepo.getTenantById(tenantId);
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
}
