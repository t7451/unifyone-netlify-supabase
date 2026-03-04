import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { getProductCount, getOrderCount, getCustomerCount, getTenantById, getPlans } from "../db";

export const subscriptionRouter = router({
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

    // Fetch plan details if tenant has a plan
    let plan = null;
    if (tenant.planId) {
      const allPlans = await getPlans();
      plan = allPlans.find((p) => p.id === tenant.planId) ?? null;
    }

    // Calculate trial days left (tenant created within 14-day trial window)
    let trialDaysLeft: number | null = null;
    if (tenant.status === "trial") {
      const trialEnd = new Date(tenant.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = trialEnd.getTime() - now.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // Fetch usage counts
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
