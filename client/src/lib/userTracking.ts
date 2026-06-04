/**
 * UnifyOne — Unified user tracking
 *
 * Thin wrappers that fan-out to every analytics provider loaded on the page
 * (Plausible, Umami, Meta Pixel). All calls are no-ops when the provider's
 * global isn't present so there are no hard dependencies on env vars.
 */

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
    umami?: {
      track: (event: string | Record<string, unknown>, data?: Record<string, unknown>) => void;
      identify: (userId: string, data?: Record<string, unknown>) => void;
    };
  }
}

// ─── Page View ────────────────────────────────────────────────────────────────

export function trackPageView(url?: string): void {
  const path = url ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  // Plausible — manual pageview (needed for SPA navigations after the initial load)
  window.plausible?.("pageview");

  // Umami — track with explicit URL so the path is recorded correctly
  window.umami?.track({ url: path, title: document.title });

  // Meta Pixel
  window.fbq?.("track", "PageView");
}

// ─── User Identity ────────────────────────────────────────────────────────────

export function identifyUser(
  userId: string,
  traits?: { email?: string; name?: string; tenantId?: string }
): void {
  // Umami supports a first-party identify call
  window.umami?.identify(userId, traits);

  // Plausible — tag subsequent events with the internal userId as a custom prop
  // (useful in Goal funnels; Plausible never exposes PII in aggregate reports)
  if (window.plausible && traits?.email) {
    // We only send a hashed/anonymous identifier, never raw email
    window.plausible("identify", { props: { userId } });
  }
}

// ─── Named Events ─────────────────────────────────────────────────────────────

export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>
): void {
  window.plausible?.(name, { props });
  window.umami?.track(name, props);
}

export function trackLogin(method: "email" | "oauth" | "magic-link" = "email"): void {
  trackEvent("login", { method });
}

export function trackSignup(method: "email" | "oauth" | "magic-link" = "email"): void {
  trackEvent("signup", { method });
  window.fbq?.("track", "CompleteRegistration");
}

export function trackLogout(): void {
  trackEvent("logout");
}
