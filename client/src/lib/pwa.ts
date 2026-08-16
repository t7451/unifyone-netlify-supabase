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
 *
 * Phase 1 offline (see docs/PWA_OFFLINE_PLAN.md) will add IndexedDB route
 * snapshots; the SW itself still must not cache /api/*.
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredInstall: BeforeInstallPromptEvent | null = null;

/** Capture Android Chrome install prompt for a later soft CTA. */
export function listenForInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstall = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent("pwa-install-available"));
  });
}

export function canPromptInstall(): boolean {
  return deferredInstall != null;
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredInstall) return "unavailable";
  const ev = deferredInstall;
  deferredInstall = null;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome;
}

export function registerPwa(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  listenForInstallPrompt();

  const registerWorker = () => {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
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
        window.setInterval(checkForUpdate, 60_000);
      })
      .catch(() => {
        // Registration failures must never break the app.
      });
  };

  if (document.readyState === "complete") {
    registerWorker();
  } else {
    window.addEventListener("load", registerWorker, { once: true });
  }
}
