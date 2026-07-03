import { TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getCookieHeader } from "../../lib/cookieHeader";
import { getStripe } from "../../_core/stripeClient";
import { logAudit } from "../../auditLogger";
import { logger } from "../../_core/logger";
import { createPayPalOrder } from "../../paypal";
import { createSquareCheckout } from "../../square";
import {
  buildManualPaymentUrl,
  getAvailablePaymentProviders,
  normalizeCheckoutOrigin,
  isPaymentProviderConfigured,
  type PaymentProvider,
} from "../../paymentFallback";
import { isMasterControlUser } from "../../lib/masterControl";
import type { User } from "../../../drizzle/schema";
import * as repo from "./subscription.repo";

type SubscriptionUser = User;

export { getPlans } from "./subscription.repo";

export async function getStatus(user: SubscriptionUser) {
  // The platform owner account never pays for its own tenant, so it should
  // not be shown trial countdowns or upgrade upsells.
  const isMaster = isMasterControlUser(user);
  const tenantId = user.tenantId;
  if (!tenantId) {
    return {
      status: "none" as const,
      plan: null,
      billingCycle: null,
      subscriptionCurrentPeriodEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialDaysLeft: null,
      usage: null,
      isMaster,
    };
  }

  const tenant = await repo.getTenantById(tenantId);
  if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

  let plan = null;
  if (tenant.planId) {
    const allPlans = await repo.getPlans();
    plan = allPlans.find(p => p.id === tenant.planId) ?? null;
  }

  let trialDaysLeft: number | null = null;
  if (tenant.status === "trial") {
    const trialEnd = new Date(
      tenant.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000
    );
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  let billingCycle: "monthly" | "yearly" | null = null;
  if (tenant.stripeSubscriptionId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          tenant.stripeSubscriptionId,
          {
            expand: ["items.data.price"],
          }
        );
        const interval = subscription.items.data[0]?.price?.recurring?.interval;
        if (interval === "month") billingCycle = "monthly";
        if (interval === "year") billingCycle = "yearly";
      } catch (error) {
        logger.warn("subscription.getStatus billing cycle lookup failed", {
          tenantId,
          stripeSubscriptionId: tenant.stripeSubscriptionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const [productCount, orderCount, customerCount] = await Promise.all([
    repo.getProductCount(tenantId),
    repo.getOrderCount(tenantId),
    repo.getCustomerCount(tenantId),
  ]);

  return {
    status: tenant.subscriptionStatus,
    tenantStatus: tenant.status,
    isMaster,
    plan,
    billingCycle,
    subscriptionCurrentPeriodEnd: tenant.subscriptionCurrentPeriodEnd,
    stripeCustomerId: tenant.stripeCustomerId,
    stripeSubscriptionId: tenant.stripeSubscriptionId,
    trialDaysLeft,
    usage: {
      products: Number(productCount),
      orders: Number(orderCount),
      customers: Number(customerCount),
      maxProducts: plan?.maxProducts ?? 100,
      maxOrders: plan?.maxOrders ?? 1000,
      maxUsers: plan?.maxUsers ?? 5,
    },
  };
}

export interface CreateCheckoutInput {
  planSlug?: string;
  priceId?: string;
  billingPeriod: "monthly" | "yearly";
  origin: string;
  preferredProvider?: "stripe" | "square" | "paypal" | "shopify" | "manual";
  allowFallback: boolean;
}

export async function createCheckout(
  user: SubscriptionUser,
  req: CreateExpressContextOptions["req"],
  input: CreateCheckoutInput
) {
  let resolvedPriceId = input.priceId;
  let fallbackAmount: number | undefined;
  let fallbackDescription: string | undefined;

  // Resolve plan pricing from slug for Stripe and non-Stripe fallbacks.
  if (input.planSlug) {
    const plan = await repo.getPlanBySlug(input.planSlug);
    if (!plan)
      throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
    if (!resolvedPriceId) {
      resolvedPriceId =
        input.billingPeriod === "yearly"
          ? (plan.stripePriceIdYearly ?? undefined)
          : (plan.stripePriceIdMonthly ?? undefined);
    }

    const priceVal =
      input.billingPeriod === "yearly"
        ? Number(plan.priceYearly)
        : Number(plan.priceMonthly);
    fallbackAmount = Math.round(priceVal * 100);
    fallbackDescription = `UnifyOne ${plan.name} Plan (${input.billingPeriod})`;
  }

  const tenantId = user.tenantId;
  let baseUrl: string;
  try {
    baseUrl = normalizeCheckoutOrigin(input.origin);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        error instanceof Error ? error.message : "Invalid checkout origin",
    });
  }
  const cookieHeader = getCookieHeader(req) ?? "";
  const providerOrder = input.allowFallback
    ? getAvailablePaymentProviders(
        input.preferredProvider as PaymentProvider | undefined
      )
    : input.preferredProvider
      ? isPaymentProviderConfigured(input.preferredProvider)
        ? [input.preferredProvider]
        : []
      : isPaymentProviderConfigured("stripe")
        ? ["stripe" as const]
        : [];
  const attempts: Array<{ provider: PaymentProvider; error: string }> = [];
  const amountCents = fallbackAmount;
  const description =
    fallbackDescription ||
    (input.planSlug
      ? `UnifyOne ${input.planSlug} Plan (${input.billingPeriod})`
      : "UnifyOne Subscription");

  if (!providerOrder.length) {
    return {
      url: buildManualPaymentUrl({
        origin: baseUrl,
        planSlug: input.planSlug,
        amountCents,
        description,
        billingPeriod: input.billingPeriod,
      }),
      provider: "manual" as const,
      fallbackUsed: true,
      attempts,
    };
  }

  for (const provider of providerOrder) {
    try {
      if (provider === "stripe") {
        const res = await fetch(`${baseUrl}/api/stripe/create-checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "UnifyOne-tRPC/1.0 (+server-side)",
            "X-Internal-Request": "trpc-subscription-createCheckout",
            Cookie: cookieHeader,
          },
          body: JSON.stringify({
            priceId: resolvedPriceId,
            tenantId,
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            origin: baseUrl,
            amount: fallbackAmount,
            description: fallbackDescription,
          }),
        });

        const contentType = res.headers.get("content-type") || "";
        const isHtml =
          contentType.includes("text/html") ||
          res.headers.get("cf-mitigated") === "challenge";

        if (isHtml) {
          const body = await res.text();
          const looksLikeCfChallenge =
            /Just a moment|cf-mitigated|cf_chl_opt|challenge-platform|cloudflare/i.test(
              body
            );
          if (looksLikeCfChallenge) {
            throw new Error("Stripe checkout blocked by Cloudflare challenge");
          }
        }

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
        };
        if (!data.url) throw new Error("Stripe did not return a checkout URL");
        return {
          url: data.url,
          provider,
          fallbackUsed: provider !== "stripe",
          attempts,
        };
      }

      if (provider === "square") {
        if (!amountCents || amountCents <= 0) {
          throw new Error("Square fallback requires a plan amount");
        }
        const result = await createSquareCheckout({
          amount: amountCents / 100,
          currency: "USD",
          description,
          tenantId,
          userId: user.id,
          redirectUrl: `${baseUrl}/billing/success?square=success&fallback=subscription`,
        });
        return {
          url: result.checkoutUrl,
          provider,
          fallbackUsed: true,
          attempts,
        };
      }

      if (provider === "paypal") {
        if (!amountCents || amountCents <= 0) {
          throw new Error("PayPal fallback requires a plan amount");
        }
        const result = await createPayPalOrder({
          amount: amountCents / 100,
          currency: "USD",
          description,
          tenantId,
          userId: user.id,
          userEmail: user.email,
          returnUrl: `${baseUrl}/billing/success?paypal_return=1&fallback=subscription`,
          cancelUrl: `${baseUrl}/checkout?paypal_cancel=1`,
        });
        return {
          url: result.approveUrl,
          provider,
          fallbackUsed: true,
          attempts,
        };
      }

      if (provider === "shopify") {
        return {
          url: process.env.SHOPIFY_CHECKOUT_URL || "",
          provider,
          fallbackUsed: true,
          attempts,
        };
      }

      return {
        url: buildManualPaymentUrl({
          origin: baseUrl,
          planSlug: input.planSlug,
          amountCents,
          description,
          billingPeriod: input.billingPeriod,
        }),
        provider,
        fallbackUsed: true,
        attempts,
      };
    } catch (err) {
      attempts.push({
        provider,
        error: err instanceof Error ? err.message : String(err),
      });
      logger.warn("payment provider checkout failed; trying fallback", {
        provider,
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    url: buildManualPaymentUrl({
      origin: baseUrl,
      planSlug: input.planSlug,
      amountCents,
      description,
      billingPeriod: input.billingPeriod,
    }),
    provider: "manual" as const,
    fallbackUsed: true,
    attempts,
  };
}

export async function changePlan(
  user: SubscriptionUser,
  input: { planSlug: string; billingCycle: "monthly" | "yearly" }
) {
  const { db, plan } = await repo.getPlanRowBySlug(input.planSlug);
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  if (!plan) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No plan with slug '${input.planSlug}'.`,
    });
  }
  const targetPriceId =
    input.billingCycle === "yearly"
      ? plan.stripePriceIdYearly
      : plan.stripePriceIdMonthly;
  if (!targetPriceId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Plan '${plan.name}' has no Stripe ${input.billingCycle} price configured.`,
    });
  }

  // Resolve current Stripe subscription via tenant.stripeCustomerId
  const tenantId = user.tenantId;
  if (!tenantId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "User has no tenant.",
    });
  }
  const tenant = await repo.getTenantById(tenantId);
  if (!tenant?.stripeCustomerId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "No Stripe customer linked to this tenant. Use createCheckout to start a subscription.",
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Stripe is not configured on this server.",
    });
  }

  // Find the active subscription for this customer.
  const subs = await stripe.subscriptions.list({
    customer: tenant.stripeCustomerId,
    status: "active",
    limit: 1,
  });
  const sub = subs.data[0];
  if (!sub) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active Stripe subscription. Start one via the pricing page.",
    });
  }

  const currentItem = sub.items.data[0];
  if (!currentItem) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Active subscription has no items.",
    });
  }
  if (currentItem.price.id === targetPriceId) {
    return {
      success: true,
      unchanged: true as const,
      message: "Already on that plan.",
    };
  }

  let updated;
  try {
    updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: currentItem.id, price: targetPriceId }],
      proration_behavior: "create_prorations",
      metadata: {
        unifyone_tenant_id: String(tenantId),
        unifyone_user_id: String(user.id),
        unifyone_plan_slug: plan.slug,
        unifyone_billing_cycle: input.billingCycle,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("stripe subscriptions.update failed", {
      subId: sub.id,
      targetPriceId,
      error: msg,
    });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Stripe rejected the plan change: ${msg}`,
    });
  }

  logAudit({
    userId: user.id,
    tenantId,
    action: "subscription.changePlan",
    resource: "subscription",
    resourceId: sub.id,
    severity: "high",
    metadata: {
      fromPriceId: currentItem.price.id,
      toPriceId: targetPriceId,
      planSlug: plan.slug,
      billingCycle: input.billingCycle,
    },
  }).catch(() => {});

  return {
    success: true,
    unchanged: false as const,
    subscriptionId: updated.id,
    currentPeriodEnd: (updated as unknown as { current_period_end: number })
      .current_period_end,
    planSlug: plan.slug,
    billingCycle: input.billingCycle,
  };
}

