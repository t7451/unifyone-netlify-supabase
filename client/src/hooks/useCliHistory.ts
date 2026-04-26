/**
 * useCliHistory.ts
 *
 * Wraps cli.history tRPC query and provides local in-session history for
 * keyboard navigation (↑/↓ arrow keys) similar to a real terminal.
 */

import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";

export function useCliHistory(sessionSize = 200) {
  // In-session history (not persisted — mirrors what the user typed)
  const sessionHistory = useRef<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  /** Append a command to the in-session history list. */
  const pushCommand = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    // Deduplicate consecutive identical entries
    if (sessionHistory.current[sessionHistory.current.length - 1] !== cmd) {
      sessionHistory.current.push(cmd);
    }
    if (sessionHistory.current.length > sessionSize) {
      sessionHistory.current.shift();
    }
    setHistoryIndex(-1);
  }, [sessionSize]);

  /**
   * Navigate history with ArrowUp/ArrowDown.
   * Returns the command at the new index, or null if no change.
   */
  const navigate = useCallback(
    (direction: "up" | "down"): string | null => {
      const len = sessionHistory.current.length;
      if (len === 0) return null;

      let next: number;
      if (direction === "up") {
        next = historyIndex === -1 ? len - 1 : Math.max(0, historyIndex - 1);
      } else {
        next = historyIndex === -1 ? -1 : Math.min(len - 1, historyIndex + 1);
        if (next === len - 1 && historyIndex === len - 1) next = -1;
      }

      setHistoryIndex(next);
      return next === -1 ? "" : (sessionHistory.current[next] ?? null);
    },
    [historyIndex]
  );

  /** Persisted history from the server (last 50 commands across sessions). */
  const { data, isLoading } = trpc.cli.history.useQuery(
    { limit: 50, offset: 0 },
    { staleTime: 30_000 }
  );

  return {
    pushCommand,
    navigate,
    persistedHistory: data?.items ?? [],
    isLoadingHistory: isLoading,
  };
}
