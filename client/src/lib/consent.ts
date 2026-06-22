/**
 * UnifyOne — Cookie consent (client)
 *
 * Stores the visitor's tracking choice in a strictly-necessary first-party
 * cookie (`uo_consent`). Behavioral analytics tracking and the visitor/session
 * cookies are gated on `analytics === true` (opt-in). The consent cookie itself
 * is necessary — it records the choice and is allowed before consent is given.
 */

import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  type ConsentRecord,
} from "@shared/behaviorEvents";
import { deleteCookie, readCookie, writeCookie } from "./cookieUtils";
import { SESSION_COOKIE, VISITOR_COOKIE } from "@shared/behaviorEvents";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type Listener = (record: ConsentRecord) => void;
const listeners = new Set<Listener>();

/** Read the stored consent record, or null if absent / from an older version. */
export function getConsent(): ConsentRecord | null {
  const raw = readCookie(CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed.v !== CONSENT_VERSION) return null;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      v: CONSENT_VERSION,
      ts: typeof parsed.ts === "number" ? parsed.ts : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Whether the visitor has been asked yet (consent banner should show if not). */
export function hasDecidedConsent(): boolean {
  return getConsent() !== null;
}

/** Whether the visitor opted in to behavioral analytics tracking. */
export function hasAnalyticsConsent(): boolean {
  return getConsent()?.analytics === true;
}

/** Record the visitor's choice and notify subscribers (tracking layer reacts). */
export function setConsent(analytics: boolean): ConsentRecord {
  const record: ConsentRecord = {
    necessary: true,
    analytics,
    v: CONSENT_VERSION,
    ts: Date.now(),
  };
  writeCookie(CONSENT_COOKIE, JSON.stringify(record), ONE_YEAR_SECONDS);

  // If consent was withdrawn, drop the tracking cookies immediately.
  if (!analytics) {
    deleteCookie(VISITOR_COOKIE);
    deleteCookie(SESSION_COOKIE);
  }

  listeners.forEach(listener => {
    try {
      listener(record);
    } catch {
      // A misbehaving listener must not block others.
    }
  });
  return record;
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function onConsentChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
