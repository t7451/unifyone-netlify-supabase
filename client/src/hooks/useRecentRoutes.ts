/**
 * useRecentRoutes.ts
 *
 * Persist last N searched routes in localStorage so gig drivers can
 * one-tap re-check routes they use repeatedly (home→work, warehouse→zone,
 * etc.). No auth required — works for anonymous users too.
 */

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "routepulse:recent";
const MAX_RECENT = 5;

export interface RecentRoute {
  origin: string;
  destination: string;
  searchedAt: string; // ISO timestamp
}

function readStorage(): RecentRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentRoute[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      r =>
        typeof r.origin === "string" &&
        typeof r.destination === "string" &&
        typeof r.searchedAt === "string"
    );
  } catch {
    return [];
  }
}

function writeStorage(routes: RecentRoute[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
  } catch {
    // Storage might be full or disabled — silently degrade.
  }
}

export function useRecentRoutes() {
  const [recent, setRecent] = useState<RecentRoute[]>(readStorage);

  // Sync with storage on mount (in case another tab changed it).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRecent(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addRoute = useCallback((origin: string, destination: string) => {
    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();
    if (!trimmedOrigin || !trimmedDestination) return;

    setRecent(prev => {
      // Remove duplicate if same pair already exists (order matters).
      const deduped = prev.filter(
        r =>
          r.origin !== trimmedOrigin || r.destination !== trimmedDestination
      );
      const next: RecentRoute[] = [
        {
          origin: trimmedOrigin,
          destination: trimmedDestination,
          searchedAt: new Date().toISOString(),
        },
        ...deduped,
      ].slice(0, MAX_RECENT);
      writeStorage(next);
      return next;
    });
  }, []);

  const clearRoutes = useCallback(() => {
    setRecent([]);
    writeStorage([]);
  }, []);

  return { recent, addRoute, clearRoutes };
}
