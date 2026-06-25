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

/** Key prefix used for both the Ratelimit instance and manual key deletion. */
const RATE_LIMIT_PREFIX = "rl";

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
      prefix: RATE_LIMIT_PREFIX,
    });

    return {
      async check(key: string): Promise<RateLimitResult> {
        const { success, reset } = await upstash.limit(key);
        if (success) return { allowed: true };
        const retryAfterMs = Math.max(0, reset - Date.now());
        return { allowed: false, retryAfterMs };
      },
      async reset(key: string): Promise<void> {
        // Upstash Ratelimit stores the sliding-window ZSET at `{prefix}:{key}`.
        // Deleting this key resets the counter for that identifier.
        await redis.del(`${RATE_LIMIT_PREFIX}:${key}`);
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

/**
 * Email-verification link clicks: 30 per 15 minutes per IP.
 *
 * Deliberately generous — the security boundary here is the high-entropy,
 * single-purpose verification token in the URL, not the IP. Mail clients
 * (Gmail, Outlook, corporate link scanners) routinely prefetch links, and the
 * SPA can re-issue the request on remount, so a tight bucket trips "Too many
 * attempts" before the human ever taps. This limiter exists only to cap
 * egregious abuse, not to gate normal confirmation flows. Must NOT share a
 * bucket with password reset.
 */
export const emailVerifyLimiter = createRateLimiter({
  maxAttempts: 30,
  windowMs: 15 * 60 * 1000,
});

/** Resend-verification email requests: 5 per 15 minutes per IP (anti-spam). */
export const resendVerificationLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});

/** LLM-backed endpoints: 20 calls per 5 minutes per user/IP — cost guard. */
export const llmRateLimiter = createRateLimiter({
  maxAttempts: 20,
  windowMs: 5 * 60 * 1000,
});

/**
 * Public form/event endpoints (waitlists, leads, analytics relays):
 * 30 submissions per 5 minutes per IP. Tighter than auth because the
 * intent is anti-spam, not anti-bruteforce.
 */
export const publicFormLimiter = createRateLimiter({
  maxAttempts: 30,
  windowMs: 5 * 60 * 1000,
});

/** Checkout/order creation: 50 writes per minute per caller IP. */
export const orderCreateLimiter = createRateLimiter({
  maxAttempts: 50,
  windowMs: 60 * 1000,
});

/** Subscription plan changes: 10 per hour per caller IP. */
export const subscriptionChangePlanLimiter = createRateLimiter({
  maxAttempts: 10,
  windowMs: 60 * 60 * 1000,
});

/** Authenticated image uploads: 20 per minute per caller IP. */
export const imageUploadLimiter = createRateLimiter({
  maxAttempts: 20,
  windowMs: 60 * 1000,
});

/**
 * MCP / external worker proxies (knowledge graph, terpforge catalog):
 * 60 calls per minute per user — generous for UI polling but caps abuse.
 */
export const mcpRateLimiter = createRateLimiter({
  maxAttempts: 60,
  windowMs: 60 * 1000,
});
