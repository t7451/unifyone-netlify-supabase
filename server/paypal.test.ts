/**
 * server/paypal.test.ts
 *
 * Unit tests for PayPal helpers — no live API calls, no DB.
 * Verifies pure utilities + Fetch route shape (config gating, auth, etc.).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the DB module — no real DB connection in this test runner.
vi.mock("./db", () => ({
  getDb: async () => null,
  getOrderById: async () => null,
  getTenantById: async () => null,
  getTenantsByOwner: async () => [],
}));

// Mock SDK so JWT verification short-circuits without secrets.
vi.mock("./_core/sdk", () => ({
  sdk: {
    verifySession: async () => null,
  },
}));

import {
  __internal__,
  registerPayPalFetchRoutes,
  verifyPayPalWebhookSignature,
} from "./paypal";

const { parseCustomId, paypalConfigured } = __internal__;

describe("parseCustomId", () => {
  it("returns all-null for empty/missing input", () => {
    expect(parseCustomId(null)).toEqual({
      internalOrderId: null,
      tenantId: null,
      userId: null,
      imClickId: null,
    });
    expect(parseCustomId("")).toEqual({
      internalOrderId: null,
      tenantId: null,
      userId: null,
      imClickId: null,
    });
  });

  it("parses fully-populated custom_id", () => {
    expect(parseCustomId("oid=42;tid=7;uid=99;imc=abcd")).toEqual({
      internalOrderId: 42,
      tenantId: 7,
      userId: 99,
      imClickId: "abcd",
    });
  });

  it("handles partial / out-of-order keys", () => {
    expect(parseCustomId("uid=12;imc=hex123")).toEqual({
      internalOrderId: null,
      tenantId: null,
      userId: 12,
      imClickId: "hex123",
    });
  });

  it("ignores non-numeric values for numeric keys", () => {
    expect(parseCustomId("oid=foo;tid=bar")).toEqual({
      internalOrderId: null,
      tenantId: null,
      userId: null,
      imClickId: null,
    });
  });
});

describe("verifyPayPalWebhookSignature — fail-closed", () => {
  const origEnv = process.env.PAYPAL_WEBHOOK_ID;
  beforeEach(() => {
    delete process.env.PAYPAL_WEBHOOK_ID;
  });
  afterEach(() => {
    if (origEnv === undefined) delete process.env.PAYPAL_WEBHOOK_ID;
    else process.env.PAYPAL_WEBHOOK_ID = origEnv;
  });

  it("returns false when PAYPAL_WEBHOOK_ID is unset", async () => {
    const ok = await verifyPayPalWebhookSignature({
      headers: {
        "paypal-transmission-id": "x",
        "paypal-transmission-time": "2025-01-01T00:00:00Z",
        "paypal-transmission-sig": "x",
        "paypal-cert-url": "https://api.paypal.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
      },
      rawBody: '{"id":"evt-1"}',
    });
    expect(ok).toBe(false);
  });

  it("returns false when required headers are missing", async () => {
    process.env.PAYPAL_WEBHOOK_ID = "WH-TEST";
    const ok = await verifyPayPalWebhookSignature({
      headers: {},
      rawBody: '{"id":"evt-1"}',
    });
    expect(ok).toBe(false);
  });

  it("returns false on malformed JSON body", async () => {
    process.env.PAYPAL_WEBHOOK_ID = "WH-TEST";
    const ok = await verifyPayPalWebhookSignature({
      headers: {
        "paypal-transmission-id": "x",
        "paypal-transmission-time": "2025-01-01T00:00:00Z",
        "paypal-transmission-sig": "x",
        "paypal-cert-url": "https://api.paypal.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
      },
      rawBody: "not-json{",
    });
    expect(ok).toBe(false);
  });
});

describe("registerPayPalFetchRoutes", () => {
  const origCreds = {
    id: process.env.PAYPAL_CLIENT_ID,
    secret: process.env.PAYPAL_CLIENT_SECRET,
  };
  afterEach(() => {
    process.env.PAYPAL_CLIENT_ID = origCreds.id ?? "";
    process.env.PAYPAL_CLIENT_SECRET = origCreds.secret ?? "";
    if (!origCreds.id) delete process.env.PAYPAL_CLIENT_ID;
    if (!origCreds.secret) delete process.env.PAYPAL_CLIENT_SECRET;
  });

  it("returns 503 from create-order when PayPal is not configured", async () => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    expect(paypalConfigured()).toBe(false);
    const req = new Request("https://app.test/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 10 }),
    });
    const resp = await registerPayPalFetchRoutes(req);
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(503);
  });

  it("returns 401 from create-order when no JWT cookie", async () => {
    process.env.PAYPAL_CLIENT_ID = "PP_X";
    process.env.PAYPAL_CLIENT_SECRET = "PP_Y";
    const req = new Request("https://app.test/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 10 }),
    });
    const resp = await registerPayPalFetchRoutes(req);
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(401);
  });

  it("returns 401 from capture-order when no JWT cookie", async () => {
    process.env.PAYPAL_CLIENT_ID = "PP_X";
    process.env.PAYPAL_CLIENT_SECRET = "PP_Y";
    const req = new Request("https://app.test/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId: "ORD-1" }),
    });
    const resp = await registerPayPalFetchRoutes(req);
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(401);
  });

  it("admin/discover requires x-admin-key", async () => {
    process.env.PAYPAL_CLIENT_ID = "PP_X";
    process.env.PAYPAL_CLIENT_SECRET = "PP_Y";
    process.env.ADMIN_API_KEY = "secret-key-1";
    const req = new Request("https://app.test/api/paypal/admin/discover", {
      method: "POST",
    });
    const resp = await registerPayPalFetchRoutes(req);
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(401);
  });

  it("returns null for unknown /api/paypal/* paths so tRPC falls through", async () => {
    process.env.PAYPAL_CLIENT_ID = "PP_X";
    process.env.PAYPAL_CLIENT_SECRET = "PP_Y";
    const req = new Request("https://app.test/api/paypal/unknown-thing", {
      method: "POST",
    });
    const resp = await registerPayPalFetchRoutes(req);
    expect(resp).toBeNull();
  });
});

// Live credential smoke tests — keep the ones from the original file gated.
const hasPayPalCredentials =
  !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET;

describe("PayPal credential smoke", () => {
  it.skipIf(!hasPayPalCredentials)(
    "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are both set",
    () => {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      expect(clientId).toBeTruthy();
      expect(clientSecret).toBeTruthy();
      expect(clientId!.length).toBeGreaterThan(10);
      expect(clientSecret!.length).toBeGreaterThan(10);
    }
  );

  it.skipIf(!hasPayPalCredentials)(
    "VITE_PAYPAL_CLIENT_ID matches PAYPAL_CLIENT_ID for browser SDK parity",
    () => {
      const viteClientId = process.env.VITE_PAYPAL_CLIENT_ID;
      expect(viteClientId).toBeTruthy();
      expect(viteClientId).toBe(process.env.PAYPAL_CLIENT_ID);
    }
  );
});
