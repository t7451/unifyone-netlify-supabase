/**
 * Shopify HMAC verifiers — single source of truth, isolated for unit testing.
 * All comparisons timing-safe.
 *  - OAuth callback: hex HMAC-SHA256 over "&"-joined sorted "key=value" params (excluding hmac).
 *  - Webhooks: base64 HMAC-SHA256 over raw request body.
 *  - App Proxy: hex HMAC-SHA256 over sorted concatenated "key=value" params (no separator).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  return process.env.SHOPIFY_API_SECRET ?? "";
}

function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length === 0 || ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function safeEqualB64(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const ab = Buffer.from(a, "base64");
    const bb = Buffer.from(b, "base64");
    if (ab.length === 0 || ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function verifyOAuthCallbackHmac(
  query: Record<string, string>
): boolean {
  const secret = getSecret();
  if (!secret) {
    console.error(
      "[shopifyHmac] SHOPIFY_API_SECRET missing — rejecting OAuth callback"
    );
    return false;
  }
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join("&");
  return safeEqualHex(
    createHmac("sha256", secret).update(message).digest("hex"),
    hmac
  );
}

export function verifyWebhookHmac(
  rawBody: Buffer,
  hmacHeader: string | null | undefined
): boolean {
  const secret = getSecret();
  if (!secret) {
    console.error(
      "[shopifyHmac] SHOPIFY_API_SECRET missing — rejecting webhook"
    );
    return false;
  }
  if (!hmacHeader) return false;
  return safeEqualB64(
    createHmac("sha256", secret).update(rawBody).digest("base64"),
    hmacHeader
  );
}

export function verifyAppProxySignature(
  query: Record<string, string>
): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const { signature, ...rest } = query;
  if (!signature) return false;
  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join("");
  return safeEqualHex(
    createHmac("sha256", secret).update(message).digest("hex"),
    signature
  );
}

export function isValidShopDomain(shop: string): boolean {
  if (!shop || typeof shop !== "string") return false;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop.toLowerCase());
}
