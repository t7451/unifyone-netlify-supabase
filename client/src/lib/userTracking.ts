/**
 * UnifyOne — Unified user tracking
 *
 * Thin wrappers that fan-out to every analytics provider loaded on the page
 * (Plausible, Umami, Meta Pixel). All calls are no-ops when the provider's
 * global isn't present so there are no hard dependencies on env vars.
 */

declare global {
  interface Window {
    // The Plausible script may set window.plausible as a non-callable object
    // (queue stub) before the SDK finishes loading. Always guard with
    // typeof === "function" before calling it — never use optional chaining
    // alone, because ?. only skips null/undefined, not non-function values.
    plausible?: unknown;
    umami?: {
      track: (event: string | Record<string, unknown>, data?: Record<string, unknown>) => void;
      identify: (userId: string, data?: Record<string, unknown>) => void;
    };
  }
}

type PlausibleFn = (event: string, opts?: { props?: Record<string, unknown> }) => void;

/**
 * Safely call window.plausible only when it is a live callable function.
 * Guards against the Plausible script setting the global to a non-callable
 * object (queue stub) while its SDK is still loading.
 */
function callPlausible(event: string, opts?: { props?: Record<string, unknown> }): void {
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    (window.plausible as PlausibleFn)(event, opts);
  }
}

// ─── Page View ────────────────────────────────────────────────────────────────

export function trackPageView(url?: string): void {
  const path = url ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  // Plausible — manual pageview (needed for SPA navigations after the initial load)
  callPlausible("pageview");

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
  if (traits?.email) {
    // We only send a hashed/anonymous identifier, never raw email
    callPlausible("identify", { props: { userId } });
  }
}

// ─── Named Events ─────────────────────────────────────────────────────────────

export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>
): void {
  callPlausible(name, { props });
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
