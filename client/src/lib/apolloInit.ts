/**
 * Apollo website visitor tracker — conditional loader.
 *
 * Identifies visiting companies (global) and people (U.S. only) by injecting
 * Apollo's tracker script only when VITE_APOLLO_API_KEY is a non-empty string
 * that doesn't look like an unsubstituted Vite placeholder.
 */

declare global {
  interface Window {
    trackingFunctions?: {
      onLoad: (opts: { appId: string }) => void;
      [key: string]: unknown;
    };
  }
}

export function initApollo(): void {
  const appId = import.meta.env.VITE_APOLLO_API_KEY as string | undefined;

  // Reject missing, short, or unsubstituted Vite placeholder values.
  if (!appId || appId.length < 8 || appId.startsWith("%VITE_")) return;

  if (typeof window === "undefined") return;

  // Guard: don't double-init
  if (document.querySelector('script[src*="assets.apollo.io"]')) return;

  const script = document.createElement("script");
  script.async = true;
  script.defer = true;
  script.src =
    "https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=" +
    Math.random().toString(36).substring(7);

  script.onload = () => {
    window.trackingFunctions?.onLoad({ appId });
  };

  script.onerror = () => {
    if (import.meta.env.DEV) {
      console.warn("[apolloInit] Failed to load Apollo website tracker script.");
    }
  };

  document.head.appendChild(script);
}

// Auto-initialise when this module is imported.
initApollo();
