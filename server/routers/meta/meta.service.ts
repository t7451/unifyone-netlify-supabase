import { sendCAPIEvent, capi, type CAPIUserData } from "../../meta/capi";
import type { CAPIResponse } from "../../meta/capi";
import { getAppUrl } from "../../_core/env";
import {
  insertPixelEvent,
  listAllEvents,
  listEventsForUser,
  selectAllEvents,
} from "./meta.repo";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build CAPIUserData from request headers (IP + User-Agent) for public/anonymous callers.
 */
export function buildUserDataFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  extra?: Partial<CAPIUserData>
): CAPIUserData {
  return {
    ...extra,
    clientIp:
      (headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      (headers["x-real-ip"] as string) ??
      undefined,
    userAgent: (headers["user-agent"] as string) ?? undefined,
  };
}

/**
 * Fire a CAPI call, log to DB, and return a standard { success, status } shape.
 * Centralises the try/catch + insert pattern shared by every CAPI mutation.
 */
export async function fireAndLogCAPIEvent(opts: {
  userId: number | null;
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  customData?: Record<string, unknown> | null;
  capiCall: () => Promise<CAPIResponse>;
}): Promise<{ success: boolean; status: "sent" | "failed" | "skipped" }> {
  let status: "sent" | "failed" | "skipped" = "sent";
  let responseCode: number | null = null;

  try {
    const result = await opts.capiCall();
    if (result.error) {
      status = "failed";
      responseCode = result.error.code;
    } else {
      responseCode = 200;
    }
  } catch {
    status = "failed";
  }

  await insertPixelEvent({
    userId: opts.userId,
    eventName: opts.eventName,
    eventId: opts.eventId,
    eventSourceUrl: opts.eventSourceUrl,
    customData: opts.customData ?? null,
    status,
    responseCode,
  });

  return { success: status === "sent", status };
}

// ─── Use-cases ────────────────────────────────────────────────────────────────

export function relayEvent(input: {
  userId: number | null;
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  userData: CAPIUserData;
  customData?: Record<string, unknown>;
}) {
  return fireAndLogCAPIEvent({
    userId: input.userId,
    eventName: input.eventName,
    eventId: input.eventId,
    eventSourceUrl: input.eventSourceUrl,
    customData: input.customData,
    capiCall: () =>
      sendCAPIEvent({
        eventName: input.eventName,
        eventId: input.eventId,
        eventSourceUrl: input.eventSourceUrl,
        userData: input.userData,
        customData: input.customData,
      }),
  });
}

export function fireRewardsKeyEarned(input: {
  userId: number;
  userData: CAPIUserData;
  eventId: string;
  url: string;
  credits: number;
  source: string;
}) {
  return fireAndLogCAPIEvent({
    userId: input.userId,
    eventName: "RewardsKeyEarned",
    eventId: input.eventId,
    eventSourceUrl: input.url,
    customData: { credits: input.credits, source: input.source },
    capiCall: async () => {
      const result = await capi.rewardsKeyEarned(
        input.eventId,
        input.userData,
        input.url,
        input.credits,
        input.source
      );

      // Also fire Purchase for high-value claims (≥ 500 credits)
      if (input.credits >= 500) {
        await capi.purchase(
          `${input.eventId}-purchase`,
          input.userData,
          input.url,
          parseFloat((input.credits * 0.01).toFixed(2))
        );
      }

      return result;
    },
  });
}

export function fireLead(input: {
  userId: number | null;
  userData: CAPIUserData;
  eventId: string;
  url: string;
  contentName?: string;
}) {
  return fireAndLogCAPIEvent({
    userId: input.userId,
    eventName: "Lead",
    eventId: input.eventId,
    eventSourceUrl: input.url,
    customData: input.contentName ? { content_name: input.contentName } : null,
    capiCall: () =>
      capi.lead(input.eventId, input.userData, input.url, input.contentName),
  });
}

export function firePurchase(input: {
  userId: number;
  userData: CAPIUserData;
  eventId: string;
  url: string;
  value: number;
  currency: string;
}) {
  return fireAndLogCAPIEvent({
    userId: input.userId,
    eventName: "Purchase",
    eventId: input.eventId,
    eventSourceUrl: input.url,
    customData: { value: input.value, currency: input.currency },
    capiCall: () =>
      capi.purchase(
        input.eventId,
        input.userData,
        input.url,
        input.value,
        input.currency
      ),
  });
}

export function fireCompleteRegistration(input: {
  userId: number;
  userData: CAPIUserData;
  eventId: string;
  url: string;
}) {
  return fireAndLogCAPIEvent({
    userId: input.userId,
    eventName: "CompleteRegistration",
    eventId: input.eventId,
    eventSourceUrl: input.url,
    customData: { status: "registered" },
    capiCall: () =>
      capi.completeRegistration(input.eventId, input.userData, input.url),
  });
}

export function fireCustomEvent(input: {
  userId: number;
  userData: CAPIUserData;
  eventName: string;
  eventId: string;
  url: string;
  customData?: Record<string, unknown>;
}) {
  return fireAndLogCAPIEvent({
    userId: input.userId,
    eventName: input.eventName,
    eventId: input.eventId,
    eventSourceUrl: input.url,
    customData: input.customData,
    capiCall: () =>
      capi.custom(
        input.eventName,
        input.eventId,
        input.userData,
        input.url,
        input.customData
      ),
  });
}

export async function listEvents(input: {
  isAdmin: boolean;
  userId: number;
  limit: number;
}) {
  if (input.isAdmin) {
    return listAllEvents(input.limit);
  }
  return listEventsForUser(input.userId, input.limit);
}

export async function getEventLog(limit: number) {
  return listAllEvents(limit);
}

export async function getEventStats() {
  const all = await selectAllEvents();
  if (!all) return { total: 0, sent: 0, failed: 0, skipped: 0 };

  const sent = all.filter(e => e.status === "sent").length;
  const failed = all.filter(e => e.status === "failed").length;
  const skipped = all.filter(e => e.status === "skipped").length;

  return { total: all.length, sent, failed, skipped };
}

export { getAppUrl, type CAPIUserData };
