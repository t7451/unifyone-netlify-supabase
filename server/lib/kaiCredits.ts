export type KaiCreditPackageDto = {
  id: number | null;
  slug: string;
  name: string;
  description: string;
  credits: number;
  amountCents: number;
  amountUsd: number;
  currency: string;
  stripePriceId: string | null;
  isDefault: boolean;
};

export type KaiCreditCheckoutMetadata = {
  type: "kai_credits";
  userId: string;
  tenantId: string;
  packageSlug: string;
  credits: string;
  purchaseId: string;
  idempotencyKey: string;
};

export type ParsedKaiCreditCheckoutMetadata = {
  userId: number;
  tenantId: number;
  packageSlug: string;
  credits: number;
  purchaseId: number;
  idempotencyKey: string;
};

export type KaiCreditPurchaseForFulfillment = {
  id: number;
  tenantId: number;
  userId: number;
  packageSlug: string;
  credits: number;
  amountCents: number;
  paidAt?: Date | null;
  fulfilledAt?: Date | null;
};

export type KaiCreditCheckoutSessionForFulfillment = {
  id: string;
  metadata?: Record<string, string | null> | null;
  payment_status?: string | null;
  amount_total?: number | null;
  payment_intent?: string | { id?: string } | null;
  customer?: string | { id?: string } | null;
};

export const DEFAULT_KAI_CREDIT_PACKAGES: KaiCreditPackageDto[] = [
  {
    id: null,
    slug: "starter",
    name: "Starter Pack",
    description: "Top up Kai for light AI assistance and experimentation.",
    credits: 100,
    amountCents: 900,
    amountUsd: 9,
    currency: "USD",
    stripePriceId: null,
    isDefault: true,
  },
  {
    id: null,
    slug: "pro",
    name: "Pro Pack",
    description: "A larger pack for regular Kai workflows and automations.",
    credits: 500,
    amountCents: 3900,
    amountUsd: 39,
    currency: "USD",
    stripePriceId: null,
    isDefault: true,
  },
  {
    id: null,
    slug: "scale",
    name: "Scale Pack",
    description: "Best value for heavy Kai usage across your tenant.",
    credits: 1500,
    amountCents: 9900,
    amountUsd: 99,
    currency: "USD",
    stripePriceId: null,
    isDefault: true,
  },
];

export function normalizeKaiCreditCheckoutOrigin(origin: string): string {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error("origin must be a valid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("origin must use http or https");
  }
  return parsed.origin;
}

export function selectKaiCreditPackage(
  packages: KaiCreditPackageDto[],
  input: { packageSlug?: string; packageId?: number }
): KaiCreditPackageDto | null {
  if (input.packageId) {
    return packages.find(pkg => pkg.id === input.packageId) ?? null;
  }
  if (input.packageSlug) {
    return packages.find(pkg => pkg.slug === input.packageSlug) ?? null;
  }
  return null;
}

export function buildKaiCreditCheckoutMetadata(input: {
  userId: string | number;
  tenantId: string | number;
  packageSlug: string;
  credits: number;
  purchaseId: string | number;
  idempotencyKey: string;
}): KaiCreditCheckoutMetadata {
  return {
    type: "kai_credits",
    userId: String(input.userId),
    tenantId: String(input.tenantId),
    packageSlug: input.packageSlug,
    credits: String(input.credits),
    purchaseId: String(input.purchaseId),
    idempotencyKey: input.idempotencyKey,
  };
}

function parsePositiveInteger(value: string | null | undefined, field: string) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid Kai credit checkout metadata: ${field}`);
  }
  return parsed;
}

export function parseKaiCreditCheckoutMetadata(
  metadata: Record<string, string | null> | null | undefined
): ParsedKaiCreditCheckoutMetadata | null {
  if (metadata?.type !== "kai_credits") return null;
  return {
    purchaseId: parsePositiveInteger(metadata.purchaseId, "purchaseId"),
    tenantId: parsePositiveInteger(metadata.tenantId, "tenantId"),
    userId: parsePositiveInteger(metadata.userId, "userId"),
    credits: parsePositiveInteger(metadata.credits, "credits"),
    packageSlug: metadata.packageSlug || "",
    idempotencyKey: metadata.idempotencyKey || "",
  };
}

export function buildKaiCreditLedgerIdempotencyKey(purchaseId: number) {
  return `kai_credit_purchase:${purchaseId}`;
}

function objectId(value: string | { id?: string } | null | undefined) {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

export function buildKaiCreditFulfillmentPlan(
  session: KaiCreditCheckoutSessionForFulfillment,
  purchase: KaiCreditPurchaseForFulfillment
) {
  const metadata = parseKaiCreditCheckoutMetadata(session.metadata);
  if (!metadata) return null;
  if (
    metadata.purchaseId !== purchase.id ||
    metadata.tenantId !== purchase.tenantId ||
    metadata.userId !== purchase.userId
  ) {
    throw new Error("Kai credit checkout metadata does not match purchase");
  }
  if (metadata.credits !== purchase.credits) {
    throw new Error("Kai credit checkout metadata credits mismatch");
  }
  if (purchase.amountCents > 0 && session.payment_status !== "paid") {
    throw new Error(
      `Kai credit checkout ${session.id} completed without paid status`
    );
  }
  if (
    typeof session.amount_total === "number" &&
    session.amount_total !== purchase.amountCents
  ) {
    throw new Error(
      `Kai credit amount mismatch for purchase ${purchase.id}: expected ${purchase.amountCents}, got ${session.amount_total}`
    );
  }

  const paymentIntent = objectId(session.payment_intent);
  const customerId = objectId(session.customer);
  const now = new Date();
  const ledgerIdempotencyKey = buildKaiCreditLedgerIdempotencyKey(purchase.id);
  return {
    ledgerIdempotencyKey,
    ledgerInsert: {
      tenantId: purchase.tenantId,
      userId: purchase.userId,
      purchaseId: purchase.id,
      type: "purchase" as const,
      creditDelta: purchase.credits,
      idempotencyKey: ledgerIdempotencyKey,
      description: `Purchased ${purchase.credits} Kai credits (${purchase.packageSlug})`,
      metadata: {
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntent,
        stripeCustomerId: customerId,
        packageSlug: purchase.packageSlug,
      },
    },
    purchaseUpdate: {
      status: "paid" as const,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntent,
      stripeCustomerId: customerId,
      paidAt: purchase.paidAt ?? now,
      fulfilledAt: purchase.fulfilledAt ?? now,
      updatedAt: now,
    },
  };
}

export function applyKaiCreditFulfillmentToBalance(
  currentBalance: number,
  plan: { ledgerIdempotencyKey: string; ledgerInsert: { creditDelta: number } },
  appliedLedgerKeys: Set<string>
) {
  if (appliedLedgerKeys.has(plan.ledgerIdempotencyKey)) {
    return { balance: currentBalance, credited: false };
  }
  appliedLedgerKeys.add(plan.ledgerIdempotencyKey);
  return {
    balance: currentBalance + plan.ledgerInsert.creditDelta,
    credited: true,
  };
}
