/*
 * 1Commerce — service worker (mobile-first PWA).
 *
 * Strategy is deliberately update-safe (no stale-asset footgun):
 *  - HTML navigations: NETWORK-FIRST, so a fresh deploy is picked up instantly;
 *    falls back to the cached shell only when offline.
 *  - Content-hashed build assets (js/css/fonts/images): cache-first (the
 *    filename changes when the content changes, so this can never go stale).
 *  - /api/* is never intercepted.
 *
 * `__SW_BUILD__` is replaced with a unique build timestamp at deploy time
 * (see vite.config.ts closeBundle), so every deploy changes this file's bytes
 * and the browser detects an update → skipWaiting → the page auto-refreshes.
 */

const SW_BUILD = "__SW_BUILD__";
const CACHE = `app-shell-${SW_BUILD}`;
const SHELL_KEY = "/__app_shell__";

self.addEventListener("install", () => {
  // Take over as soon as installed — no "waiting" state.
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = (() => {
    try {
      return new URL(req.url);
    } catch {
      return null;
    }
  })();
  if (!url) return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return; // never cache server routes

  // HTML navigations — network-first.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        // Only the network fetch falling over should trigger the offline
        // fallback — a failed cache write must not.
        const fresh = await fetch(req).catch(() => null);
        if (fresh) {
          const cache = await caches.open(CACHE);
          // Best-effort cache write; never let it mask a good response.
          cache.put(SHELL_KEY, fresh.clone()).catch(() => {});
          return fresh;
        }
        const cache = await caches.open(CACHE);
        const cached = await cache.match(SHELL_KEY);
        return (
          cached ||
          new Response("You're offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        );
      })()
    );
    return;
  }

  // Content-hashed static assets — cache-first (safe; URL changes on change).
  if (
    /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico)$/i.test(
      url.pathname
    )
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const fresh = await fetch(req).catch(() => null);
        if (!fresh) return cached || Response.error();
        // Best-effort cache write; don't let a write failure drop the response.
        if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      })()
    );
  }
});
