/**
 * UnifyOne — First-party behavioral tracking (client)
 *
 * Captures consent-gated behavioral events (page/product views, searches,
 * cart/checkout actions, purchases) and batches them to the server's
 * `tracking.ingest` endpoint. Events are stitched by visitor + session id.
 *
 * Hard rules:
 * - Nothing is captured or sent unless the visitor granted analytics consent.
 * - Best-effort: a tracking failure is swallowed and never surfaces to the UI.
 */

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";
import type { BehaviorEventType } from "@shared/behaviorEvents";
import { hasAnalyticsConsent } from "./consent";
import { getSessionId, getVisitorId } from "./visitor";
import { getAcquisitionSource } from "./userTracking";

type QueuedEvent = {
  type: BehaviorEventType;
  productId?: number;
  orderId?: number;
  value?: number;
  path?: string;
  query?: string;
  resultCount?: number;
  url?: string;
  props?: Record<string, string | number | boolean>;
};

const FLUSH_DELAY_MS = 4000;
const MAX_BATCH = 50;

function buildClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    ],
  });
}

let client: ReturnType<typeof buildClient> | null = null;
function getClient() {
  if (!client) client = buildClient();
  return client;
}

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_DELAY_MS);
}

/** Send any queued events now. Safe to call directly (e.g. on page hide). */
export async function flush(): Promise<void> {
  if (queue.length === 0) return;
  if (!hasAnalyticsConsent()) {
    queue.length = 0;
    return;
  }
  const batch = queue.splice(0, MAX_BATCH);
  try {
    await getClient().tracking.ingest.mutate({
      anonymousId: getVisitorId() ?? undefined,
      sessionId: getSessionId() ?? undefined,
      events: batch,
    });
  } catch {
    // Best-effort: drop the batch rather than retry-storm or surface an error.
  }
  if (queue.length > 0) scheduleFlush();
}

function enqueue(event: QueuedEvent): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  queue.push({
    ...event,
    path: event.path ?? window.location.pathname,
  });
  if (queue.length >= MAX_BATCH) void flush();
  else scheduleFlush();
}

let listenersBound = false;
/** Bind flush-on-hide + outbound-click listeners once (from the app entry). */
export function initBehaviorTracking(): void {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  const flushNow = () => {
    flushProductEngagement();
    void flush();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
  window.addEventListener("pagehide", flushNow);

  // Auto-capture exits: any click on a link that leaves this origin. This is
  // the legitimate "where do they go next" signal — we record the destination
  // domain on the way out, never anything on the other site.
  document.addEventListener(
    "click",
    e => {
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!href) return;
      try {
        const dest = new URL(href, window.location.href);
        if (dest.protocol !== "http:" && dest.protocol !== "https:") return;
        if (dest.hostname === window.location.hostname) return;
        trackOutboundClick(dest.href);
        // Leaving the page — flush immediately so the exit isn't lost.
        flushNow();
      } catch {
        // Not a parseable URL — ignore.
      }
    },
    { capture: true }
  );
}

/**
 * First-touch acquisition attribution for the current session (where the
 * visitor came from). Computed once on session entry and cached in
 * sessionStorage so every page view in the session shares the same origin.
 */
function getSessionAttribution(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const KEY = "uo_attr";
  try {
    const cached = window.sessionStorage.getItem(KEY);
    if (cached) return JSON.parse(cached) as Record<string, string>;
  } catch {
    // sessionStorage unavailable (private mode / blocked) — recompute inline.
  }

  const params = new URLSearchParams(window.location.search);
  const attr: Record<string, string> = { source: getAcquisitionSource() };
  const ref = document.referrer;
  if (ref) {
    try {
      const host = new URL(ref).hostname.replace(/^www\./, "");
      if (host && host !== window.location.hostname) attr.referrer = host;
    } catch {
      // ignore unparseable referrer
    }
  }
  for (const k of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const v = params.get(k);
    if (v) attr[k] = v.slice(0, 120);
  }
  attr.landing = window.location.pathname.slice(0, 512);

  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(attr));
  } catch {
    // best-effort cache
  }
  return attr;
}

// ── Event helpers ─────────────────────────────────────────────────────────────

export function trackPageViewFirstParty(path?: string): void {
  // Leaving the current page — close out any open product engagement first.
  flushProductEngagement();
  // Attach session attribution so the dashboard can group visits by where they
  // came from (source / referrer / utm / landing page).
  enqueue({ type: "page_view", path, props: getSessionAttribution() });
}

/** A click on a link leaving the site — records the destination domain. */
export function trackOutboundClick(url: string): void {
  enqueue({ type: "outbound_click", url });
}

// Active product-engagement tracking: dwell time + max scroll depth for the
// product the visitor is currently looking at, flushed when they leave it.
type ActiveEngagement = {
  productId: number;
  name?: string;
  startedAt: number;
  maxScrollPct: number;
};
let activeEngagement: ActiveEngagement | null = null;
let scrollListenerBound = false;

function currentScrollPct(): number {
  if (typeof window === "undefined") return 0;
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  return Math.min(
    100,
    Math.round(((window.scrollY || doc.scrollTop || 0) / scrollable) * 100)
  );
}

function onScroll(): void {
  if (!activeEngagement) return;
  const pct = currentScrollPct();
  if (pct > activeEngagement.maxScrollPct) activeEngagement.maxScrollPct = pct;
}

/** Emit the engagement event for the product the visitor is leaving. */
export function flushProductEngagement(): void {
  const eng = activeEngagement;
  activeEngagement = null;
  if (!eng) return;
  const dwellMs = Date.now() - eng.startedAt;
  // Ignore trivially short views (likely a bounce / mis-click).
  if (dwellMs < 1000) return;
  enqueue({
    type: "product_engagement",
    productId: eng.productId,
    props: {
      dwellMs: Math.min(dwellMs, 1000 * 60 * 30),
      scrollPct: eng.maxScrollPct,
      ...(eng.name ? { name: eng.name } : {}),
    },
  });
}

export function trackProductView(product: { id: number; name?: string }): void {
  // Close out engagement for any previously-viewed product first.
  flushProductEngagement();
  enqueue({
    type: "product_view",
    productId: product.id,
    props: product.name ? { name: product.name } : undefined,
  });
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  activeEngagement = {
    productId: product.id,
    name: product.name,
    startedAt: Date.now(),
    maxScrollPct: currentScrollPct(),
  };
  if (!scrollListenerBound) {
    scrollListenerBound = true;
    window.addEventListener("scroll", onScroll, { passive: true });
  }
}

export function trackSearch(query: string, resultCount?: number): void {
  const q = query.trim();
  if (!q) return;
  enqueue({
    type: "search",
    query: q,
    ...(resultCount != null ? { resultCount } : {}),
  });
}

export function trackAddToCart(item: {
  productId: number;
  quantity?: number;
  value?: number;
}): void {
  enqueue({
    type: "add_to_cart",
    productId: item.productId,
    value: item.value,
    props: item.quantity != null ? { quantity: item.quantity } : undefined,
  });
}

export function trackCheckoutStart(detail?: {
  value?: number;
  itemCount?: number;
}): void {
  enqueue({
    type: "checkout_start",
    value: detail?.value,
    props:
      detail?.itemCount != null ? { itemCount: detail.itemCount } : undefined,
  });
}

export function trackPurchase(detail: {
  orderId?: number;
  value?: number;
  itemCount?: number;
}): void {
  enqueue({
    type: "purchase",
    orderId: detail.orderId,
    value: detail.value,
    props:
      detail.itemCount != null ? { itemCount: detail.itemCount } : undefined,
  });
}
