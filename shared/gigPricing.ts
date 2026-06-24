// Static catalog for the public gig-worker plans shown on /pricing.
//
// These tiers mirror the server seed in `seedGigWorkerPlans()` (server/db.ts)
// and the authenticated catalog rendered by GigWorkerPlans.tsx, so the public
// pricing page stays in lockstep with what a worker actually gets after signup.
//
// NOTE: This is intentionally separate from `shared/pricing.ts` (the commerce
// Starter/Pro/Scale catalog). Commerce still uses that file — do NOT merge.
// The hidden "Gig Elite" tier is omitted here on purpose; only Free + Pro ship.

export type GigPlanSlug = "gig-starter" | "gig-pro";
export type GigBillingCycle = "monthly" | "yearly";

export type GigPlan = {
  slug: GigPlanSlug;
  name: string;
  /** Monthly price in whole cents (e.g. 499 = $4.99). */
  monthlyPriceCents: number;
  /** Yearly price in whole cents (e.g. 4900 = $49.00). */
  yearlyPriceCents: number;
  /** Included AI requests per month. */
  monthlyAIRequests: number;
  tagline: string;
  description: string;
  /** Worker-facing feature bullets, in display order. */
  features: string[];
  cta: string;
  highlight: boolean;
  badge: string | null;
};

export const GIG_PLAN_CATALOG: readonly GigPlan[] = [
  {
    slug: "gig-starter",
    name: "Gig Starter",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    monthlyAIRequests: 25,
    tagline: "Free forever.",
    description:
      "Everything you need to track what you earn and what you owe — at no cost, for as long as you drive.",
    features: [
      "Shift tracker",
      "Mileage log (IRS rate)",
      "Tax calculators (SE, quarterly, mileage)",
      "25 AI requests / month",
    ],
    cta: "Start Free",
    highlight: false,
    badge: null,
  },
  {
    slug: "gig-pro",
    name: "Gig Pro",
    monthlyPriceCents: 499,
    yearlyPriceCents: 4900,
    monthlyAIRequests: 250,
    tagline: "For drivers who want the whole year handled.",
    description:
      "Everything in Free, plus a year-round tax dashboard and unlimited history so nothing slips through.",
    features: [
      "Everything in Free",
      "Unlimited saved history",
      "Year-round tax dashboard",
      "Priority support",
      "250 AI requests / month",
      "AI tools included when they ship",
    ],
    cta: "Go Pro",
    highlight: true,
    badge: "Most Chosen",
  },
] as const;

export const GIG_PLAN_BY_SLUG: Readonly<Record<GigPlanSlug, GigPlan>> =
  GIG_PLAN_CATALOG.reduce(
    (acc, plan) => {
      acc[plan.slug] = plan;
      return acc;
    },
    {} as Record<GigPlanSlug, GigPlan>
  );

/** Format whole cents as a dollar string ("$0", "$4.99"). */
export function formatGigPrice(cents: number): string {
  const amount = cents / 100;
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/**
 * Monthly-equivalent label for a plan at the given billing cycle.
 * Yearly cycle shows the per-month cost of the annual price.
 */
export function getGigMonthlyLabel(
  plan: GigPlan,
  cycle: GigBillingCycle
): string {
  if (plan.monthlyPriceCents === 0) return "Free";
  const cents =
    cycle === "yearly"
      ? Math.round(plan.yearlyPriceCents / 12)
      : plan.monthlyPriceCents;
  return formatGigPrice(cents);
}

/** Annual-total subtext, e.g. "$49 / year — save ~18%". Null for free plans. */
export function getGigAnnualSubtext(plan: GigPlan): string | null {
  if (!plan.yearlyPriceCents) return null;
  const yearly = formatGigPrice(plan.yearlyPriceCents);
  const fullYear = plan.monthlyPriceCents * 12;
  const savings =
    fullYear > 0
      ? Math.round(((fullYear - plan.yearlyPriceCents) / fullYear) * 100)
      : 0;
  return savings > 0
    ? `${yearly} / year — save ~${savings}%`
    : `${yearly} / year`;
}
