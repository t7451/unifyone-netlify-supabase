import { describe, expect, it } from "vitest";
import {
  buildManualPaymentUrl,
  getAvailablePaymentProviders,
  getProviderOrder,
  isPaymentProviderConfigured,
  normalizeCheckoutOrigin,
} from "./paymentFallback";

describe("payment fallback provider selection", () => {
  it("uses Stripe, Square, PayPal, then manual by default", () => {
    expect(getProviderOrder()).toEqual([
      "stripe",
      "square",
      "paypal",
      "manual",
    ]);
  });

  it("honors preferred provider without duplicating it", () => {
    expect(getProviderOrder("paypal")).toEqual([
      "paypal",
      "stripe",
      "square",
      "manual",
    ]);
  });

  it("filters unavailable providers and keeps manual enabled by default", () => {
    const env = {
      STRIPE_SECRET_KEY: "sk_live_test",
      SQUARE_ACCESS_TOKEN: "sq-token",
      SQUARE_LOCATION_ID: "loc",
      PAYMENT_PROVIDER_ORDER: "paypal,square,stripe,manual",
    } as NodeJS.ProcessEnv;

    expect(getAvailablePaymentProviders(null, env)).toEqual([
      "square",
      "stripe",
      "manual",
    ]);
  });

  it("supports disabling any provider from env", () => {
    const env = {
      STRIPE_SECRET_KEY: "sk_live_test",
      SQUARE_ACCESS_TOKEN: "sq-token",
      SQUARE_LOCATION_ID: "loc",
      PAYPAL_CLIENT_ID: "pp-client",
      PAYPAL_CLIENT_SECRET: "pp-secret",
      PAYMENT_PROVIDER_DISABLED: "stripe,manual",
    } as NodeJS.ProcessEnv;

    expect(isPaymentProviderConfigured("stripe", env)).toBe(false);
    expect(isPaymentProviderConfigured("manual", env)).toBe(false);
    expect(getAvailablePaymentProviders(null, env)).toEqual([
      "square",
      "paypal",
    ]);
  });
});

describe("manual payment fallback URL", () => {
  it("builds a contact-based invoice request URL when no manual URL is set", () => {
    const url = new URL(
      buildManualPaymentUrl({
        origin: "https://app.test",
        planSlug: "pro",
        amountCents: 2900,
        description: "UnifyOne Pro Plan (monthly)",
        billingPeriod: "monthly",
        env: {},
      })
    );

    expect(url.origin).toBe("https://app.test");
    expect(url.pathname).toBe("/contact");
    expect(url.searchParams.get("intent")).toBe("manual-payment");
    expect(url.searchParams.get("plan")).toBe("pro");
    expect(url.searchParams.get("amount")).toBe("29.00");
    expect(url.searchParams.get("currency")).toBe("USD");
  });

  it("can target an external manual payment URL", () => {
    const url = new URL(
      buildManualPaymentUrl({
        origin: "https://app.test",
        planSlug: "agency",
        amountCents: 19900,
        env: { MANUAL_PAYMENT_URL: "https://billing.test/pay" },
      })
    );

    expect(url.origin).toBe("https://billing.test");
    expect(url.pathname).toBe("/pay");
    expect(url.searchParams.get("plan")).toBe("agency");
  });
});

describe("checkout origin normalization", () => {
  it("keeps only the origin for valid web URLs", () => {
    expect(normalizeCheckoutOrigin("https://app.test/path?x=1")).toBe(
      "https://app.test"
    );
    expect(normalizeCheckoutOrigin("http://localhost:5173/checkout")).toBe(
      "http://localhost:5173"
    );
  });

  it("rejects invalid or non-web origins", () => {
    expect(() => normalizeCheckoutOrigin("not a url")).toThrow(/valid URL/);
    expect(() => normalizeCheckoutOrigin("javascript:alert(1)")).toThrow(
      /http or https/
    );
  });
});
