/**
 * useRecentRoutes.ts
 *
 * Persist last N searched routes plus starred "saved" routes in
 * localStorage so gig drivers can one-tap re-check routes they use
 * repeatedly (home→work, warehouse→zone, etc.). No auth required —
 * works for anonymous users too.
 *
 * Two lists, two storage keys:
 *   - recent:  rolling last-N searches (auto-evicted, MRU order)
 *   - starred: driver-pinned favorites (only removed explicitly)
 * Both sync across tabs via the storage event.
 */

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "routepulse:recent";
const STAR_KEY = "routepulse:starred";
const MAX_RECENT = 5;
const MAX_STARRED = 5;

export interface RecentRoute {
  origin: string;
  destination: string;
  searchedAt: string; // ISO timestamp
}

export interface StarredRoute {
  origin: string;
  destination: string;
  starredAt: string; // ISO timestamp
}

function readList<T>(
  key: string,
  stampField: "searchedAt" | "starredAt"
): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      r =>
        typeof r?.origin === "string" &&
        typeof r?.destination === "string" &&
        typeof r?.[stampField] === "string"
    ) as unknown as T[];
  } catch {
    return [];
  }
}

function writeList(key: string, routes: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(routes));
  } catch {
    // Storage might be full or disabled — silently degrade.
  }
}

export function useRecentRoutes() {
  const [recent, setRecent] = useState<RecentRoute[]>(() =>
    readList(STORAGE_KEY, "searchedAt")
  );
  const [starred, setStarred] = useState<StarredRoute[]>(() =>
    readList(STAR_KEY, "starredAt")
  );

  // Sync with storage on mount (in case another tab changed it).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRecent(readList(STORAGE_KEY, "searchedAt"));
      if (e.key === STAR_KEY) setStarred(readList(STAR_KEY, "starredAt"));
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
      writeList(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const clearRoutes = useCallback(() => {
    setRecent([]);
    writeList(STORAGE_KEY, []);
  }, []);

  const starRoute = useCallback((origin: string, destination: string) => {
    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();
    if (!trimmedOrigin || !trimmedDestination) return;

    setStarred(prev => {
      const deduped = prev.filter(
        r =>
          r.origin !== trimmedOrigin || r.destination !== trimmedDestination
      );
      const next: StarredRoute[] = [
        {
          origin: trimmedOrigin,
          destination: trimmedDestination,
          starredAt: new Date().toISOString(),
        },
        ...deduped,
      ].slice(0, MAX_STARRED);
      writeList(STAR_KEY, next);
      return next;
    });
  }, []);

  const unstarRoute = useCallback((origin: string, destination: string) => {
    setStarred(prev => {
      const next = prev.filter(
        r => !(r.origin === origin && r.destination === destination)
      );
      writeList(STAR_KEY, next);
      return next;
    });
  }, []);

  return { recent, starred, addRoute, clearRoutes, starRoute, unstarRoute };
}
