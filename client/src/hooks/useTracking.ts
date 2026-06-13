import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  identifyUser,
  trackPageView,
  trackSignupComplete,
} from "@/lib/userTracking";
import { pixel } from "@/lib/pixel";

/**
 * Fires a page-view event on every SPA route change and identifies the
 * authenticated user in analytics providers once their session is resolved.
 *
 * Mount once at the top of the React tree (inside Router context).
 */
export function useTracking(): void {
  const [location] = useLocation();
  const { user, loading } = useAuth();
  const identifiedRef = useRef<string | null>(null);

  const oauthSignupHandledRef = useRef(false);

  // Page view on every navigation
  useEffect(() => {
    trackPageView(location);
  }, [location]);

  // OAuth signup completion: the server appends `?signup=1` to the post-OAuth
  // landing URL for brand-new accounts (see appendSignupFlag in
  // customAuthRoutes.ts). Detect it once, record the funnel event + fire the
  // deduped Meta pixel CompleteRegistration, then strip the param so a reload
  // or share doesn't re-fire it.
  useEffect(() => {
    if (oauthSignupHandledRef.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signup") !== "1") return;

    oauthSignupHandledRef.current = true;
    try {
      trackSignupComplete("oauth");
      pixel.completeRegistration();
    } catch {
      // Never let tracking break the landing experience.
    }

    params.delete("signup");
    const query = params.toString();
    const cleaned =
      window.location.pathname +
      (query ? `?${query}` : "") +
      window.location.hash;
    window.history.replaceState(window.history.state, "", cleaned);
  }, [location]);

  // Identify once per session when auth resolves
  useEffect(() => {
    if (loading) return;
    if (!user) {
      identifiedRef.current = null;
      return;
    }
    const userId = String(user.id);
    if (identifiedRef.current === userId) return;

    identifiedRef.current = userId;
    identifyUser(userId, {
      email: user.email ?? undefined,
      name: user.name ?? undefined,
    });
  }, [user, loading]);
}
