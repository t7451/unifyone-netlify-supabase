/**
 * UnifyOne — Meta Pixel (fbq) client-side helper
 * ================================================
 * Wraps window.fbq calls safely with a global type declaration.
 * Works in tandem with server-side CAPI for deduplication.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

export function getFbpCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getFbcCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)_fbc=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

// ─── Core Fire Function ───────────────────────────────────────────────────────

export function trackPixelEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (params) {
    window.fbq("track", eventName, params);
  } else {
    window.fbq("track", eventName);
  }
}

// ─── Convenience Functions ────────────────────────────────────────────────────

export function trackPageView(): void {
  trackPixelEvent("PageView");
}

export function trackLead(params?: Record<string, unknown>): void {
  trackPixelEvent("Lead", params);
}

export function trackPurchase(value: number, currency: string): void {
  trackPixelEvent("Purchase", { value, currency });
}

// ─── pixel object (for usePixelPageView hook compatibility) ───────────────────
// Returns a dedup eventId so it can be forwarded to CAPI

export const pixel = {
  pageView(): string {
    const eventId = crypto.randomUUID();
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView", {}, { eventID: eventId });
    }
    return eventId;
  },

  lead(params?: Record<string, unknown>): string {
    const eventId = crypto.randomUUID();
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Lead", params ?? {}, { eventID: eventId });
    }
    return eventId;
  },

  purchase(value: number, currency: string): string {
    const eventId = crypto.randomUUID();
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq(
        "track",
        "Purchase",
        { value, currency },
        { eventID: eventId }
      );
    }
    return eventId;
  },

  completeRegistration(): string {
    const eventId = crypto.randomUUID();
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", {}, { eventID: eventId });
    }
    return eventId;
  },
};
