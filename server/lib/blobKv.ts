/**
 * Platform JSON key-value cache on Netlify Blobs.
 *
 * Use this for short-lived, shared UX accelerators (route results, geocode
 * hits, feature flags snapshots) — not for durable business data (that stays
 * in Supabase) and not for public binary assets (use server/storage.ts →
 * uploads store + /blobs/*).
 *
 * Consistency: eventual by default (fast edge reads). Prefer strong only when
 * read-after-write correctness is required in the same request path.
 */

import { getStore, type Store } from "@netlify/blobs";

const CACHE_STORE = process.env.NETLIFY_BLOBS_CACHE_STORE ?? "app-cache";

type Envelope<T> = {
  v: 1;
  exp: number; // unix ms
  data: T;
};

function cacheStore(strong = false): Store {
  const siteID = process.env.NETLIFY_SITE_ID ?? process.env.SITE_ID;
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ?? process.env.NETLIFY_AUTH_TOKEN;
  const opts = {
    name: CACHE_STORE,
    ...(strong ? { consistency: "strong" as const } : {}),
  };
  if (siteID && token) {
    return getStore({ ...opts, siteID, token });
  }
  return getStore(opts);
}

function safeKey(namespace: string, key: string): string {
  const ns = namespace.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 48);
  const k = key.replace(/[^a-zA-Z0-9._:,|-]+/g, "_").slice(0, 180);
  return `${ns}/${k}`;
}

/**
 * Read a JSON value if present and not expired.
 * Returns null on miss, expiry, or any blob error (never throws to callers).
 */
export async function blobKvGet<T>(
  namespace: string,
  key: string
): Promise<T | null> {
  try {
    const store = cacheStore(false);
    const raw = await store.get(safeKey(namespace, key), { type: "text" });
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || env.v !== 1 || typeof env.exp !== "number") return null;
    if (Date.now() > env.exp) {
      // Best-effort delete of stale entry — ignore failures.
      void store.delete(safeKey(namespace, key)).catch(() => {});
      return null;
    }
    return env.data;
  } catch (err) {
    console.warn("[blobKv] get failed:", err);
    return null;
  }
}

/**
 * Write JSON with a TTL. Fire-and-forget safe: errors are logged, not thrown.
 */
export async function blobKvSet<T>(
  namespace: string,
  key: string,
  data: T,
  ttlMs: number
): Promise<void> {
  try {
    const store = cacheStore(false);
    const env: Envelope<T> = {
      v: 1,
      exp: Date.now() + Math.max(1_000, ttlMs),
      data,
    };
    await store.set(safeKey(namespace, key), JSON.stringify(env), {
      metadata: {
        contentType: "application/json",
        namespace,
        exp: String(env.exp),
      },
    });
  } catch (err) {
    console.warn("[blobKv] set failed:", err);
  }
}

export async function blobKvDelete(
  namespace: string,
  key: string
): Promise<void> {
  try {
    await cacheStore(true).delete(safeKey(namespace, key));
  } catch (err) {
    console.warn("[blobKv] delete failed:", err);
  }
}

/** Namespaces used across the platform — keep stable for ops. */
export const BlobKvNS = {
  routePulseRoutes: "rp-routes",
  routePulseGeocode: "rp-geocode",
  featureHints: "feature-hints",
} as const;
