/**
 * server/payments/paypal/client.ts
 *
 * PayPal REST HTTP init: API base URL, OAuth access-token minting, and the
 * configuration gate. Relocated verbatim from server/paypal.ts — identical
 * PayPal API calls.
 */

export const PAYPAL_BASE =
  process.env.PAYPAL_API_BASE_URL || "https://api-m.paypal.com";

// ─── PayPal REST helpers ───────────────────────────────────────────────────
export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      `PayPal auth failed: ${data.error_description || data.error}`
    );
  }

  return data.access_token as string;
}

export function paypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}
