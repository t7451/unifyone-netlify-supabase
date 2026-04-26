/**
 * useTerminalSession.ts
 *
 * Manages a WebSocket connection to the CLI PTY relay (/api/cli/pty).
 *
 * Features:
 *   - Connects on mount / mode change
 *   - Exponential back-off reconnect (3 attempts, then error state)
 *   - Idle-safe: no reconnect if the tab is hidden
 *   - Resize messages forwarded to the server
 *
 * Usage:
 *   const { status, send, resize, disconnect } = useTerminalSession({
 *     mode: "platform",
 *     onData: (chunk) => terminal.write(chunk),
 *     onMessage: (msg) => handleStructuredMessage(msg),
 *   });
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type SessionMode = "platform" | "vps" | "local";

export type SessionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error"
  | "closed";

export interface CliMessage {
  type: "connected" | "error" | "info" | "awaiting_agent";
  payload: { message?: string; mode?: string; host?: string };
}

interface UseTerminalSessionOptions {
  mode: SessionMode;
  /** VPS connection ID — required when mode = "vps". */
  vpsId?: number;
  /** One-time agent token — required when mode = "local". */
  agentToken?: string;
  /** Called with raw binary/text data from the server (PTY output). */
  onData?: (data: string | ArrayBuffer) => void;
  /** Called with structured JSON messages (type/payload) from the server. */
  onMessage?: (msg: CliMessage) => void;
}

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1_000;

export function useTerminalSession(opts: UseTerminalSessionOptions) {
  const { mode, vpsId, agentToken, onData, onMessage } = opts;
  const [status, setStatus] = useState<SessionStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDataRef = useRef(onData);
  const onMessageRef = useRef(onMessage);
  onDataRef.current = onData;
  onMessageRef.current = onMessage;

  const buildUrl = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const params = new URLSearchParams({ mode });
    if (vpsId !== undefined) params.set("vpsId", String(vpsId));
    if (agentToken) params.set("agentToken", agentToken);
    return `${proto}://${host}/api/cli/pty?${params.toString()}`;
  }, [mode, vpsId, agentToken]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    setStatus(retryCount.current > 0 ? "reconnecting" : "connecting");
    const ws = new WebSocket(buildUrl());
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      retryCount.current = 0;
      setStatus("connected");
    };

    ws.onmessage = event => {
      const { data } = event;
      // Try to parse as a structured JSON message first
      if (typeof data === "string") {
        try {
          const msg = JSON.parse(data) as CliMessage;
          if (msg.type) {
            onMessageRef.current?.(msg);
            return;
          }
        } catch {
          // Not JSON — treat as raw terminal data
        }
      }
      onDataRef.current?.(data);
    };

    ws.onerror = () => {
      // onclose will fire immediately after
    };

    ws.onclose = event => {
      wsRef.current = null;
      if (event.code === 1008 || event.code === 1011) {
        // Auth failure or server error — no retry
        setStatus("error");
        return;
      }
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        const delay = BACKOFF_BASE_MS * Math.pow(2, retryCount.current - 1);
        setStatus("reconnecting");
        retryTimer.current = setTimeout(connect, delay);
      } else {
        setStatus("error");
      }
    };
  }, [buildUrl]);

  // Connect when mode/vpsId/agentToken changes
  useEffect(() => {
    retryCount.current = 0;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    connect();
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus("closed");
    };
  }, [connect]);

  /** Send raw data (text or binary) to the server. */
  const send = useCallback((data: string | ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  /** Send a terminal resize event. */
  const resize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  }, []);

  /** Manually close the connection. */
  const disconnect = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryCount.current = MAX_RETRIES; // prevent auto-reconnect
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setStatus("closed");
  }, []);

  return { status, send, resize, disconnect };
}
