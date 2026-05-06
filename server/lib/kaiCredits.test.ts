import { describe, expect, it } from "vitest";
import {
  applyKaiCreditFulfillmentToBalance,
  buildKaiCreditCheckoutMetadata,
  buildKaiCreditFulfillmentPlan,
  buildKaiCreditLedgerIdempotencyKey,
  DEFAULT_KAI_CREDIT_PACKAGES,
  normalizeKaiCreditCheckoutOrigin,
  parseKaiCreditCheckoutMetadata,
  selectKaiCreditPackage,
  type KaiCreditPurchaseForFulfillment,
} from "./kaiCredits";

const purchase: KaiCreditPurchaseForFulfillment = {
  id: 321,
  tenantId: 44,
  userId: 7,
  packageSlug: "pro",
  credits: 500,
  amountCents: 3900,
  paidAt: null,
  fulfilledAt: null,
};

const metadata = buildKaiCreditCheckoutMetadata({
  userId: purchase.userId,
  tenantId: purchase.tenantId,
  packageSlug: purchase.packageSlug,
  credits: purchase.credits,
  purchaseId: purchase.id,
  idempotencyKey: "kai_uuid",
});

const session = {
  id: "cs_test_kai",
  metadata,
  payment_status: "paid",
  amount_total: purchase.amountCents,
  payment_intent: "pi_test",
  customer: "cus_test",
};

describe("Kai credit checkout helpers", () => {
  it("selects only available package DTOs by slug or id", () => {
    expect(
      selectKaiCreditPackage(DEFAULT_KAI_CREDIT_PACKAGES, {
        packageSlug: "pro",
      })?.credits
    ).toBe(500);
    expect(
      selectKaiCreditPackage([{ ...DEFAULT_KAI_CREDIT_PACKAGES[0], id: 10 }], {
        packageId: 10,
      })?.slug
    ).toBe("starter");
    expect(
      selectKaiCreditPackage(DEFAULT_KAI_CREDIT_PACKAGES, {
        packageSlug: "inactive-or-missing",
      })
    ).toBeNull();
  });

  it("normalizes http origins and rejects non-web origins", () => {
    expect(normalizeKaiCreditCheckoutOrigin("https://app.example/a/b")).toBe(
      "https://app.example"
    );
    expect(() =>
      normalizeKaiCreditCheckoutOrigin("javascript:alert(1)")
    ).toThrow(/http or https/);
  });

  it("builds Stripe-safe string metadata with purchase id and idempotency key", () => {
    expect(metadata).toEqual({
      type: "kai_credits",
      userId: "7",
      tenantId: "44",
      packageSlug: "pro",
      credits: "500",
      purchaseId: "321",
      idempotencyKey: "kai_uuid",
    });
    expect(parseKaiCreditCheckoutMetadata(metadata)).toMatchObject({
      userId: 7,
      tenantId: 44,
      credits: 500,
      purchaseId: 321,
    });
  });
});

describe("Kai credit webhook fulfillment helpers", () => {
  it("creates tenant-scoped ledger and purchase updates", () => {
    const plan = buildKaiCreditFulfillmentPlan(session, purchase);
    expect(plan?.ledgerInsert).toMatchObject({
      tenantId: 44,
      userId: 7,
      purchaseId: 321,
      type: "purchase",
      creditDelta: 500,
      idempotencyKey: buildKaiCreditLedgerIdempotencyKey(321),
    });
    expect(plan?.purchaseUpdate).toMatchObject({
      status: "paid",
      stripeCheckoutSessionId: "cs_test_kai",
      stripePaymentIntentId: "pi_test",
      stripeCustomerId: "cus_test",
    });
  });

  it("rejects cross-tenant or tampered metadata", () => {
    expect(() =>
      buildKaiCreditFulfillmentPlan(
        {
          ...session,
          metadata: { ...metadata, tenantId: "45" },
        },
        purchase
      )
    ).toThrow(/does not match purchase/);

    expect(() =>
      buildKaiCreditFulfillmentPlan({ ...session, amount_total: 1 }, purchase)
    ).toThrow(/amount mismatch/);
  });

  it("uses one stable ledger idempotency key so duplicate sessions do not double-credit", () => {
    const firstPlan = buildKaiCreditFulfillmentPlan(session, purchase)!;
    const replayPlan = buildKaiCreditFulfillmentPlan(
      { ...session, id: "cs_test_kai_replay" },
      purchase
    )!;
    expect(replayPlan.ledgerIdempotencyKey).toBe(
      firstPlan.ledgerIdempotencyKey
    );

    const applied = new Set<string>();
    const first = applyKaiCreditFulfillmentToBalance(0, firstPlan, applied);
    const replay = applyKaiCreditFulfillmentToBalance(
      first.balance,
      replayPlan,
      applied
    );
    expect(first).toEqual({ balance: 500, credited: true });
    expect(replay).toEqual({ balance: 500, credited: false });
  });
});