export async function createPortalSession(
  user: SubscriptionUser,
  req: CreateExpressContextOptions["req"],
  input: { origin: string }
) {
  const tenantId = user.tenantId;
  if (!tenantId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active tenant",
    });
  const tenant = await repo.getTenantById(tenantId);
  if (!tenant?.stripeCustomerId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No Stripe customer found. Please subscribe first.",
    });
  }
  const res = await fetch(`${input.origin}/api/stripe/customer-portal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: getCookieHeader(req) ?? "",
    },
    body: JSON.stringify({
      customerId: tenant.stripeCustomerId,
      origin: input.origin,
    }),
  });
  if (!res.ok)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Portal session failed",
    });
  const data = (await res.json()) as { url?: string };
  return { url: data.url ?? null };
}

// ── Supabase-backed credit / billing reads ───────────────────────────────────

export async function getCreditBalance(user: SubscriptionUser) {
  if (!repo.isSupabaseConfigured())
    return { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };

  // Guard: id must be a positive integer from the session (not user-supplied)
  if (!user.id || !Number.isInteger(user.id) || user.id <= 0) {
    return { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };
  }
  const userId = user.id.toString();

  const data = await repo.getCreditBalanceRow(userId);
  return {
    balance: data?.balance ?? 0,
    lifetime_earned: data?.lifetime_earned ?? 0,
    lifetime_spent: data?.lifetime_spent ?? 0,
    last_refill_at: data?.last_refill_at ?? null,
  };
}

export async function getSubscriptionTier(user: SubscriptionUser) {
  if (!user.id || !Number.isInteger(user.id) || user.id <= 0) {
    return null;
  }
  const userId = user.id.toString();
  const data = await repo.getSubscriptionTierRow(userId);
  return data ?? null;
}

export async function getSubscriptionTiers() {
  const tiers = await repo.listSubscriptionTiers();
  return tiers ?? [];
}

export async function getCreditUsage(
  user: SubscriptionUser,
  input: {
    limit: number;
    offset: number;
    source?: string;
    onlyOverages: boolean;
  }
) {
  if (!user.id || !Number.isInteger(user.id) || user.id <= 0) {
    return { events: [], total: 0 };
  }
  const userId = user.id.toString();
  const result = await repo.listCreditUsageEvents(userId, input);
  return result ?? { events: [], total: 0 };
}

export async function getCreditUsageSummary(
  user: SubscriptionUser,
  input: { days: number }
) {
  const userId = user.id?.toString();
  if (!userId) return { summary: [] };

  const since = new Date(
    Date.now() - input.days * 24 * 60 * 60 * 1000
  ).toISOString();

  const result = await repo.getCreditUsageSummary(userId, since);
  return result ?? { summary: [] };
}

export async function getPendingOverages(user: SubscriptionUser) {
  const userId = user.id?.toString();
  if (!userId) return { pending: [] };

  const result = await repo.listPendingOverages(userId);
  return result ?? { pending: [] };
}

export async function getInvoices(user: SubscriptionUser) {
  const tenantId = user.tenantId;
  if (!tenantId) return [];

  const tenant = await repo.getTenantById(tenantId);
  if (!tenant?.stripeCustomerId) return [];

  try {
    const stripe = getStripe();
    if (!stripe) return [];
    const invoices = await stripe.invoices.list({
      customer: tenant.stripeCustomerId,
      limit: 20,
    });
    return invoices.data as Array<{
      id: string;
      amount_paid: number;
      amount_due: number;
      currency: string;
      status: string;
      created: number;
      invoice_pdf: string | null;
      hosted_invoice_url: string | null;
      description: string | null;
      number: string | null;
    }>;
  } catch {
    return [];
  }
}
