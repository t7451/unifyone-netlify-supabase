/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Works for both the Express server and Netlify Functions (single-process).
 * Best-effort for multi-instance deployments — no cross-process state, but
 * still meaningfully limits single-IP brute-force attempts per instance.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 });
 *   const result = limiter.check(ipAddress);
 *   if (!result.allowed) return 429 response;
 */

type RateLimitEntry = {
  attempts: number[]; // timestamps (ms) of recent attempts within the window
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export function createRateLimiter(opts: {
  maxAttempts: number;
  windowMs: number;
}) {
  const { maxAttempts, windowMs } = opts;
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
    check(key: string): RateLimitResult {
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

    reset(key: string): void {
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
