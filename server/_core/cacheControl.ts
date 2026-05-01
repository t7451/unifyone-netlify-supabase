/**
 * Cache-control helpers for tRPC procedures served behind the Netlify
 * edge. Sets `Netlify-CDN-Cache-Control` so the edge caches the response
 * without affecting browser caching, plus `Cache-Control: private` to
 * prevent intermediate proxies from caching personalized data.
 *
 * Usage in a tRPC resolver:
 *
 *   plans: publicProcedure.query(({ ctx }) => {
 *     setEdgeCache(ctx.res, EDGE_CACHE.public_long);
 *     return getPlans();
 *   }),
 */

import type { TrpcContext } from "./context";

export type EdgeCachePolicy = {
  /** Seconds the edge may serve a cached response. */
  sMaxAge: number;
  /** Seconds the edge may serve a stale response while revalidating. */
  staleWhileRevalidate?: number;
  /** Tags for targeted purges. */
  tags?: readonly string[];
};

/** Common presets — tuned for read-heavy public endpoints. */
export const EDGE_CACHE = {
  /** Plans, pricing tiers, marketing JSON — change rarely. */
  public_long: {
    sMaxAge: 60 * 60, // 1h
    staleWhileRevalidate: 60 * 60 * 24, // 24h
  },
  /** Product listings, SEO metadata — change a few times per hour. */
  public_short: {
    sMaxAge: 60, // 1m
    staleWhileRevalidate: 60 * 10, // 10m
  },
  /** Blog/CMS content — change a few times per day. */
  cms: {
    sMaxAge: 60 * 5, // 5m
    staleWhileRevalidate: 60 * 60 * 6, // 6h
  },
} as const satisfies Record<string, EdgeCachePolicy>;

/**
 * Sets Netlify edge cache headers on the underlying Express response.
 * No-op if `res` is missing (e.g. inside a unit test with a stub ctx).
 */
export function setEdgeCache(
  res: TrpcContext["res"] | undefined,
  policy: EdgeCachePolicy
): void {
  if (!res?.setHeader) return;

  const parts = [`public`, `s-maxage=${policy.sMaxAge}`];
  if (policy.staleWhileRevalidate) {
    parts.push(`stale-while-revalidate=${policy.staleWhileRevalidate}`);
  }

  // Netlify-specific header — only the edge honors it; browsers ignore.
  res.setHeader("Netlify-CDN-Cache-Control", parts.join(", "));
  // Browsers should NOT cache (data may be user-specific later).
  res.setHeader("Cache-Control", "private, no-store");

  if (policy.tags && policy.tags.length > 0) {
    res.setHeader("Netlify-Cache-Tag", policy.tags.join(","));
  }
}
