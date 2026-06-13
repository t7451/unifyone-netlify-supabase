/**
 * useServerEvents — subscribes to the server's SSE event stream at /api/events.
 *
 * When a `notification` event arrives the tRPC notification cache is
 * invalidated so NotificationCenter re-renders instantly without waiting
 * for the 30-second poll.  Same for `announcement` events.
 *
 * `credit_balance` events invalidate the credit-balance query so
 * BillingSuccess knows immediately when credits landed.
 *
 * Falls back gracefully in Netlify/serverless environments where the
 * connection attempt fails (EventSource will fire onerror, the hook
 * disables itself and the normal refetchInterval polling takes over).
 *
 * Usage:
 *   // Mount once at app root (inside AuthProvider / QueryClientProvider)
 *   useServerEvents();
 */
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_JITTER_MS = 1_000;
// After this many consecutive failures we stop trying — the server is likely
// serverless (Netlify) and long-lived connections aren't supported.
const MAX_FAILURES = 5;

export function useServerEvents() {
  const utils = trpc.useUtils();
  const failureCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;

    function connect() {
      if (stopped.current) return;

      const es = new EventSource("/api/events", { withCredentials: true });
      esRef.current = es;

      es.addEventListener("connected", () => {
        failureCount.current = 0;
      });

      es.addEventListener("notification", () => {
        utils.notifications.list.invalidate();
        utils.notifications.unreadCount.invalidate();
      });

      es.addEventListener("announcement", () => {
        utils.notifications.listAnnouncements.invalidate();
      });

      es.addEventListener("credit_balance", () => {
        utils.subscription.getCreditBalance.invalidate();
      });

      es.addEventListener("order_status", () => {
        utils.orders?.list?.invalidate?.();
      });

      // heartbeat — no-op (just keeps the connection alive)
      es.addEventListener("heartbeat", () => {});

      es.onerror = () => {
        es.close();
        esRef.current = null;
        failureCount.current += 1;
        if (failureCount.current >= MAX_FAILURES || stopped.current) return;
        const delay = Math.min(
          RECONNECT_BASE_MS * 2 ** (failureCount.current - 1) +
            Math.random() * RECONNECT_JITTER_MS,
          RECONNECT_MAX_MS
        );
        reconnectTimer.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      stopped.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      esRef.current?.close();
      esRef.current = null;
    };
  }, [utils]);
}
