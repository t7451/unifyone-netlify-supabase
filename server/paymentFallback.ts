export const PAYMENT_PROVIDERS = [
  "stripe",
  "square",
  "paypal",
  "shopify",
  "manual",
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

const DEFAULT_PROVIDER_ORDER: PaymentProvider[] = [
  "stripe",
  "square",
  "paypal",
  "manual",
];

function providerSetFromEnv(value: string | undefined): Set<PaymentProvider> {
  const allowed = new Set<PaymentProvider>(PAYMENT_PROVIDERS);
  return new Set(
    (value ?? "")
      .split(",")
      .map(v => v.trim().toLowerCase())
      .filter((v): v is PaymentProvider => allowed.has(v as PaymentProvider))
  );
}

export function getProviderOrder(
  preferredProvider?: PaymentProvider | null,
  configuredOrder = process.env.PAYMENT_PROVIDER_ORDER
): PaymentProvider[] {
  const allowed = new Set<PaymentProvider>(PAYMENT_PROVIDERS);
  const parsed = (configuredOrder ?? "")
    .split(",")
    .map(v => v.trim().toLowerCase())
    .filter((v): v is PaymentProvider => allowed.has(v as PaymentProvider));
  const base = parsed.length ? parsed : DEFAULT_PROVIDER_ORDER;
  const ordered = preferredProvider ? [preferredProvider, ...base] : base;
  return Array.from(new Set(ordered));
}

export function isPaymentProviderConfigured(
  provider: PaymentProvider,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const disabled = providerSetFromEnv(env.PAYMENT_PROVIDER_DISABLED);
  if (disabled.has(provider)) return false;

  switch (provider) {
    case "stripe":
      return !!env.STRIPE_SECRET_KEY;
    case "square":
      return !!(env.SQUARE_ACCESS_TOKEN && env.SQUARE_LOCATION_ID);
    case "paypal":
      return !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
    case "shopify":
      return !!env.SHOPIFY_CHECKOUT_URL;
    case "manual":
      return env.MANUAL_PAYMENTS_ENABLED !== "false";
  }
}

export function getAvailablePaymentProviders(
  preferredProvider?: PaymentProvider | null,
  env: NodeJS.ProcessEnv = process.env
): PaymentProvider[] {
  return getProviderOrder(preferredProvider, env.PAYMENT_PROVIDER_ORDER).filter(
    provider => isPaymentProviderConfigured(provider, env)
  );
}

export function buildManualPaymentUrl(input: {
  origin: string;
  planSlug?: string | null;
  amountCents?: number | null;
  description?: string | null;
  billingPeriod?: "monthly" | "yearly";
  env?: NodeJS.ProcessEnv;
}): string {
  const env = input.env ?? process.env;
  const target = env.MANUAL_PAYMENT_URL || `${input.origin}/contact`;
  const url = new URL(target, input.origin);
  url.searchParams.set("intent", "manual-payment");
  if (input.planSlug) url.searchParams.set("plan", input.planSlug);
  if (input.billingPeriod) url.searchParams.set("period", input.billingPeriod);
  if (input.amountCents && input.amountCents > 0) {
    url.searchParams.set("amount", (input.amountCents / 100).toFixed(2));
    url.searchParams.set("currency", "USD");
  }
  if (input.description) {
    url.searchParams.set("description", input.description);
  }
  return url.toString();
}
