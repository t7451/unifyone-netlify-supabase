/**
 * UnifyOne — First-party behavioral event taxonomy (shared client + server)
 *
 * These event types are written to the `analytics_events` table and power the
 * customer-behavior insights on the Analytics dashboard (most-viewed products,
 * search demand, cart/checkout funnel, purchase patterns).
 *
 * Tracking is gated on explicit analytics consent on the client (opt-in cookie
 * banner) — no behavioral event is emitted until the visitor accepts.
 */

export const BEHAVIOR_EVENT_TYPES = [
  "page_view",
  "product_view",
  "search",
  "add_to_cart",
  "checkout_start",
  "purchase",
  // WHERE: a click on a link that leaves the site — the destination domain is
  // the legitimate "where they go next" signal (no off-site tracking required).
  "outbound_click",
  // WHAT (depth): how long / how far a visitor engaged with a product page —
  // dwell time and max scroll depth, emitted when they leave the product.
  "product_engagement",
] as const;

export type BehaviorEventType = (typeof BEHAVIOR_EVENT_TYPES)[number];

export function isBehaviorEventType(value: string): value is BehaviorEventType {
  return (BEHAVIOR_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Cookie names for first-party behavioral tracking. All are first-party,
 * SameSite=Lax, and set only after the visitor grants analytics consent
 * (except the consent cookie itself, which is strictly necessary and records
 * the choice).
 */
export const CONSENT_COOKIE = "uo_consent";
export const VISITOR_COOKIE = "uo_vid";
export const SESSION_COOKIE = "uo_sid";

/** Current version of the consent record; bump to re-prompt all visitors. */
export const CONSENT_VERSION = 1;

export type ConsentRecord = {
  /** Strictly-necessary cookies (auth/session) are always allowed. */
  necessary: true;
  /** Behavioral analytics + tracking cookies — requires opt-in. */
  analytics: boolean;
  /** Consent record schema version. */
  v: number;
  /** Unix ms when the choice was recorded. */
  ts: number;
};
