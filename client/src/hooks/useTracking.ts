import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  identifyUser,
  trackPageView,
} from "@/lib/userTracking";

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

  // Page view on every navigation
  useEffect(() => {
    trackPageView(location);
  }, [location]);

  // Identify once per session when auth resolves
  useEffect(() => {
    if (loading) return;
    if (!user) {
      identifiedRef.current = null;
      return;
    }
    if (identifiedRef.current === user.id) return;

    identifiedRef.current = user.id;
    identifyUser(user.id, {
      email: user.email ?? undefined,
      name: user.name ?? undefined,
    });
  }, [user, loading]);
}
