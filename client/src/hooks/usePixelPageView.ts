/**
 * UnifyOne — usePixelPageView Hook
 * ==================================
 * Fires a Meta Pixel PageView event on every route change and relays it
 * server-side via the CAPI relay for deduplication.
 *
 * Usage:
 *   Import and call once in your top-level layout or route wrapper:
 *     usePixelPageView();
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { pixel, getFbpCookie, getFbcCookie } from "../lib/pixel";
import { trpc } from "../lib/trpc";

export function usePixelPageView() {
  const [location] = useLocation();
  const relayEvent = trpc.meta.relayEvent.useMutation();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    // Avoid duplicate fires for the same path
    if (location === lastTrackedPath.current) return;
    lastTrackedPath.current = location;

    // Fire client-side Pixel PageView (returns dedup eventId)
    const eventId = pixel.pageView();

    // Relay to server-side CAPI for deduplication
    relayEvent.mutate({
      eventName: "PageView",
      eventId,
      eventSourceUrl: window.location.href,
      userData: {
        fbp: getFbpCookie(),
        fbc: getFbcCookie(),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
}
