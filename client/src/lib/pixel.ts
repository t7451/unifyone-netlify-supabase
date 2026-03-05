/**
 * UnifyOne — Client-side Meta Pixel Helper
 * ==========================================
 * Fires browser-side Pixel events and returns an eventId for CAPI deduplication.
 * The eventId MUST be passed to the server-side CAPI relay to prevent double-counting.
 *
 * Usage:
 *   const eventId = pixel.track("Purchase", { value: 29.99, currency: "USD" });
 *   // Then call trpc.meta.relayEvent.mutate({ eventName: "Purchase", eventId, ... })
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function isPixelLoaded(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

export const pixel = {
  /**
   * Fire a standard or custom Pixel event.
   * Returns the eventId to pass to the CAPI relay for deduplication.
   */
  track(eventName: string, params?: Record<string, unknown>): string {
    const eventId = generateEventId();
    if (isPixelLoaded()) {
      window.fbq!("track", eventName, params ?? {}, { eventID: eventId });
    }
    return eventId;
  },

  /** Fire a custom event (non-standard) */
  trackCustom(eventName: string, params?: Record<string, unknown>): string {
    const eventId = generateEventId();
    if (isPixelLoaded()) {
      window.fbq!("trackCustom", eventName, params ?? {}, { eventID: eventId });
    }
    return eventId;
  },

  /** PageView — call on route change */
  pageView(): string {
    return pixel.track("PageView");
  },

  /** Lead — call on contact form submit */
  lead(contentName?: string): string {
    return pixel.track("Lead", contentName ? { content_name: contentName } : undefined);
  },

  /** CompleteRegistration — call on user signup */
  completeRegistration(): string {
    return pixel.track("CompleteRegistration", { status: "registered" });
  },

  /** Purchase — call on successful payment */
  purchase(value: number, currency = "USD"): string {
    return pixel.track("Purchase", { value, currency });
  },

  /** ViewContent — call on product/theme detail view */
  viewContent(contentName: string, contentId: string, value?: number): string {
    return pixel.track("ViewContent", {
      content_name: contentName,
      content_ids: [contentId],
      content_type: "product",
      ...(value !== undefined ? { value, currency: "USD" } : {}),
    });
  },

  /** AddToCart — call when user initiates checkout */
  addToCart(contentName: string, contentId: string, value: number): string {
    return pixel.track("AddToCart", {
      content_name: contentName,
      content_ids: [contentId],
      content_type: "product",
      value,
      currency: "USD",
    });
  },

  /** InitiateCheckout — call when checkout session is created */
  initiateCheckout(value: number, numItems = 1): string {
    return pixel.track("InitiateCheckout", { value, currency: "USD", num_items: numItems });
  },

  /** Custom: RewardsKeyEarned */
  rewardsKeyEarned(credits: number, source: string): string {
    return pixel.trackCustom("RewardsKeyEarned", {
      credits,
      source,
      value: parseFloat((credits * 0.01).toFixed(2)),
      currency: "USD",
    });
  },
};

/** Get the _fbp cookie value for CAPI user data enrichment */
export function getFbpCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match?.[1];
}

/** Get the _fbc cookie value for CAPI user data enrichment */
export function getFbcCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/_fbc=([^;]+)/);
  return match?.[1];
}
