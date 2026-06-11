import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "./stripeClient";

describe("Stripe API version pin", () => {
  it("matches the version shipped by the installed Stripe SDK", () => {
    // Pinning a version the SDK/account doesn't recognize makes Stripe reject
    // every request — the root cause of payment links returning errors.
    const sdkVersion = new Stripe("sk_test_x", {
      apiVersion: STRIPE_API_VERSION,
    }).getApiField("version");
    expect(sdkVersion).toBe(STRIPE_API_VERSION);
  });
});
