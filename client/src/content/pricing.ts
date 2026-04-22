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
    tagline: "Meet Kai on your real data.",
    description: "For gig workers ready to activate Kai with unified API billing.",
    features: [
      "2 gig platform connections",
      "Full shift earnings history",
      "Auto mileage deduction tracking",
      "50 Kai unified API credits / month",
      "Any-model access (Claude, GPT, Gemini) at one unified cost",
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
    tagline: "One assistant. Any model. One bill.",
    description: "For power operators, freelancers, and developers scaling with Kai.",
    features: [
      "Unlimited gig platform connections",
      "Advanced zone / time optimization",
      "Quarterly estimates + 1099 prep",
      "500 Kai unified API credits / month",
      "Unified model pricing ($0.04 per extra credit)",
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
    tagline: "Kai infrastructure for serious operators.",
    description: "For agencies, white-label partners, and unified API resellers.",
    features: [
      "Unlimited multi-tenant management",
      "Affiliate storefront network tools",
      "10,000 Kai unified API credits / month",
      "Unified model pricing ($0.03 per extra credit)",
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
