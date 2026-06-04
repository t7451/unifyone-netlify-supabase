/**
 * Apollo website visitor tracker — conditional loader.
 *
 * Identifies visiting companies (global) and people (U.S. only) by injecting
 * Apollo's tracker script only when VITE_APOLLO_API_KEY is a non-empty string
 * that doesn't look like an unsubstituted Vite placeholder.
 *
 * The same script supports both company- and person-level identification, so
 * no code changes are needed when person-level tracking is later enabled in
 * Apollo's settings.
 */

declare global {
  interface Window {
    ApolloIdentify?: {
      q?: unknown[][];
      identify: (...args: unknown[]) => void;
      track: (...args: unknown[]) => void;
      [key: string]: unknown;
    };
  }
}

export function initApollo(): void {
  const apiKey = import.meta.env.VITE_APOLLO_API_KEY as string | undefined;

  // Reject missing, short, or unsubstituted Vite placeholder values.
  if (!apiKey || apiKey.length < 8 || apiKey.startsWith("%VITE_")) return;

  if (typeof window === "undefined") return;

  // Guard: don't double-init
  if (window.ApolloIdentify) return;

  // Set up a queuing stub so calls made before the SDK loads are buffered.
  const ai: Window["ApolloIdentify"] = {
    q: [],
    identify: function (...args: unknown[]) {
      (ai.q = ai.q ?? []).push(["identify", args]);
    },
    track: function (...args: unknown[]) {
      (ai.q = ai.q ?? []).push(["track", args]);
    },
  };
  window.ApolloIdentify = ai;

  // Inject the tracker SDK asynchronously.
  // The `nocache` param uses Math.random() per Apollo's documented approach to
  // ensure the browser always fetches the latest script version from their CDN.
  const script = document.createElement("script");
  script.async = true;
  script.src =
    "https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=" +
    Math.random();
  document.head.appendChild(script);

  // Identify the visitor once the SDK is ready.
  script.onload = () => {
    window.ApolloIdentify?.identify({ apiKey });
  };

  script.onerror = () => {
    if (import.meta.env.DEV) {
      console.warn("[apolloInit] Failed to load Apollo website tracker script.");
    }
  };
}

// Auto-initialise when this module is imported.
initApollo();
