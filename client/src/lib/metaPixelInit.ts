/**
 * Meta Pixel initialisation — client-side only.
 *
 * Moved out of index.html (where it was an inline <script>) so that a strict
 * Content-Security-Policy can omit 'unsafe-inline' from script-src.
 *
 * Only loads the Pixel SDK when VITE_META_PIXEL_ID is a non-empty string that
 * doesn't look like an unsubstituted Vite placeholder.
 */

// pixel.ts already declares window.fbq as (...args: unknown[]) => void | undefined.
// We cast to any when setting up the SDK stub to avoid redeclaring the type here.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function initMetaPixel(): void {
  const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

  // Meta Pixel IDs are 15-16 digit numeric strings. Reject anything shorter
  // than 5 characters as obviously invalid, and skip unsubstituted Vite
  // placeholders (e.g. "%VITE_META_PIXEL_ID%" when the env var is not set).
  if (!pixelId || pixelId.length < 5 || pixelId.startsWith("%VITE_")) return;

  if (typeof window === "undefined") return;

  // Guard: don't double-init
  if (window.fbq) return;

  const w = window as any;

  // Minimal stub so callers can queue events before the SDK loads
  const fbqFn: any = function (...args: unknown[]) {
    if (fbqFn.callMethod) {
      fbqFn.callMethod(...args);
    } else {
      (fbqFn.queue = fbqFn.queue ?? []).push(args);
    }
  };

  fbqFn.push = fbqFn;
  fbqFn.loaded = true;
  fbqFn.version = "2.0";
  fbqFn.queue = [];

  w.fbq = fbqFn;
  if (!w._fbq) w._fbq = fbqFn;

  // Inject the Pixel SDK script dynamically — keeps it out of index.html
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const firstScript = document.getElementsByTagName("script")[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);

  w.fbq("init", pixelId);
  w.fbq("track", "PageView");
}

// Auto-initialise when this module is imported
initMetaPixel();
