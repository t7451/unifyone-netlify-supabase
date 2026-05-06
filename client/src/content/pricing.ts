// Shared pricing tier definitions used by Home and Pricing pages.
// Public pricing now derives from the canonical plan catalog in shared/pricing.ts.

import {
  PLAN_CATALOG,
  type PlanSlug,
  formatUsdCents,
  getPlanPeriodLabel,
} from "@shared/pricing";

export type PricingTier = {
  id: PlanSlug;
  name: string;
  price: string;
  period: string;
  annualPrice?: string;
  annualPeriod?: string;
  annualSubtext?: string;
  tagline: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

const ANNUAL_PRICING: Partial<
  Record<
    PlanSlug,
    Pick<PricingTier, "annualPrice" | "annualPeriod" | "annualSubtext">
  >
> = {
  pro: {
    annualPrice: "$16",
    annualPeriod: "per month, billed annually",
    annualSubtext: "$192 / year",
  },
  scale: {
    annualPrice: "$83",
    annualPeriod: "per month, billed annually",
    annualSubtext: "$996 / year",
  },
};

export const TIERS: PricingTier[] = PLAN_CATALOG.map(plan => ({
  id: plan.slug,
  name: plan.name,
  price: formatUsdCents(plan.monthlyPriceCents),
  period: getPlanPeriodLabel(plan),
  ...ANNUAL_PRICING[plan.slug],
  tagline: plan.tagline,
  description: plan.description,
  features: plan.features,
  cta: plan.cta,
  highlight: plan.highlight,
}));
