export type PlanSlug = "starter" | "pro" | "scale";
export type BillingCycle = "monthly" | "yearly";

export type PlanCatalogEntry = {
  slug: PlanSlug;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  tagline: string;
  description: string;
  cta: string;
  highlight: boolean;
  badge: string | null;
  features: string[];
  stripeProductName: string | null;
  stripeProductDescription: string | null;
  maxProducts: number;
  maxOrders: number;
  maxUsers: number;
  tenantLimit: number | null;
  kaiCreditsMonthly: number;
  overageRate: number | null;
  supportLabel: string;
  includesWhiteLabel: boolean;
  includesCustomDomains: boolean;
  includesSla: boolean;
  includesAutomationLayer: boolean;
  includesAffiliateSuite: boolean;
  includesApiAccess: boolean;
};

export const PLAN_CATALOG: readonly PlanCatalogEntry[] = [
  {
    slug: "starter",
    name: "Starter",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    tagline: "Start on the same infrastructure as paid tenants.",
    description:
      "For operators validating the workflow before they need more automation, volume, or team access.",
    cta: "Start Free",
    highlight: false,
    badge: null,
    features: [
      "1 tenant",
      "Up to 100 products",
      "Up to 1,000 orders / month",
      "2 team members",
      "50 Kai unified API credits / month",
      "Stripe checkout + core analytics",
      "Money Manager + operator dashboard",
    ],
    stripeProductName: null,
    stripeProductDescription: null,
    maxProducts: 100,
    maxOrders: 1000,
    maxUsers: 2,
    tenantLimit: 1,
    kaiCreditsMonthly: 50,
    overageRate: null,
    supportLabel: "Community",
    includesWhiteLabel: false,
    includesCustomDomains: false,
    includesSla: false,
    includesAutomationLayer: false,
    includesAffiliateSuite: false,
    includesApiAccess: false,
  },
  {
    slug: "pro",
    name: "Pro",
    monthlyPriceCents: 1900,
    yearlyPriceCents: 19000,
    tagline: "One checkout, one operator console, one AI bill.",
    description:
      "For teams running live storefronts, automations, and AI-assisted operations on one tenant stack.",
    cta: "Go Pro",
    highlight: true,
    badge: "Most Chosen",
    features: [
      "5 tenants",
      "Up to 1,000 products",
      "Up to 10,000 orders / month",
      "5 team members",
      "500 Kai unified API credits / month",
      "Unified model pricing ($0.04 per extra credit)",
      "Automation layer + API key management",
      "Priority support (24hr response)",
    ],
    stripeProductName: "UnifyOne Pro",
    stripeProductDescription:
      "5 tenants, 500 Kai credits/mo, up to 1,000 products, 10,000 orders/mo, automation layer, and priority support.",
    maxProducts: 1000,
    maxOrders: 10000,
    maxUsers: 5,
    tenantLimit: 5,
    kaiCreditsMonthly: 500,
    overageRate: 0.04,
    supportLabel: "Priority",
    includesWhiteLabel: false,
    includesCustomDomains: false,
    includesSla: false,
    includesAutomationLayer: true,
    includesAffiliateSuite: true,
    includesApiAccess: true,
  },
  {
    slug: "scale",
    name: "Scale",
    monthlyPriceCents: 9900,
    yearlyPriceCents: 99000,
    tagline: "White-label control planes for serious operators.",
    description:
      "For agencies, multi-brand teams, and white-label operators selling infrastructure instead of assembling tools.",
    cta: "Start Scale",
    highlight: false,
    badge: "Enterprise",
    features: [
      "Unlimited tenants",
      "Unlimited products",
      "Unlimited orders",
      "Unlimited team members",
      "10,000 Kai unified API credits / month",
      "Unified model pricing ($0.03 per extra credit)",
      "White-label + custom routing rules",
      "Slack support + 4hr SLA",
    ],
    stripeProductName: "UnifyOne Scale",
    stripeProductDescription:
      "Unlimited tenants, 10,000 Kai credits/mo, white-label support, custom routing, and SLA-backed support.",
    maxProducts: 1000000,
    maxOrders: 1000000,
    maxUsers: 1000000,
    tenantLimit: null,
    kaiCreditsMonthly: 10000,
    overageRate: 0.03,
    supportLabel: "Slack + SLA",
    includesWhiteLabel: true,
    includesCustomDomains: true,
    includesSla: true,
    includesAutomationLayer: true,
    includesAffiliateSuite: true,
    includesApiAccess: true,
  },
] as const;

export const PLAN_CATALOG_BY_SLUG: Readonly<
  Record<PlanSlug, PlanCatalogEntry>
> = PLAN_CATALOG.reduce(
  (acc, plan) => {
    acc[plan.slug] = plan;
    return acc;
  },
  {} as Record<PlanSlug, PlanCatalogEntry>
);

export function isPlanSlug(value: string): value is PlanSlug {
  return value === "starter" || value === "pro" || value === "scale";
}

export function formatUsdCents(cents: number): string {
  const amount = cents / 100;
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function getPlanPrice(
  plan: PlanCatalogEntry,
  cycle: BillingCycle
): number {
  return cycle === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;
}

export function getPlanPriceLabel(
  plan: PlanCatalogEntry,
  cycle: BillingCycle = "monthly"
): string {
  return formatUsdCents(getPlanPrice(plan, cycle));
}

export function getPlanPeriodLabel(plan: PlanCatalogEntry): string {
  return plan.monthlyPriceCents === 0 ? "forever" : "per month";
}

export function getPlanAnnualTotalLabel(plan: PlanCatalogEntry): string | null {
  if (!plan.yearlyPriceCents) return null;
  const yearlyAmount = plan.yearlyPriceCents / 100;
  return Number.isInteger(yearlyAmount)
    ? `$${yearlyAmount}/year`
    : `$${yearlyAmount.toFixed(2)}/year`;
}

export function getPlanTenantLimitLabel(plan: PlanCatalogEntry): string {
  return plan.tenantLimit === null ? "Unlimited" : String(plan.tenantLimit);
}

export function getPlanNumericLimitLabel(value: number): string {
  return value >= 1000000 ? "Unlimited" : value.toLocaleString("en-US");
}

export function getPlanOverageLabel(plan: PlanCatalogEntry): string {
  return plan.overageRate === null
    ? "—"
    : `$${plan.overageRate.toFixed(2)} / credit`;
}
