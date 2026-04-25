import { createHmac } from "node:crypto";
import type { BusinessProfile } from "../../lib/business-profile.js";

// CAN-SPAM: every commercial email must carry a physical address and a
// working unsubscribe link. The token is HMAC-signed so the public unsubscribe
// page can verify it without auth.

export function suppressionToken(email: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest("hex")
    .slice(0, 32);
}

export function verifySuppressionToken(
  email: string,
  token: string,
  secret: string
): boolean {
  const expected = suppressionToken(email, secret);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export interface FooterInput {
  profile: BusinessProfile;
  recipientEmail: string;
  hmacSecret: string;
  /** Public site that hosts /unsubscribe. */
  unsubscribeBaseUrl?: string;
}

export function buildCanSpamFooter({
  profile,
  recipientEmail,
  hmacSecret,
  unsubscribeBaseUrl = "https://1commerce.online",
}: FooterInput): string {
  const token = suppressionToken(recipientEmail, hmacSecret);
  const params = new URLSearchParams({ e: recipientEmail, t: token });
  const url = `${unsubscribeBaseUrl}/unsubscribe?${params.toString()}`;
  const addrLine2 =
    profile.address.line_2 && profile.address.line_2.trim().length > 0
      ? `, ${profile.address.line_2}`
      : "";
  return [
    "",
    "—",
    `Sent from ${profile.legal.name}`,
    `${profile.address.line_1}${addrLine2}, ${profile.address.city}, ${profile.address.region} ${profile.address.postal_code}`,
    `This is a one-time outreach email. To never hear from us again: ${url}`,
  ].join("\n");
}
