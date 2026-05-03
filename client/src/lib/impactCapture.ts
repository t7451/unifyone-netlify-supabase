/**
 * Impact.com affiliate click capture — client-side only.
 *
 * Detects ?im_ref=AFFID_CLICKID on any landing, POSTs the value to
 * /api/impact/click (which writes a row + sets HttpOnly im_ref cookie),
 * then strips the param from the URL via history.replaceState so the
 * affiliate token doesn't leak through Referer headers, screenshots, or
 * shared links.
 *
 * Mirror of metaPixelInit.ts pattern — imported as a side-effect from
 * client/src/main.tsx.
 */
const PARAM = "im_ref";

function detectImRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get(PARAM);
    if (v && v.length > 0 && v.length <= 200) return v;
  } catch {
    /* ignore */
  }
  return null;
}

function stripImRefFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PARAM)) return;
    url.searchParams.delete(PARAM);
    const newUrl =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
      url.hash;
    window.history.replaceState(window.history.state, "", newUrl);
  } catch {
    /* ignore */
  }
}

async function postClick(imRef: string): Promise<void> {
  try {
    const landingUrl =
      typeof window !== "undefined" ? window.location.href : "";
    await fetch("/api/impact/click", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        im_ref: imRef,
        landing_url: landingUrl.slice(0, 2048),
      }),
    });
  } catch {
    // Capture failures are non-fatal — the worst case is that a single
    // click goes unattributed. Don't throw.
  }
}

export function initImpactCapture(): void {
  if (typeof window === "undefined") return;
  // Already-captured marker on this page-load
  // (avoid double-fires when React StrictMode mounts twice in dev).
  const w = window as unknown as { __impactCaptureRan?: boolean };
  if (w.__impactCaptureRan) return;
  w.__impactCaptureRan = true;

  const imRef = detectImRef();
  if (!imRef) return;

  // Fire and forget; immediately strip the param so it doesn't leak.
  void postClick(imRef);
  stripImRefFromUrl();
}

// Auto-run on import for parity with metaPixelInit.ts.
initImpactCapture();
