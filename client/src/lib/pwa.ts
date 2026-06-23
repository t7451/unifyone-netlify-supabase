/**
 * PWA service-worker registration with auto-update + quick auto-refresh.
 *
 * The service worker (public/sw.js) uses skipWaiting + clients.claim, so a new
 * version activates immediately. Here we:
 *  - register it (production builds only — never in dev),
 *  - reload the page once when an UPDATED worker takes control (not on first
 *    install, which would be a jarring reload right after first paint),
 *  - re-check for updates on focus and on a light interval so a fresh deploy is
 *    picked up quickly without the user hard-refreshing.
 */
export function registerPwa(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener("load", () => {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Only auto-refresh when an existing controller was replaced (an update),
      // and only once.
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(reg => {
        const checkForUpdate = () => {
          reg.update().catch(() => {});
        };
        window.addEventListener("focus", checkForUpdate);
        // Light heartbeat so an open tab notices a new deploy fairly quickly.
        window.setInterval(checkForUpdate, 60_000);
      })
      .catch(() => {
        // Registration failures must never break the app.
      });
  });
}
