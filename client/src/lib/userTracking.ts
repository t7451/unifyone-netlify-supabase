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
      track: (
        event: string | Record<string, unknown>,
        data?: Record<string, unknown>
      ) => void;
      identify: (userId: string, data?: Record<string, unknown>) => void;
    };
  }
}

type PlausibleFn = (
  event: string,
  opts?: { props?: Record<string, unknown> }
) => void;

/**
 * Safely call window.plausible only when it is a live callable function.
 * Guards against the Plausible script setting the global to a non-callable
 * object (queue stub) while its SDK is still loading.
 */
function callPlausible(
  event: string,
  opts?: { props?: Record<string, unknown> }
): void {
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    (window.plausible as PlausibleFn)(event, opts);
  }
}

// ─── Page View ────────────────────────────────────────────────────────────────

export function trackPageView(url?: string): void {
  const path =
    url ?? (typeof window !== "undefined" ? window.location.pathname : "/");

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

export function trackLogin(
  method: "email" | "oauth" | "magic-link" = "email"
): void {
  trackEvent("login", { method });
}

export function trackSignup(
  method: "email" | "oauth" | "magic-link" = "email"
): void {
  trackEvent("signup", { method });
  window.fbq?.("track", "CompleteRegistration");
}

export function trackLogout(): void {
  trackEvent("logout");
}

// ─── Discoverability Engine — WS0 Funnel Events ───────────────────────────────

/**
 * Detect whether this session came from an AI search engine.
 * ChatGPT links from Bing, Perplexity crawls with its own UA, etc.
 * We sniff referrer and UTM source for known AI-search origins.
 */
export function detectAiReferral(): string | null {
  if (typeof window === "undefined") return null;
  const ref = document.referrer.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source")?.toLowerCase() ?? "";
  const utmMedium = params.get("utm_medium")?.toLowerCase() ?? "";

  if (ref.includes("perplexity.ai") || utmSource === "perplexity")
    return "perplexity";
  if (
    ref.includes("chat.openai.com") ||
    ref.includes("chatgpt.com") ||
    utmSource === "chatgpt"
  )
    return "chatgpt";
  if (ref.includes("gemini.google.com") || utmSource === "gemini")
    return "gemini";
  if (ref.includes("copilot.microsoft.com") || utmSource === "copilot")
    return "copilot";
  if (ref.includes("claude.ai") || utmSource === "claude") return "claude";
  if (utmMedium === "ai" || utmMedium === "llm" || utmMedium === "ai-search")
    return utmSource || "ai-unknown";
  return null;
}

/** Acquisition source for funnel attribution (organic / ai-search / paid / direct). */
export function getAcquisitionSource(): string {
  if (typeof window === "undefined") return "unknown";
  const aiSource = detectAiReferral();
  if (aiSource) return `ai:${aiSource}`;

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  if (utmSource) return `utm:${utmSource}`;

  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    if (new URL(ref).hostname === window.location.hostname) return "direct";
  } catch {
    return "direct";
  }
  const refLower = ref.toLowerCase();
  if (!refLower) return "direct";
  if (
    refLower.includes("google.com") ||
    refLower.includes("bing.com") ||
    refLower.includes("duckduckgo.com")
  )
    return "organic-search";
  if (refLower.includes("reddit.com")) return "reddit";
  if (refLower.includes("producthunt.com")) return "producthunt";
  return `referral:${new URL(ref).hostname}`;
}

/** Fired when the user lands on a marketing or tool page from an external source. */
export function trackOrganicLanding(page: string): void {
  const source = getAcquisitionSource();
  trackEvent("organic_landing", { page, source });
}

/** Fired when the signup form first becomes interactive / visible. */
export function trackSignupStart(source?: string): void {
  trackEvent("signup_start", { source: source ?? getAcquisitionSource() });
}

/** Fired when signup completes (replaces the previous bare trackSignup). */
export function trackSignupComplete(
  method: "email" | "oauth" | "magic-link" = "email",
  source?: string
): void {
  const acqSource = source ?? getAcquisitionSource();
  trackEvent("signup_complete", { method, source: acqSource });
  window.fbq?.("track", "CompleteRegistration");
}

/** Fired on the user's first "activation" action — first product created, first order, etc. */
export function trackActivation(action: string): void {
  const source = getAcquisitionSource();
  trackEvent("activation_event", { action, source });
}

/** Fired by any free tool when a user interacts with it (start, result, copy, share). */
export function trackToolUsage(
  toolSlug: string,
  action: "start" | "result" | "copy" | "share" | "signup_cta",
  props?: Record<string, string | number | boolean>
): void {
  trackEvent("tool_usage", { ...(props ?? {}), tool: toolSlug, action });
}
