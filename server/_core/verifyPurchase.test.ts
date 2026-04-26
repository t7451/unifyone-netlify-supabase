import { describe, expect, it } from "vitest";
import {
  amountsMatch,
  StripeVerificationError,
  verifyStripeCheckoutSession,
  verifyStripePaymentIntent,
} from "./verifyPurchase";

type IntentClient = Parameters<typeof verifyStripePaymentIntent>[2];
type SessionClient = Parameters<typeof verifyStripeCheckoutSession>[2];

const intentClient = (
  intent:
    | {
        status: string;
        amount: number;
        amount_received?: number;
        currency: string;
      }
    | "throw"
): IntentClient =>
  ({
    paymentIntents: {
      retrieve: async () => {
        if (intent === "throw") throw new Error("nope");
        return intent;
      },
    },
    // The helpers only call paymentIntents.retrieve; mock surface is intentionally narrow.
  }) as unknown as IntentClient;

const sessionClient = (
  session:
    | {
        payment_status: string;
        amount_total: number | null;
        currency: string | null;
        payment_intent?: string | null;
      }
    | "throw"
): SessionClient =>
  ({
    checkout: {
      sessions: {
        retrieve: async () => {
          if (session === "throw") throw new Error("nope");
          return session;
        },
      },
    },
  }) as unknown as SessionClient;

describe("amountsMatch", () => {
  it("matches identical amounts in different forms", () => {
    expect(amountsMatch("12.34", 1234)).toBe(true);
    expect(amountsMatch(12.34, 1234)).toBe(true);
  });

  it("tolerates 1-cent rounding error", () => {
    expect(amountsMatch(0.1 + 0.2, 30)).toBe(true);
  });

  it("rejects mismatched amounts", () => {
    expect(amountsMatch("12.34", 9999)).toBe(false);
    expect(amountsMatch("not a number", 1234)).toBe(false);
  });
});

describe("verifyStripePaymentIntent", () => {
  it("accepts a succeeded intent that matches amount + currency", async () => {
    const intent = await verifyStripePaymentIntent(
      "pi_123",
      { amount: "10.00", currency: "USD" },
      intentClient({
        status: "succeeded",
        amount: 1000,
        amount_received: 1000,
        currency: "usd",
      })
    );
    expect(intent.amount).toBe(1000);
  });

  it("rejects when stripe is not configured", async () => {
    await expect(
      verifyStripePaymentIntent("pi_123", { amount: 10, currency: "USD" }, null)
    ).rejects.toMatchObject({ reason: "stripe_unavailable" });
  });

  it("rejects when retrieve throws", async () => {
    await expect(
      verifyStripePaymentIntent(
        "pi_missing",
        { amount: 10, currency: "USD" },
        intentClient("throw")
      )
    ).rejects.toMatchObject({ reason: "not_found" });
  });

  it("rejects unpaid intents", async () => {
    await expect(
      verifyStripePaymentIntent(
        "pi_x",
        { amount: 10, currency: "USD" },
        intentClient({
          status: "requires_payment_method",
          amount: 1000,
          currency: "usd",
        })
      )
    ).rejects.toMatchObject({ reason: "not_paid" });
  });

  it("rejects amount mismatches", async () => {
    await expect(
      verifyStripePaymentIntent(
        "pi_x",
        { amount: 10, currency: "USD" },
        intentClient({
          status: "succeeded",
          amount: 9999,
          amount_received: 9999,
          currency: "usd",
        })
      )
    ).rejects.toMatchObject({ reason: "amount_mismatch" });
  });

  it("rejects currency mismatches", async () => {
    await expect(
      verifyStripePaymentIntent(
        "pi_x",
        { amount: 10, currency: "USD" },
        intentClient({
          status: "succeeded",
          amount: 1000,
          amount_received: 1000,
          currency: "eur",
        })
      )
    ).rejects.toMatchObject({ reason: "currency_mismatch" });
  });
});

describe("verifyStripeCheckoutSession", () => {
  it("accepts a paid session that matches amount + currency", async () => {
    const session = await verifyStripeCheckoutSession(
      "cs_123",
      { amount: "25.00", currency: "USD" },
      sessionClient({
        payment_status: "paid",
        amount_total: 2500,
        currency: "usd",
        payment_intent: "pi_abc",
      })
    );
    expect(session.amount_total).toBe(2500);
  });

  it("rejects unpaid sessions", async () => {
    await expect(
      verifyStripeCheckoutSession(
        "cs_x",
        { amount: 25, currency: "USD" },
        sessionClient({
          payment_status: "unpaid",
          amount_total: 2500,
          currency: "usd",
        })
      )
    ).rejects.toMatchObject({ reason: "not_paid" });
  });

  it("rejects amount mismatches", async () => {
    await expect(
      verifyStripeCheckoutSession(
        "cs_x",
        { amount: 25, currency: "USD" },
        sessionClient({
          payment_status: "paid",
          amount_total: 1,
          currency: "usd",
        })
      )
    ).rejects.toMatchObject({ reason: "amount_mismatch" });
  });

  it("rejects sessions with null amount_total", async () => {
    await expect(
      verifyStripeCheckoutSession(
        "cs_x",
        { amount: 25, currency: "USD" },
        sessionClient({
          payment_status: "paid",
          amount_total: null,
          currency: "usd",
        })
      )
    ).rejects.toMatchObject({ reason: "amount_mismatch" });
  });

  it("rejects currency mismatches", async () => {
    await expect(
      verifyStripeCheckoutSession(
        "cs_x",
        { amount: 25, currency: "USD" },
        sessionClient({
          payment_status: "paid",
          amount_total: 2500,
          currency: "eur",
        })
      )
    ).rejects.toMatchObject({ reason: "currency_mismatch" });
  });

  it("surfaces a typed error instance", async () => {
    try {
      await verifyStripeCheckoutSession(
        "cs_x",
        { amount: 25, currency: "USD" },
        sessionClient("throw")
      );
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(StripeVerificationError);
    }
  });
});
