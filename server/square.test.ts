/**
 * server/square.test.ts
 *
 * Unit tests for Square helpers — no live API calls, no DB.
 * Verifies HMAC signature verification + Fetch route shape.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

vi.mock("./db", () => ({
  getDb: async () => null,
  getOrderById: async () => null,
  getTenantById: async () => null,
  getTenantsByOwner: async () => [],
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    verifySession: async () => null,
  },
}));

import { __internal__, registerSquareFetchRoutes } from "./square";

const { expectedSquareSignature, verifySquareSignature, squareConfigured } =
  __internal__;

describe("expectedSquareSignature", () => {
  it("matches the documented HMAC-SHA256 over (notification_url + body) base64", () => {
    const url = "https://example.com/api/square/webhook";
    const body = JSON.stringify({
      event_id: "abc-123",
      type: "payment.created",
    });
    const key = "sq-test-key";
    const expected = crypto
      .createHmac("sha256", key)
      .update(url + body)
      .digest("base64");
    expect(expectedSquareSignature(url, body, key)).toBe(expected);
  });
});

describe("verifySquareSignature", () => {
  const url = "https://app.test/api/square/webhook";
  const body = JSON.stringify({ event_id: "evt-1", type: "payment.updated" });
  const key = "real-key-abc";

  it("returns true on a correctly signed payload", () => {
    const sig = expectedSquareSignature(url, body, key);
    expect(
      verifySquareSignature({
        notificationUrl: url,
        rawBody: body,
        signatureHeader: sig,
        signatureKey: key,
      })
    ).toBe(true);
  });

  it("returns false on a mismatched signature", () => {
    expect(
      verifySquareSignature({
        notificationUrl: url,
        rawBody: body,
        signatureHeader: "this-is-not-the-right-signature-at-all",
        signatureKey: key,
      })
    ).toBe(false);
  });

  it("returns false when signature header is empty", () => {
    expect(
      verifySquareSignature({
        notificationUrl: url,
        rawBody: body,
        signatureHeader: "",
        signatureKey: key,
      })
    ).toBe(false);
  });

  it("returns false when signature key is empty (fail-closed)", () => {
    const sig = expectedSquareSignature(url, body, key);
    expect(
      verifySquareSignature({
        notificationUrl: url,
        rawBody: body,
        signatureHeader: sig,
        signatureKey: "",
      })
    ).toBe(false);
  });

  it("rejects when body is mutated (whitespace etc.)", () => {
    const sig = expectedSquareSignature(url, body, key);
    expect(
      verifySquareSignature({
        notificationUrl: url,
        rawBody: body + " ",
        signatureHeader: sig,
        signatureKey: key,
      })
    ).toBe(false);
  });

  it("rejects when notification URL doesn't match what was signed", () => {
    const sig = expectedSquareSignature(url, body, key);
    expect(
      verifySquareSignature({
        notificationUrl: "https://attacker.test/api/square/webhook",
        rawBody: body,
        signatureHeader: sig,
        signatureKey: key,
      })
    ).toBe(false);
  });
});

describe("registerSquareFetchRoutes", () => {
  const origEnv = {
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    locationId: process.env.SQUARE_LOCATION_ID,
    sigKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    adminKey: process.env.ADMIN_API_KEY,
  };

  beforeEach(() => {
    delete process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_LOCATION_ID;
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    delete process.env.ADMIN_API_KEY;
  });

  afterEach(() => {
    process.env.SQUARE_ACCESS_TOKEN = origEnv.accessToken ?? "";
    process.env.SQUARE_LOCATION_ID = origEnv.locationId ?? "";
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = origEnv.sigKey ?? "";
    process.env.ADMIN_API_KEY = origEnv.adminKey ?? "";
    if (!origEnv.accessToken) delete process.env.SQUARE_ACCESS_TOKEN;
    if (!origEnv.locationId) delete process.env.SQUARE_LOCATION_ID;
    if (!origEnv.sigKey) delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!origEnv.adminKey) delete process.env.ADMIN_API_KEY;
  });

  it("returns 503 from create-checkout when Square is not configured", async () => {
    expect(squareConfigured()).toBe(false);
    const req = new Request("https://app.test/api/square/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 10 }),
    });
    const resp = await registerSquareFetchRoutes(req);
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(503);
  });

  it("returns 503 from webhook when SQUARE_WEBHOOK_SIGNATURE_KEY is unset", async () => {
    const body = JSON.stringify({ event_id: "x", type: "payment.created" });
    const req = new Request("https://app.test/api/square/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const resp = await registerSquareFetchRoutes(req);
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(503);
  });

  it("returns 400 from webhook on bad signature", async () => {
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "real-key";
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL =
      "https://app.test/api/square/webhook";
    const body = JSON.stringify({ event_id: "x", type: "payment.created" });
    const req = new Request("https://app.test/api/square/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-square-hmacsha256-signature": "not-the-right-sig",
      },
      body,
    });
    const resp = await registerSquareFetchRoutes(req);
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(400);
    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  });

  it("returns 200 from webhook on valid signature (handler graceful when DB null)", async () => {
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "real-key";
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL =
      "https://app.test/api/square/webhook";
    const body = JSON.stringify({
      event_id: "evt-good",
      type: "payment.updated",
      data: { object: { payment: { id: "p1", status: "PENDING" } } },
    });
    const sig = expectedSquareSignature(
      "https://app.test/api/square/webhook",
      body,
      "real-key"
    );
    const req = new Request("https://app.test/api/square/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-square-hmacsha256-signature": sig,
      },
      body,
    });
    const resp = await registerSquareFetchRoutes(req);
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(200);
    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  });

  it("admin/discover requires x-admin-key", async () => {
    process.env.SQUARE_ACCESS_TOKEN = "tok";
    process.env.SQUARE_LOCATION_ID = "L1";
    process.env.ADMIN_API_KEY = "real-admin-key";
    const req = new Request("https://app.test/api/square/admin/discover", {
      method: "POST",
    });
    const resp = await registerSquareFetchRoutes(req);
    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(401);
  });

  it("returns null for unknown /api/square/* paths so tRPC falls through", async () => {
    process.env.SQUARE_ACCESS_TOKEN = "tok";
    process.env.SQUARE_LOCATION_ID = "L1";
    const req = new Request("https://app.test/api/square/unknown", {
      method: "POST",
    });
    const resp = await registerSquareFetchRoutes(req);
    expect(resp).toBeNull();
  });
});
