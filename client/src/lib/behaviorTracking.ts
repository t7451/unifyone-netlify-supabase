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

type QueuedEvent = {
  type: BehaviorEventType;
  productId?: number;
  orderId?: number;
  value?: number;
  path?: string;
  query?: string;
  resultCount?: number;
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
/** Bind flush-on-hide listeners once. Called from the app entry point. */
export function initBehaviorTracking(): void {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  const flushNow = () => {
    void flush();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
  window.addEventListener("pagehide", flushNow);
}

// ── Event helpers ─────────────────────────────────────────────────────────────

export function trackPageViewFirstParty(path?: string): void {
  enqueue({ type: "page_view", path });
}

export function trackProductView(product: { id: number; name?: string }): void {
  enqueue({
    type: "product_view",
    productId: product.id,
    props: product.name ? { name: product.name } : undefined,
  });
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
