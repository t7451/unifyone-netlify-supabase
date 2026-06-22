/**
 * UnifyOne — Anonymous visitor + session identifiers (client)
 *
 * Generates a stable first-party visitor id (`uo_vid`, 1 year) and a rolling
 * session id (`uo_sid`, 30 min sliding) used to stitch a customer's behavioral
 * events together. Both are created ONLY after the visitor grants analytics
 * consent — without consent these return null and no cookie is written.
 */

import { SESSION_COOKIE, VISITOR_COOKIE } from "@shared/behaviorEvents";
import { hasAnalyticsConsent } from "./consent";
import { readCookie, writeCookie } from "./cookieUtils";

const VISITOR_TTL_SECONDS = 60 * 60 * 24 * 365;
const SESSION_TTL_SECONDS = 60 * 30;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-browser visitor id, or null if analytics consent is not granted. */
export function getVisitorId(): string | null {
  if (!hasAnalyticsConsent()) return null;
  const existing = readCookie(VISITOR_COOKIE);
  if (existing) return existing;
  const created = newId();
  writeCookie(VISITOR_COOKIE, created, VISITOR_TTL_SECONDS);
  return created;
}

/**
 * Rolling session id (refreshed on every read so it expires 30 min after the
 * last activity). Null if analytics consent is not granted.
 */
export function getSessionId(): string | null {
  if (!hasAnalyticsConsent()) return null;
  const id = readCookie(SESSION_COOKIE) ?? newId();
  writeCookie(SESSION_COOKIE, id, SESSION_TTL_SECONDS);
  return id;
}
