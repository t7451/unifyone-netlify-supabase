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
import { trpc } from "./trpc";

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
    // onEvent is intentionally omitted — callback identity may change across renders
    // but we only want to re-subscribe when the channel target (table/filter) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

/**
 * Subscribe to credit_wallets changes for the current user.
 * Invalidates the getCreditBalance tRPC query on every change so the UI
 * reflects the new balance in real-time without polling.
 *
 * @param userId  The user's openId string (stored as `user_id` in credit_wallets)
 */
export function useCreditBalanceRealtime(userId: string | undefined) {
  const utils = trpc.useUtils();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId || !supabaseUrl) return;

    const channel = supabase
      .channel(`credit_wallets:${userId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "credit_wallets",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          utils.subscription.getCreditBalance.invalidate();
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "credit_wallets",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          utils.subscription.getCreditBalance.invalidate();
        }
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[Supabase Realtime] credit_wallets channel error");
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, utils]);
}

/**
 * Subscribe to credit_usage_events INSERT for the current user.
 * Invalidates getCreditBalance on every new usage event so balance
 * displays reflect credit consumption immediately.
 */
export function useCreditUsageRealtime(userId: string | undefined) {
  const utils = trpc.useUtils();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId || !supabaseUrl) return;

    const channel = supabase
      .channel(`credit_usage:${userId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "credit_usage_events",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          utils.subscription.getCreditBalance.invalidate();
        }
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[Supabase Realtime] credit_usage_events channel error");
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, utils]);
}
