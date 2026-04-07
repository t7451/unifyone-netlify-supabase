// Shared pricing tier definitions used by Home and Pricing pages.
// Update prices/features here in one place.

export type PricingTier = {
  id: "acolyte" | "architect" | "cathedral";
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

export const TIERS: PricingTier[] = [
  {
    id: "acolyte",
    name: "Acolyte",
    price: "$0",
    period: "forever",
    description: "For builders proving the concept.",
    features: [
      "1 tenant",
      "100 products",
      "500 orders/mo",
      "Stripe checkout",
      "Basic analytics",
    ],
    cta: "Begin Construction",
    highlight: false,
  },
  {
    id: "architect",
    name: "Architect",
    price: "$49",
    period: "per month",
    description: "For operators running real commerce.",
    features: [
      "5 tenants",
      "Unlimited products",
      "Unlimited orders",
      "All payment rails",
      "Manus AI included",
      "Automation layer",
      "Priority support",
    ],
    cta: "Claim Your Nave",
    highlight: true,
  },
  {
    id: "cathedral",
    name: "Cathedral",
    price: "$149",
    period: "per month",
    description: "For enterprises building at scale.",
    features: [
      "Unlimited tenants",
      "White-label ready",
      "Custom domains",
      "SLA guarantee",
      "Dedicated infrastructure",
      "API access",
      "Concierge onboarding",
    ],
    cta: "Commission the Build",
    highlight: false,
  },
];
