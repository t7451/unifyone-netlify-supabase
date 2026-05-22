/**
 * UnifyOne — useSignupTracker Hook
 * ==================================
 * Fires a deduped Meta `CompleteRegistration` event (Pixel + CAPI relay) the
 * first time an authenticated user lands on a page whose URL carries the
 * `?signup=1` flag.
 *
 * Server-side OAuth callbacks (Google/Auth0) append `signup=1` to the
 * post-login redirect when they have just created a new local user row. This
 * hook then:
 *   1. Fires `pixel.completeRegistration()` to get a dedup `eventId`.
 *   2. Relays the same event server-side via `trpc.meta.relayEvent` so the
 *      Pixel + CAPI events deduplicate against each other in Meta.
 *   3. Strips the `signup=1` query param via `history.replaceState` so the
 *      event does not re-fire on reload or back-navigation.
 *
 * Usage:
 *   Mount once on any layout that runs only for authenticated users:
 *     useSignupTracker();
 */
import { useEffect, useRef } from "react";
import { pixel, getFbpCookie, getFbcCookie } from "../lib/pixel";
import { trpc } from "../lib/trpc";

const SIGNUP_PARAM = "signup";

export function useSignupTracker() {
  const relayEvent = trpc.meta.relayEvent.useMutation();
  // Guard against React 18 StrictMode double-invocation in dev.
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (url.searchParams.get(SIGNUP_PARAM) !== "1") return;

    hasFiredRef.current = true;

    // Capture the original event-source URL *before* stripping the param so
    // attribution analytics see the real landing URL the user hit.
    const eventSourceUrl = window.location.href;

    // Strip the marker first so a thrown analytics call cannot keep the param
    // around and re-fire on the next render.
    url.searchParams.delete(SIGNUP_PARAM);
    const cleanedUrl = `${url.pathname}${url.search}${url.hash}`;
    try {
      window.history.replaceState({}, "", cleanedUrl);
    } catch {
      // History API may be unavailable in non-browser environments; ignore.
    }

    try {
      const eventId = pixel.completeRegistration();
      relayEvent.mutate({
        eventName: "CompleteRegistration",
        eventId,
        eventSourceUrl,
        userData: {
          fbp: getFbpCookie(),
          fbc: getFbcCookie(),
        },
        customData: { status: "registered" },
      });
    } catch (err) {
      // Never let tracking failures bubble up to UI.
      console.warn("[signup-tracker] tracking failed", err);
    }
    // We intentionally only want this to run once on mount; relayEvent is a
    // stable tRPC mutation reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
