/**
 * server/_core/sseManager.ts — Server-Sent Events connection registry.
 *
 * Tracks open SSE connections per user and broadcasts typed events.
 * Only used by the Express server (local dev / Docker). Netlify Functions
 * are serverless and can't hold open connections — the client falls back
 * to polling there automatically (EventSource reconnects and gives up after
 * a few failed attempts).
 *
 * Event types pushed to clients:
 *   notification    — new in-app notification row created
 *   announcement    — new active announcement broadcast
 *   credit_balance  — Supabase credit_wallets updated
 *   order_status    — order status changed
 *   heartbeat       — keep-alive every 30s
 */
import type { Response } from "express";

export type SseEventType =
  | "notification"
  | "announcement"
  | "credit_balance"
  | "order_status"
  | "heartbeat";

export interface SseEvent<T = unknown> {
  type: SseEventType;
  data: T;
}

// Numeric userId → set of open Response streams for that user.
const connections = new Map<number, Set<Response>>();
// openId (string) → numeric userId, so callers with only the openId can broadcast.
const openIdToUserId = new Map<string, number>();

const HEARTBEAT_MS = 30_000;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function ensureHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    connections.forEach((resSet, userId) => {
      resSet.forEach(res => {
        try {
          res.write(`event: heartbeat\ndata: {}\n\n`);
        } catch {
          // Connection gone — clean up
          resSet.delete(res);
        }
      });
      if (resSet.size === 0) connections.delete(userId);
    });
  }, HEARTBEAT_MS);
  // Don't block process exit
  heartbeatTimer.unref?.();
}

/**
 * Register a new SSE client connection for the given user.
 * Returns a cleanup function to call when the connection closes.
 */
export function registerSseClient(
  userId: number,
  openId: string,
  res: Response
): () => void {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId)!.add(res);
  openIdToUserId.set(openId, userId);
  ensureHeartbeat();

  return () => {
    const set = connections.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        connections.delete(userId);
        openIdToUserId.delete(openId);
      }
    }
  };
}

/** Broadcast to user identified by their openId string (for billing/webhook callers). */
export function broadcastToOpenId(
  openId: string,
  event: SseEventType,
  data: unknown
) {
  const userId = openIdToUserId.get(openId);
  if (userId !== undefined) broadcastToUser(userId, event, data);
}

function writeEvent(res: Response, event: SseEventType, data: unknown) {
  try {
    const payload = JSON.stringify(data);
    res.write(`event: ${event}\ndata: ${payload}\n\n`);
  } catch {
    // Connection dropped mid-write — ignore; cleanup happens in heartbeat
  }
}

/** Broadcast an event to all open connections for a specific user. */
export function broadcastToUser(
  userId: number,
  event: SseEventType,
  data: unknown
) {
  const set = connections.get(userId);
  if (!set || set.size === 0) return;
  set.forEach(res => writeEvent(res, event, data));
}

/** Broadcast an event to every connected user. */
export function broadcastToAll(event: SseEventType, data: unknown) {
  connections.forEach(resSet => {
    resSet.forEach(res => writeEvent(res, event, data));
  });
}

/** Number of currently-connected users (for health/metrics). */
export function connectedUserCount(): number {
  return connections.size;
}
