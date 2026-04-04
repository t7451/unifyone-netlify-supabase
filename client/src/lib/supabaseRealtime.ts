/**
 * Supabase Realtime client for live order and inventory updates.
 *
 * Uses the shared Supabase client from supabaseClient.ts.
 * Real-time features activate when VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are set.
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

export { supabase };

export const isRealtimeEnabled = !!supabaseUrl;

/**
 * Subscribe to real-time INSERT/UPDATE/DELETE events on a Supabase table.
 * Calls `onEvent` with the changed row whenever a change is broadcast.
 */
export function useRealtimeTable(
  table: string,
  filter: string | undefined,
  onEvent: (payload: any) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!supabaseUrl) return; // Realtime not configured — silent no-op

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
 */
export function useRealtimeOrders(
  tenantId: number | undefined,
  onOrderChange: (payload: any) => void
) {
  useRealtimeTable(
    "orders",
    tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    onOrderChange
  );
}

/**
 * Subscribe to live inventory updates for a specific tenant.
 */
export function useRealtimeInventory(
  tenantId: number | undefined,
  onInventoryChange: (payload: any) => void
) {
  useRealtimeTable(
    "inventory",
    tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    onInventoryChange
  );
}
