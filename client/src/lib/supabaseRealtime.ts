/**
 * Supabase Realtime client for live order and inventory updates.
 *
 * NOTE: This module gracefully degrades when VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are not set — the app works fully without them,
 * real-time features simply won't activate.
 *
 * To enable: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your
 * environment variables (Settings → Secrets in the Manus UI).
 */

import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isRealtimeEnabled = !!supabase;

/**
 * Subscribe to real-time INSERT/UPDATE/DELETE events on a Supabase table.
 * Calls `onEvent` with the changed row whenever a change is broadcast.
 *
 * @param table   - Supabase table name (must have Realtime enabled in Supabase dashboard)
 * @param filter  - Optional Postgres filter string, e.g. "tenant_id=eq.42"
 * @param onEvent - Callback receiving the changed payload
 */
export function useRealtimeTable(
  table: string,
  filter: string | undefined,
  onEvent: (payload: any) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!supabase) return; // Realtime not configured — silent no-op

    const channelName = filter ? `${table}:${filter}` : table;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: any) => {
          onEvent(payload);
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Subscribed to ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [table, filter]);
}

/**
 * Subscribe to live order updates for a specific tenant.
 * Calls `onOrderChange` whenever an order row changes.
 */
export function useRealtimeOrders(tenantId: number | undefined, onOrderChange: (payload: any) => void) {
  useRealtimeTable(
    "orders",
    tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    onOrderChange
  );
}

/**
 * Subscribe to live inventory updates for a specific tenant.
 * Calls `onInventoryChange` whenever an inventory row changes.
 */
export function useRealtimeInventory(tenantId: number | undefined, onInventoryChange: (payload: any) => void) {
  useRealtimeTable(
    "inventory",
    tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    onInventoryChange
  );
}
