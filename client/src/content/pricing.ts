// Shared pricing tier definitions used by the public landing/pricing display.
//
// Public pricing derives from the gig-worker plan catalog in
// `shared/gigPricing.ts` (Gig Starter free + Gig Pro $4.99/mo · $49/yr).
//
// NOTE: This is intentionally NOT sourced from `shared/pricing.ts` (the
// commerce Starter/Pro/Scale catalog) — that file is the load-bearing backend
// product catalog and must not be imported here. The hidden "Gig Elite" tier
// is omitted on purpose; only Free + Pro ship publicly.

import {
  GIG_PLAN_CATALOG,
  type GigPlanSlug,
  formatGigPrice,
  getGigMonthlyLabel,
  getGigAnnualSubtext,
} from "@shared/gigPricing";

export type PricingTier = {
  id: GigPlanSlug;
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

export const TIERS: PricingTier[] = GIG_PLAN_CATALOG.map(plan => {
  const isFree = plan.monthlyPriceCents === 0;
  const annualSubtext = getGigAnnualSubtext(plan);

  return {
    id: plan.slug,
    name: plan.name,
    price: isFree ? "Free" : formatGigPrice(plan.monthlyPriceCents),
    period: isFree ? "forever" : "per month",
    ...(isFree
      ? {}
      : {
          annualPrice: getGigMonthlyLabel(plan, "yearly"),
          annualPeriod: "per month, billed annually",
          ...(annualSubtext ? { annualSubtext } : {}),
        }),
    tagline: plan.tagline,
    description: plan.description,
    features: plan.features,
    cta: plan.cta,
    highlight: plan.highlight,
  };
});
