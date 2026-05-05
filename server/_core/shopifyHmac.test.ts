import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyOAuthCallbackHmac,
  verifyWebhookHmac,
  verifyAppProxySignature,
  isValidShopDomain,
} from "./shopifyHmac";

const SECRET = "shpss_test_secret_for_unit_tests_only";

describe("shopifyHmac", () => {
  let origSecret: string | undefined;
  beforeEach(() => {
    origSecret = process.env.SHOPIFY_API_SECRET;
    process.env.SHOPIFY_API_SECRET = SECRET;
  });
  afterEach(() => {
    process.env.SHOPIFY_API_SECRET = origSecret;
  });

  describe("verifyOAuthCallbackHmac", () => {
    it("accepts a valid signature", () => {
      const params = {
        code: "abc",
        shop: "demo.myshopify.com",
        state: "xyz",
        timestamp: "1700000000",
      };
      const sorted = Object.keys(params)
        .sort()
        .map(k => `${k}=${(params as Record<string, string>)[k]}`)
        .join("&");
      const hmac = createHmac("sha256", SECRET).update(sorted).digest("hex");
      expect(verifyOAuthCallbackHmac({ ...params, hmac })).toBe(true);
    });
    it("rejects when hmac param missing", () => {
      expect(verifyOAuthCallbackHmac({ shop: "demo.myshopify.com" })).toBe(
        false
      );
    });
    it("rejects when secret is empty", () => {
      process.env.SHOPIFY_API_SECRET = "";
      expect(
        verifyOAuthCallbackHmac({ shop: "x", hmac: "00".repeat(32) })
      ).toBe(false);
    });
    it("rejects a mutated parameter", () => {
      const params = {
        code: "abc",
        shop: "demo.myshopify.com",
        state: "xyz",
      };
      const sorted = Object.keys(params)
        .sort()
        .map(k => `${k}=${(params as Record<string, string>)[k]}`)
        .join("&");
      const hmac = createHmac("sha256", SECRET).update(sorted).digest("hex");
      expect(verifyOAuthCallbackHmac({ ...params, code: "abd", hmac })).toBe(
        false
      );
    });
    it("rejects malformed hex", () => {
      expect(verifyOAuthCallbackHmac({ shop: "x", hmac: "not-hex-!!" })).toBe(
        false
      );
    });
  });

  describe("verifyWebhookHmac", () => {
    it("accepts a valid signature on the raw body", () => {
      const body = Buffer.from(JSON.stringify({ id: 123 }));
      const hmac = createHmac("sha256", SECRET).update(body).digest("base64");
      expect(verifyWebhookHmac(body, hmac)).toBe(true);
    });
    it("rejects a missing header", () => {
      expect(verifyWebhookHmac(Buffer.from("{}"), null)).toBe(false);
      expect(verifyWebhookHmac(Buffer.from("{}"), undefined)).toBe(false);
    });
    it("rejects when secret is empty", () => {
      process.env.SHOPIFY_API_SECRET = "";
      const body = Buffer.from("{}");
      const hmac = createHmac("sha256", "wrong").update(body).digest("base64");
      expect(verifyWebhookHmac(body, hmac)).toBe(false);
    });
    it("rejects a mutated body", () => {
      const body = Buffer.from(JSON.stringify({ id: 123 }));
      const hmac = createHmac("sha256", SECRET).update(body).digest("base64");
      expect(
        verifyWebhookHmac(Buffer.from(JSON.stringify({ id: 124 })), hmac)
      ).toBe(false);
    });
    it("rejects malformed base64 of wrong length", () => {
      expect(verifyWebhookHmac(Buffer.from("{}"), "AA==")).toBe(false);
    });
  });

  describe("verifyAppProxySignature", () => {
    it("accepts a valid signature (no-separator concatenation)", () => {
      const params = {
        logged_in_customer_id: "1",
        shop: "demo.myshopify.com",
        path_prefix: "/apps/foo",
      };
      const concat = Object.keys(params)
        .sort()
        .map(k => `${k}=${(params as Record<string, string>)[k]}`)
        .join("");
      const signature = createHmac("sha256", SECRET)
        .update(concat)
        .digest("hex");
      expect(verifyAppProxySignature({ ...params, signature })).toBe(true);
    });
  });

  describe("isValidShopDomain", () => {
    it.each([
      ["demo.myshopify.com", true],
      ["my-store.myshopify.com", true],
      ["1commerce.myshopify.com", true],
      ["DEMO.myshopify.com", true],
      ["evil.com", false],
      ["evil.myshopify.com.attacker.com", false],
      ["demo.myshopify.com/admin", false],
      ["", false],
      ["-leading-dash.myshopify.com", false],
    ])("isValidShopDomain(%j) → %j", (input, expected) => {
      expect(isValidShopDomain(input)).toBe(expected);
    });
  });
});
