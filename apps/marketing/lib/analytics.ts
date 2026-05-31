/**
 * Unified analytics layer for GA4 + Microsoft Clarity.
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track("cta_click", { id: "hero-primary" });
 *
 * Any element with `data-analytics-cta="…"` is auto-tracked via the
 * <AnalyticsListener /> client component mounted in app/layout.tsx.
 */

type EventName =
  | "cta_click"
  | "pricing_view_tier"
  | "pricing_select_tier"
  | "form_submit"
  | "form_submit_success"
  | "form_submit_error"
  | "scroll_depth"
  | "dashboard_tab_switch"
  | "demo_play";

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    // GA4 / gtag
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    // Microsoft Clarity
    clarity?: (...args: unknown[]) => void;
  }
}

export function track(event: EventName, props: Props = {}): void {
  if (typeof window === "undefined") return;

  // GA4
  if (typeof window.gtag === "function") {
    window.gtag("event", event, props);
  }

  // Microsoft Clarity — custom event + tag pairs for filtering in dashboard
  if (typeof window.clarity === "function") {
    try {
      window.clarity("event", event);
      Object.entries(props).forEach(([k, v]) => {
        if (v != null) window.clarity?.("set", k, String(v));
      });
    } catch {
      /* swallow — Clarity occasionally throws on early calls */
    }
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, props);
  }
}

export function identify(userId: string, traits: Props = {}): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("set", "user_properties", { user_id: userId, ...traits });
  }
  if (typeof window.clarity === "function") {
    try {
      window.clarity("identify", userId);
    } catch {
      /* noop */
    }
  }
}
