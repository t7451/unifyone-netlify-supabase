/**
 * Rate limiter — sliding-window, production-safe.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set the limiter
 * uses Upstash Redis as a shared, distributed counter that survives across
 * Netlify Function invocations (serverless / multi-instance / ephemeral).
 *
 * Without those env vars it falls back to a single-process in-memory sliding
 * window. The in-memory fallback is fine for local development and single-
 * instance Docker deployments, but provides no cross-process protection on
 * serverless platforms — see .env.example for setup instructions.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 });
 *   const result = await limiter.check(ipAddress);
 *   if (!result.allowed) return 429 response;
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitEntry = {
  attempts: number[]; // timestamps (ms) of recent attempts within the window
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

// ── Shared Upstash Redis client (lazy singleton) ──────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis !== null) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createRateLimiter(opts: {
  maxAttempts: number;
  windowMs: number;
}) {
  const { maxAttempts, windowMs } = opts;

  // ── Upstash path ────────────────────────────────────────────────────────────
  const redis = getRedis();
  if (redis) {
    const windowSeconds = Math.ceil(windowMs / 1000);
    const upstash = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxAttempts, `${windowSeconds} s`),
      analytics: false,
      prefix: "rl",
    });

    return {
      async check(key: string): Promise<RateLimitResult> {
        const { success, reset } = await upstash.limit(key);
        if (success) return { allowed: true };
        const retryAfterMs = Math.max(0, reset - Date.now());
        return { allowed: false, retryAfterMs };
      },
      async reset(key: string): Promise<void> {
        // Upstash Ratelimit doesn't expose a direct reset; delete the key.
        await redis.del(`rl:${key}`);
      },
    };
  }

  // ── In-memory fallback (local dev / single-process Docker) ──────────────────
  const store = new Map<string, RateLimitEntry>();

  // Prune expired keys every 10 minutes to prevent unbounded memory growth
  const pruneInterval = setInterval(
    () => {
      const now = Date.now();
      store.forEach((entry, key) => {
        const fresh = entry.attempts.filter((t: number) => now - t < windowMs);
        if (fresh.length === 0) {
          store.delete(key);
        } else {
          entry.attempts = fresh;
        }
      });
    },
    10 * 60 * 1000
  );

  // Allow GC in tests / Netlify function teardown
  if (pruneInterval.unref) pruneInterval.unref();

  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      const entry = store.get(key) ?? { attempts: [] };

      // Drop stale timestamps outside the window
      entry.attempts = entry.attempts.filter(t => now - t < windowMs);

      if (entry.attempts.length >= maxAttempts) {
        const oldest = entry.attempts[0];
        const retryAfterMs = windowMs - (now - oldest);
        store.set(key, entry);
        return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
      }

      entry.attempts.push(now);
      store.set(key, entry);
      return { allowed: true };
    },

    async reset(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

/** Shared limiter for sign-in / sign-up: 10 attempts per 15 minutes per IP. */
export const authRateLimiter = createRateLimiter({
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
});

/** Stricter limiter for password-reset requests: 3 per 15 minutes per IP. */
export const passwordResetLimiter = createRateLimiter({
  maxAttempts: 3,
  windowMs: 15 * 60 * 1000,
});
