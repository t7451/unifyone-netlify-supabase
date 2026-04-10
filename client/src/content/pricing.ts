// Shared pricing tier definitions used by Home and Pricing pages.
// Update prices/features here in one place.
// Tiers: Starter (free) / Pro ($19/mo) / Scale ($99/mo)

export type PricingTier = {
  id: "starter" | "pro" | "scale";
  name: string;
  price: string;
  period: string;
  tagline: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

export const TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    period: "forever",
    tagline: "See what you're missing.",
    description: "For gig workers ready to see their real numbers.",
    features: [
      "2 gig platform connections",
      "Full shift earnings history",
      "Auto mileage deduction tracking",
      "50 Kai queries / month",
      "Money Manager dashboard",
      "MoneyGenerator gig tools",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "per month",
    tagline: "Pay for itself in week one.",
    description: "For power operators, freelancers, and developers.",
    features: [
      "Unlimited gig platform connections",
      "Advanced zone / time optimization",
      "Quarterly estimates + 1099 prep",
      "500 Kai queries / month",
      "UnifyAI API — 1,000 credits included",
      "Full MCP config dashboard",
      "Multi-model selection (Claude, GPT, Gemini)",
      "1 commerce storefront",
      "Developer API key management",
      "Priority support (24hr response)",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: "$99",
    period: "per month",
    tagline: "For operators building at scale.",
    description: "For agencies, white-label partners, and API resellers.",
    features: [
      "Unlimited multi-tenant management",
      "Affiliate storefront network tools",
      "UnifyAI API — 10,000 credits / month",
      "API reselling + white-label",
      "Custom MCP routing rules",
      "Role-based team access + audit logs",
      "Shopify sync + inventory management",
      "Webhook configs + custom data pipelines",
      "Slack support + 4hr SLA",
      "Volume API discounts",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];
