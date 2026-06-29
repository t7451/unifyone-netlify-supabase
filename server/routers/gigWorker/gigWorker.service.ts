/**
 * server/routers/gigWorker/gigWorker.service.ts
 *
 * Use-case layer for gig worker billing: subscription/usage resolution,
 * feature gating, Stripe checkout orchestration, AI usage metering, and
 * cancellation. Data access goes through gigWorker.repo; transport (zod,
 * procedures) lives in index.ts.
 */

import { TRPCError } from "@trpc/server";
import { getAppUrl } from "../../_core/env";
import { stripe } from "../../stripe";
import {
  getGigWorkerPlans,
  getGigWorkerPlanBySlug,
  getGigWorkerPlanById,
  getGigWorkerSubscription,
  upsertGigWorkerSubscription,
  getGigAIUsage,
  incrementGigAIUsage,
  seedGigWorkerPlans,
} from "./gigWorker.repo";

// ─── Billing period helper ────────────────────────────────────────────────────
export function currentBillingPeriod(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// ─── Feature → minimum tier map ───────────────────────────────────────────────
export const FEATURE_TIERS: Record<string, string> = {
  shift_tracker: "starter",
  mileage_log: "starter",
  basic_ai: "starter",
  route_optimizer: "pro",
  tax_export: "pro",
  unlimited_rules: "pro",
  advanced_analytics: "pro",
  earnings_forecast: "elite",
  ai_strategy: "elite",
  priority_support: "elite",
};

export const gigWorkerService = {
  /**
   * List all active gig worker plans (for the pricing page).
   * Seeds default plans on first call if the table is empty.
   */
  async getPlans() {
    await seedGigWorkerPlans();
    return getGigWorkerPlans();
  },

  /** Current user's gig worker subscription and AI usage. */
  async getSubscription(userId: number) {
    await seedGigWorkerPlans();
    let sub = await getGigWorkerSubscription(userId);
    const allPlans = await getGigWorkerPlans();

    // Default to starter plan if no subscription exists
    const starterPlan = allPlans.find(p => p.slug === "gig-starter") ?? null;

    // Auto-provision a real starter entitlement the first time an operator's
    // gig data loads, so every operator has a concrete subscription row
    // (covers new and existing users) rather than an implicit default. This
    // only creates a row when none exists — it never overwrites an existing
    // (possibly paid) subscription.
    if (!sub && starterPlan) {
      await upsertGigWorkerSubscription({
        userId,
        planId: starterPlan.id,
        status: "active",
      });
      sub = await getGigWorkerSubscription(userId);
    }

    if (!sub) {
      const period = currentBillingPeriod();
      const usage = await getGigAIUsage(userId, period);
      return {
        status: "none" as const,
        plan: starterPlan,
        subscription: null,
        aiUsage: usage ?? null,
        aiCreditsRemaining: starterPlan
          ? Math.max(
              0,
              starterPlan.monthlyAICredits - (usage?.requestsUsed ?? 0)
            )
          : 0,
        features: starterPlan?.features ?? [],
      };
    }

    const plan =
      allPlans.find(p => p.id === sub.planId) ??
      (await getGigWorkerPlanById(sub.planId)) ??
      starterPlan;

    const period = currentBillingPeriod();
    const usage = await getGigAIUsage(userId, period);
    const creditsUsed = usage?.requestsUsed ?? 0;
    const monthlyQuota =
      plan?.monthlyAICredits ?? starterPlan?.monthlyAICredits ?? 25;

    return {
      status: sub.status,
      plan,
      subscription: {
        id: sub.id,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        trialEnd: sub.trialEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      },
      aiUsage: usage ?? null,
      aiCreditsRemaining: Math.max(0, monthlyQuota - creditsUsed),
      features: plan?.features ?? starterPlan?.features ?? [],
    };
  },

  /**
   * Check whether the current user has access to a specific gig feature.
   * Returns the feature gate status and which plan is required if not accessible.
   */
  async checkFeatureAccess(userId: number, feature: string) {
    await seedGigWorkerPlans();
    const [sub, allPlans] = await Promise.all([
      getGigWorkerSubscription(userId),
      getGigWorkerPlans(),
    ]);

    const requiredTier = FEATURE_TIERS[feature] ?? "starter";

    const TIER_ORDER = ["starter", "pro", "elite"];
    const requiredIdx = TIER_ORDER.indexOf(requiredTier);

    // Resolve user's current tier
    let userTier = "starter";
    if (sub && (sub.status === "active" || sub.status === "trialing")) {
      const plan = allPlans.find(p => p.id === sub.planId);
      if (plan) userTier = plan.tier;
    }

    const userIdx = TIER_ORDER.indexOf(userTier);
    const hasAccess = userIdx >= requiredIdx;

    // Find the cheapest plan that unlocks this feature
    const upgradePlan = hasAccess
      ? null
      : (allPlans.find(p => TIER_ORDER.indexOf(p.tier) >= requiredIdx) ?? null);

    return { hasAccess, userTier, requiredTier, upgradePlan };
  },

  /** Create a Stripe Checkout session for a gig worker plan. */
  async createCheckout(
    ctx: {
      user: { id: number; email: string | null; name: string | null };
      req: { protocol: string; headers: { host?: string } };
    },
    input: {
      planSlug: string;
      billingPeriod: "monthly" | "yearly";
      origin: string;
    }
  ) {
    await seedGigWorkerPlans();
    const plan = await getGigWorkerPlanBySlug(input.planSlug);
    if (!plan) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Gig plan not found" });
    }
    if (plan.slug === "gig-starter") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Starter plan is free — no checkout required.",
      });
    }

    const resolvedPriceId =
      input.billingPeriod === "yearly"
        ? plan.stripePriceIdYearly
        : plan.stripePriceIdMonthly;

    // Fallback one-time charge if no Stripe price IDs configured yet
    const priceVal =
      input.billingPeriod === "yearly"
        ? Number(plan.priceYearly)
        : Number(plan.priceMonthly);
    const fallbackAmount = resolvedPriceId
      ? undefined
      : Math.round(priceVal * 100);
    const fallbackDescription = resolvedPriceId
      ? undefined
      : `UnifyOne ${plan.name} (${input.billingPeriod})`;

    // Use the server-side canonical URL for the internal API call to prevent
    // SSRF / cookie exfiltration via a user-supplied origin.
    const internalBase =
      getAppUrl() || `${ctx.req.protocol}://${ctx.req.headers.host}`;

    const res = await fetch(`${internalBase}/api/stripe/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        priceId: resolvedPriceId,
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        userName: ctx.user.name,
        origin: input.origin,
        amount: fallbackAmount,
        description: fallbackDescription,
        metadata: {
          gigPlanSlug: plan.slug,
          gigPlanId: String(plan.id),
          billingPeriod: input.billingPeriod,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Stripe checkout failed: ${err}`,
      });
    }

    const data = (await res.json()) as { url?: string };
    return { url: data.url ?? null };
  },

  /** AI usage for the current billing period. */
  async getAIUsage(userId: number) {
    const period = currentBillingPeriod();

    const [usage, sub, allPlans] = await Promise.all([
      getGigAIUsage(userId, period),
      getGigWorkerSubscription(userId),
      getGigWorkerPlans(),
    ]);

    const starterPlan = allPlans.find(p => p.slug === "gig-starter");
    let quota = starterPlan?.monthlyAICredits ?? 25;

    if (sub && (sub.status === "active" || sub.status === "trialing")) {
      const plan = allPlans.find(p => p.id === sub.planId);
      if (plan) quota = plan.monthlyAICredits;
    }

    const used = usage?.requestsUsed ?? 0;
    return {
      billingPeriod: period,
      requestsUsed: used,
      tokensUsed: usage?.tokensUsed ?? 0,
      monthlyQuota: quota,
      remaining: Math.max(0, quota - used),
      lastContext: usage?.lastContext ?? null,
    };
  },

  /**
   * Record AI credit consumption for a gig worker action.
   * Called internally from gig-context AI calls.
   */
  async recordAIUsage(
    userId: number,
    input: { tokens: number; context?: string }
  ) {
    const period = currentBillingPeriod();

    // Enforce quota — check remaining credits first
    const [usage, sub, allPlans] = await Promise.all([
      getGigAIUsage(userId, period),
      getGigWorkerSubscription(userId),
      getGigWorkerPlans(),
    ]);

    const starterPlan = allPlans.find(p => p.slug === "gig-starter");
    let quota = starterPlan?.monthlyAICredits ?? 25;

    if (sub && (sub.status === "active" || sub.status === "trialing")) {
      const plan = allPlans.find(p => p.id === sub.planId);
      if (plan) quota = plan.monthlyAICredits;
    }

    const used = usage?.requestsUsed ?? 0;
    if (used >= quota) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Monthly AI credit limit reached. Upgrade your Gig plan to continue.",
      });
    }

    await incrementGigAIUsage(userId, period, input.tokens, input.context);
    return { success: true, remaining: Math.max(0, quota - used - 1) };
  },

  /**
   * Cancel (at period end) the current gig worker subscription.
   * Calls the Stripe SDK directly — no HTTP round-trip to an origin-derived URL.
   */
  async cancelSubscription(userId: number) {
    const sub = await getGigWorkerSubscription(userId);
    if (!sub?.stripeSubscriptionId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active gig subscription found.",
      });
    }

    if (!stripe) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Payment provider not configured.",
      });
    }

    try {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Cancel failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    await upsertGigWorkerSubscription({
      ...sub,
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    });

    return { success: true };
  },
};
