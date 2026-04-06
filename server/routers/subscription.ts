import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createClient } from "@supabase/supabase-js";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getProductCount, getOrderCount, getCustomerCount, getTenantById, getPlans, getPlanBySlug } from "../db";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const subscriptionRouter = router({
  /**
   * Public: list all active plans (for landing page pricing section)
   */
  getPlans: publicProcedure.query(async () => {
    return getPlans();
  }),

  /**
   * Returns the current tenant's subscription status, plan details,
   * and usage metrics in a single call for the dashboard widget.
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    if (!tenantId) {
      return {
        status: "none" as const,
        plan: null,
        subscriptionCurrentPeriodEnd: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        trialDaysLeft: null,
        usage: null,
      };
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

    let plan = null;
    if (tenant.planId) {
      const allPlans = await getPlans();
      plan = allPlans.find((p) => p.id === tenant.planId) ?? null;
    }

    let trialDaysLeft: number | null = null;
    if (tenant.status === "trial") {
      const trialEnd = new Date(tenant.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = trialEnd.getTime() - now.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const [productCount, orderCount, customerCount] = await Promise.all([
      getProductCount(tenantId),
      getOrderCount(tenantId),
      getCustomerCount(tenantId),
    ]);

    return {
      status: tenant.subscriptionStatus,
      tenantStatus: tenant.status,
      plan,
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
  }),

  /**
   * Create a Stripe Checkout Session for a subscription plan.
   * Accepts either a planSlug (looks up Stripe price ID from DB) or a direct priceId.
   * Falls back to one-time payment if no Stripe price ID is configured yet.
   */
  createCheckout: protectedProcedure
    .input(z.object({
      planSlug: z.string().optional(),
      priceId: z.string().optional(),
      billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      let resolvedPriceId = input.priceId;
      let fallbackAmount: number | undefined;
      let fallbackDescription: string | undefined;

      // Resolve price ID from plan slug if not provided directly
      if (!resolvedPriceId && input.planSlug) {
        const plan = await getPlanBySlug(input.planSlug);
        if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
        resolvedPriceId = input.billingPeriod === "yearly"
          ? plan.stripePriceIdYearly ?? undefined
          : plan.stripePriceIdMonthly ?? undefined;

        // Fallback: use plan price as one-time amount if no Stripe price ID configured
        if (!resolvedPriceId) {
          const priceVal = input.billingPeriod === "yearly"
            ? Number(plan.priceYearly)
            : Number(plan.priceMonthly);
          fallbackAmount = Math.round(priceVal * 100); // cents
          fallbackDescription = `UnifyOne ${plan.name} Plan (${input.billingPeriod})`;
        }
      }

      const tenantId = ctx.user.tenantId;
      const baseUrl = input.origin;

      const res = await fetch(`${baseUrl}/api/stripe/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": ctx.req.headers.cookie ?? "",
        },
        body: JSON.stringify({
          priceId: resolvedPriceId,
          tenantId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          origin: baseUrl,
          amount: fallbackAmount,
          description: fallbackDescription,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Stripe checkout failed: ${err}` });
      }

      const data = await res.json() as { url?: string };
      return { url: data.url ?? null };
    }),

  /**
   * Create a Stripe Customer Portal session for managing subscriptions.
   */
  createPortalSession: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
      const tenant = await getTenantById(tenantId);
      if (!tenant?.stripeCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No Stripe customer found. Please subscribe first." });
      }
      const res = await fetch(`${input.origin}/api/stripe/portal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": ctx.req.headers.cookie ?? "",
        },
        body: JSON.stringify({ customerId: tenant.stripeCustomerId, origin: input.origin }),
      });
      if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Portal session failed" });
      const data = await res.json() as { url?: string };
      return { url: data.url ?? null };
    }),

  /**
   * Get credit balance from Supabase credit_balances table.
   */
  getCreditBalance: protectedProcedure.query(async ({ ctx }) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };

    const userId = ctx.user.id?.toString();
    if (!userId) return { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };

    const { data } = await supabase
      .from("credit_balances")
      .select("balance, lifetime_earned, lifetime_spent, last_refill_at")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      balance: data?.balance ?? 0,
      lifetime_earned: data?.lifetime_earned ?? 0,
      lifetime_spent: data?.lifetime_spent ?? 0,
      last_refill_at: data?.last_refill_at ?? null,
    };
  }),

  /**
   * Get subscription tier info from Supabase.
   */
  getSubscriptionTier: protectedProcedure.query(async ({ ctx }) => {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const userId = ctx.user.id?.toString();
    if (!userId) return null;

    const { data } = await supabase
      .from("stripe_subscriptions")
      .select(`
        id, status, current_period_end,
        stripe_prices!inner(id, unit_amount, interval),
        subscription_tiers!inner(name, monthly_credits, features)
      `)
      .eq("user_id", userId)
      .in("status", ["trialing", "active"])
      .maybeSingle();

    return data;
  }),

  /**
   * List available subscription tiers for the pricing page.
   */
  getSubscriptionTiers: publicProcedure.query(async () => {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];

    const { data } = await supabase
      .from("subscription_tiers")
      .select("*")
      .eq("is_active", true)
      .order("monthly_price_cents", { ascending: true });

    return data ?? [];
  }),

  /**
   * Returns invoice history from Stripe for the current tenant.
   * Falls back gracefully if no Stripe customer is configured.
   */
  getInvoices: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    if (!tenantId) return [];

    const tenant = await getTenantById(tenantId);
    if (!tenant?.stripeCustomerId) return [];

    try {
      const res = await fetch(
        `/api/stripe/invoices/${tenant.stripeCustomerId}`
      );
      if (!res.ok) return [];
      const invoices = await res.json();
      return invoices as Array<{
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
  }),
});
