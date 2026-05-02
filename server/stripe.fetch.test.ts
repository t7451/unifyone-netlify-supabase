import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";

/**
 * Stripe fetch-handler integration tests.
 *
 * These tests exercise the new registerStripeFetchRoutes handler that was
 * added to fix the production 404 on /api/stripe/webhook (every Stripe
 * request was falling through to tRPC because the previous export was a
 * `null` stub).
 *
 * We sign a real webhook payload with HMAC-SHA256 the same way Stripe does,
 * then assert the handler verifies the signature and returns 200.
 */

const TEST_WEBHOOK_SECRET = "whsec_test_" + "0".repeat(40);

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  // A non-empty key so the module-level Stripe instance constructs.
  // Webhook signature verification is pure crypto — it does not call the API.
  if (!process.env.STRIPE_SECRET_KEY) {
    process.env.STRIPE_SECRET_KEY = "sk_test_" + "0".repeat(40);
  }
});

function signStripePayload(
  payload: string,
  secret: string,
  timestamp?: number
) {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  return `t=${ts},v1=${signature}`;
}

describe("registerStripeFetchRoutes — webhook", () => {
  it("returns null for unrelated paths (falls through to tRPC)", async () => {
    const { registerStripeFetchRoutes } = await import("./stripe");
    const req = new Request("https://example.test/api/trpc/products.list", {
      method: "POST",
    });
    const res = await registerStripeFetchRoutes(req);
    expect(res).toBeNull();
  });

  it("rejects POST /api/stripe/webhook with no signature header (400)", async () => {
    const { registerStripeFetchRoutes } = await import("./stripe");
    const req = new Request("https://example.test/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({ id: "evt_test_x", type: "ping" }),
    });
    const res = await registerStripeFetchRoutes(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
    const body = (await res!.json()) as { error: string };
    expect(body.error).toMatch(/signature/i);
  });

  it("rejects POST /api/stripe/webhook with a bad signature (400)", async () => {
    const { registerStripeFetchRoutes } = await import("./stripe");
    const payload = JSON.stringify({ id: "evt_test_x", type: "ping" });
    const req = new Request("https://example.test/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=deadbeef",
        "content-type": "application/json",
      },
      body: payload,
    });
    const res = await registerStripeFetchRoutes(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("accepts POST /api/stripe/webhook with a valid test-event signature (200, verified)", async () => {
    const { registerStripeFetchRoutes } = await import("./stripe");
    const payload = JSON.stringify({
      id: "evt_test_signature_check",
      object: "event",
      type: "ping",
      data: { object: {} },
    });
    const sig = signStripePayload(payload, TEST_WEBHOOK_SECRET);
    const req = new Request("https://example.test/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": sig,
        "content-type": "application/json",
      },
      body: payload,
    });
    const res = await registerStripeFetchRoutes(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(200);
    const body = (await res!.json()) as {
      verified?: boolean;
      received?: boolean;
    };
    // Test events (evt_test_*) short-circuit to {verified: true}; live events
    // would return {received: true}. Either is a successful verification.
    expect(body.verified === true || body.received === true).toBe(true);
  });
});

describe("registerStripeFetchRoutes — non-webhook routes", () => {
  it("returns 400 for /api/stripe/create-checkout with no body fields", async () => {
    const { registerStripeFetchRoutes } = await import("./stripe");
    const req = new Request("https://example.test/api/stripe/create-checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const res = await registerStripeFetchRoutes(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("returns 400 for /api/stripe/create-embedded-checkout with no priceId", async () => {
    const { registerStripeFetchRoutes } = await import("./stripe");
    const req = new Request(
      "https://example.test/api/stripe/create-embedded-checkout",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }
    );
    const res = await registerStripeFetchRoutes(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("returns 400 for /api/stripe/customer-portal with no customerId", async () => {
    const { registerStripeFetchRoutes } = await import("./stripe");
    const req = new Request("https://example.test/api/stripe/customer-portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const res = await registerStripeFetchRoutes(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("returns 400 for /api/stripe/cancel-subscription with no subscriptionId", async () => {
    const { registerStripeFetchRoutes } = await import("./stripe");
    const req = new Request(
      "https://example.test/api/stripe/cancel-subscription",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }
    );
    const res = await registerStripeFetchRoutes(req);
    expect(res!.status).toBe(400);
  });

  it("returns 400 for /api/stripe/change-plan missing fields", async () => {
    const { registerStripeFetchRoutes } = await import("./stripe");
    const req = new Request("https://example.test/api/stripe/change-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscriptionId: "sub_x" }),
    });
    const res = await registerStripeFetchRoutes(req);
    expect(res!.status).toBe(400);
  });

  it("rejects /api/stripe/flush-overages without admin key when ADMIN_API_KEY is set", async () => {
    process.env.ADMIN_API_KEY = "admin-secret-test";
    const { registerStripeFetchRoutes } = await import("./stripe");
    const req = new Request("https://example.test/api/stripe/flush-overages", {
      method: "POST",
    });
    const res = await registerStripeFetchRoutes(req);
    expect(res!.status).toBe(401);
    delete process.env.ADMIN_API_KEY;
  });
});
