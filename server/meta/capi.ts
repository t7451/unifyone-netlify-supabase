/**
 * UnifyOne — Meta Conversions API (CAPI) Helper
 * ================================================
 * Server-side event relay to Meta CAPI for deduplication with client-side Pixel.
 * Ported and adapted from Pnw_Meta_Platform_v1.1/lib/meta/capi.ts
 *
 * Required env vars:
 *   META_PIXEL_ID          — Your Meta Pixel ID
 *   META_CAPI_ACCESS_TOKEN — System User access token from Meta Business Manager
 */

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CAPIUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  externalId?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string; // _fbp cookie
  fbc?: string; // _fbc cookie
}

export interface CAPIEventPayload {
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  userData?: CAPIUserData;
  customData?: Record<string, unknown>;
  eventTime?: number;
}

export interface CAPIResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: { message: string; code: number };
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function hashUserData(userData: CAPIUserData): Record<string, unknown> {
  const hashed: Record<string, unknown> = {};

  if (userData.email) hashed.em = sha256(userData.email);
  if (userData.phone) hashed.ph = sha256(userData.phone.replace(/\D/g, ""));
  if (userData.firstName) hashed.fn = sha256(userData.firstName);
  if (userData.lastName) hashed.ln = sha256(userData.lastName);
  if (userData.externalId) hashed.external_id = sha256(userData.externalId);

  // These are passed raw (not hashed per Meta spec)
  if (userData.clientIp) hashed.client_ip_address = userData.clientIp;
  if (userData.userAgent) hashed.client_user_agent = userData.userAgent;
  if (userData.fbp) hashed.fbp = userData.fbp;
  if (userData.fbc) hashed.fbc = userData.fbc;

  return hashed;
}

// ─── Core Send Function ───────────────────────────────────────────────────────

export async function sendCAPIEvent(payload: CAPIEventPayload): Promise<CAPIResponse> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn("[CAPI] META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not configured — skipping");
    return { messages: ["CAPI not configured"] };
  }

  const eventData: Record<string, unknown> = {
    event_name: payload.eventName,
    event_id: payload.eventId,
    event_time: payload.eventTime ?? Math.floor(Date.now() / 1000),
    event_source_url: payload.eventSourceUrl,
    action_source: "website",
  };

  if (payload.userData && Object.keys(payload.userData).length > 0) {
    eventData.user_data = hashUserData(payload.userData);
  }

  if (payload.customData && Object.keys(payload.customData).length > 0) {
    eventData.custom_data = payload.customData;
  }

  const body = {
    data: [eventData],
    test_event_code: process.env.META_TEST_EVENT_CODE, // optional, for testing
  };

  try {
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as CAPIResponse;

    if (!response.ok) {
      console.error("[CAPI] API error:", result);
    } else {
      console.log(`[CAPI] Event sent: ${payload.eventName} (id: ${payload.eventId})`);
    }

    return result;
  } catch (err) {
    console.error("[CAPI] Network error:", err);
    return { messages: ["Network error sending CAPI event"] };
  }
}

// ─── Typed Event Helpers ──────────────────────────────────────────────────────

export const capi = {
  /** PageView — fires on page load */
  pageView: (eventId: string, userData: CAPIUserData, url: string) =>
    sendCAPIEvent({ eventName: "PageView", eventId, eventSourceUrl: url, userData }),

  /** Lead — fires on form submission / contact request */
  lead: (eventId: string, userData: CAPIUserData, url: string, contentName?: string) =>
    sendCAPIEvent({
      eventName: "Lead",
      eventId,
      eventSourceUrl: url,
      userData,
      customData: contentName ? { content_name: contentName } : undefined,
    }),

  /** CompleteRegistration — fires on user signup */
  completeRegistration: (eventId: string, userData: CAPIUserData, url: string) =>
    sendCAPIEvent({
      eventName: "CompleteRegistration",
      eventId,
      eventSourceUrl: url,
      userData,
      customData: { status: "registered" },
    }),

  /** Purchase — fires on successful payment */
  purchase: (eventId: string, userData: CAPIUserData, url: string, value: number, currency = "USD") =>
    sendCAPIEvent({
      eventName: "Purchase",
      eventId,
      eventSourceUrl: url,
      userData,
      customData: { value, currency },
    }),

  /** Custom: RewardsKeyEarned — fires when user earns Rewards Keys credits */
  rewardsKeyEarned: (
    eventId: string,
    userData: CAPIUserData,
    url: string,
    credits: number,
    source: string
  ) =>
    sendCAPIEvent({
      eventName: "RewardsKeyEarned",
      eventId,
      eventSourceUrl: url,
      userData,
      customData: {
        credits,
        source,
        value: parseFloat((credits * 0.01).toFixed(2)),
        currency: "USD",
      },
    }),

  /** Custom: AppDownloadIntent — fires when user clicks app CTA */
  appDownloadIntent: (eventId: string, userData: CAPIUserData, url: string, platform: string) =>
    sendCAPIEvent({
      eventName: "AppDownloadIntent",
      eventId,
      eventSourceUrl: url,
      userData,
      customData: { platform },
    }),
};
