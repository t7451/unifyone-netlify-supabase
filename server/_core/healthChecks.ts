/**
 * server/_core/healthChecks.ts
 *
 * Real liveness probes for /api/health v2.
 *
 * Each check pings a real dependency in parallel with a per-check timeout
 * (default 3s). Checks return a normalized shape so the health endpoint can
 * roll them up into a single overall status:
 *
 *   { status: "ok" | "down" | "unconfigured", latency_ms: number, error: string | null }
 *
 * "unconfigured" is returned when the corresponding env var is missing — this
 * lets us run the same probe on a preview deploy without secrets without it
 * lighting up the alerting pipeline.
 *
 * The overall rollup is computed by `rollupStatus`:
 *   - DB down  → overall "down"  (HTTP 503)
 *   - any other configured check failing → "degraded" (HTTP 200, but visible)
 *   - everything ok or unconfigured → "ok" (HTTP 200)
 *
 * Network-level dependencies use AbortController-backed timeouts; the neon
 * HTTP client is wrapped in Promise.race because it doesn't accept an
 * AbortSignal directly.
 */

export type CheckStatus = "ok" | "down" | "unconfigured";

export interface CheckResult {
  status: CheckStatus;
  latency_ms: number;
  error: string | null;
}

export interface HealthChecks {
  db: CheckResult;
  stripe: CheckResult;
  resend: CheckResult;
  redis: CheckResult;
}

export type Overall = "ok" | "degraded" | "down";

const DEFAULT_TIMEOUT_MS = 3000;

function unconfigured(): CheckResult {
  return { status: "unconfigured", latency_ms: 0, error: null };
}

function ok(latency_ms: number): CheckResult {
  return { status: "ok", latency_ms, error: null };
}

function down(latency_ms: number, error: unknown): CheckResult {
  return {
    status: "down",
    latency_ms,
    error:
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "unknown error",
  };
}

/**
 * Race a promise against a timeout. Resolves with the timeout-down result if
 * the inner promise doesn't settle in time. The inner promise is left to
 * finish in the background — this is fine for a health probe.
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<{ value?: T; error?: Error; timedOut?: boolean }> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<{ timedOut: true }>(resolve => {
      timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    });
    const work = fn().then(
      value => ({ value }),
      (error: unknown) => ({
        error: error instanceof Error ? error : new Error(String(error)),
      })
    );
    const result = (await Promise.race([work, timeoutPromise])) as
      | { value: T }
      | { error: Error }
      | { timedOut: true };
    if ("timedOut" in result) {
      return {
        error: new Error(`${label} timed out after ${timeoutMs}ms`),
        timedOut: true,
      };
    }
    if ("error" in result) return { error: result.error };
    return { value: (result as { value: T }).value };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual probes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pings Neon over HTTP (`SELECT 1`). Uses the same `neon()` HTTP client as
 * server/db.ts. Reads DATABASE_URL or NETLIFY_DATABASE_URL.
 *
 * Accepts an injected `neonFactory` for testability.
 */
export async function checkDb(
  opts: {
    databaseUrl?: string | null;
    timeoutMs?: number;
    neonFactory?: (url: string) => (q: string) => Promise<unknown>;
  } = {}
): Promise<CheckResult> {
  const url =
    opts.databaseUrl ??
    process.env.DATABASE_URL ??
    process.env.NETLIFY_DATABASE_URL ??
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ??
    null;
  if (!url) return unconfigured();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = Date.now();
  try {
    const factory =
      opts.neonFactory ??
      (async (u: string) => {
        const { neon } = await import("@neondatabase/serverless");
        return neon(u) as unknown as (q: string) => Promise<unknown>;
      });
    const sqlClient =
      typeof factory === "function" && factory.length === 1
        ? // synchronous-ish factory (used in tests)
          (factory as (u: string) => (q: string) => Promise<unknown>)(url)
        : await (
            factory as unknown as (
              u: string
            ) => Promise<(q: string) => Promise<unknown>>
          )(url);
    const r = await withTimeout(
      () => Promise.resolve(sqlClient("SELECT 1 as one")),
      timeoutMs,
      "db"
    );
    if (r.error) return down(Date.now() - start, r.error);
    return ok(Date.now() - start);
  } catch (err) {
    return down(Date.now() - start, err);
  }
}

/**
 * Pings Stripe via `stripe.balance.retrieve()`. Returns "unconfigured" when
 * STRIPE_SECRET_KEY is missing — we don't fail health when the key isn't set
 * (e.g. preview deploys).
 */
export async function checkStripe(
  opts: {
    apiKey?: string | null;
    timeoutMs?: number;
    fetcher?: typeof fetch;
  } = {}
): Promise<CheckResult> {
  const key = opts.apiKey ?? process.env.STRIPE_SECRET_KEY ?? null;
  if (!key) return unconfigured();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const f = opts.fetcher ?? fetch;
    const res = await f("https://api.stripe.com/v1/balance", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "Stripe-Version": "2024-11-20.acacia",
      },
      signal: ctl.signal,
    });
    if (!res.ok) {
      let bodyText = "";
      try {
        bodyText = (await res.text()).slice(0, 200);
      } catch {
        /* swallow */
      }
      return down(
        Date.now() - start,
        `Stripe HTTP ${res.status}: ${bodyText || "no body"}`
      );
    }
    return ok(Date.now() - start);
  } catch (err) {
    return down(Date.now() - start, err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pings Resend via `GET /domains`. Returns "unconfigured" when RESEND_API_KEY
 * is missing.
 */
export async function checkResend(
  opts: {
    apiKey?: string | null;
    timeoutMs?: number;
    fetcher?: typeof fetch;
  } = {}
): Promise<CheckResult> {
  const key = opts.apiKey ?? process.env.RESEND_API_KEY ?? null;
  if (!key) return unconfigured();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const f = opts.fetcher ?? fetch;
    const res = await f("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: ctl.signal,
    });
    if (!res.ok) {
      return down(Date.now() - start, `Resend HTTP ${res.status}`);
    }
    return ok(Date.now() - start);
  } catch (err) {
    return down(Date.now() - start, err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pings Upstash Redis via `GET /ping`. Returns "unconfigured" when both
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set.
 */
export async function checkRedis(
  opts: {
    url?: string | null;
    token?: string | null;
    timeoutMs?: number;
    fetcher?: typeof fetch;
  } = {}
): Promise<CheckResult> {
  const url = opts.url ?? process.env.UPSTASH_REDIS_REST_URL ?? null;
  const token = opts.token ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? null;
  if (!url || !token) return unconfigured();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const f = opts.fetcher ?? fetch;
    const trimmed = url.replace(/\/+$/, "");
    const res = await f(`${trimmed}/ping`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: ctl.signal,
    });
    if (!res.ok) {
      return down(Date.now() - start, `Redis HTTP ${res.status}`);
    }
    // Optional: confirm payload says PONG. Upstash returns { result: "PONG" }.
    try {
      const body = (await res.json()) as { result?: string };
      if (body && body.result && body.result.toUpperCase() !== "PONG") {
        return down(
          Date.now() - start,
          `Redis unexpected body: ${body.result}`
        );
      }
    } catch {
      // Body was not JSON — that's still an "ok" if the HTTP status was 2xx.
    }
    return ok(Date.now() - start);
  } catch (err) {
    return down(Date.now() - start, err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Roll up the four checks into an overall status.
 *
 *   - DB down                                 → "down"  (HTTP 503)
 *   - Any other configured check is "down"    → "degraded" (HTTP 200)
 *   - Everything is "ok" or "unconfigured"    → "ok"    (HTTP 200)
 */
export function rollupStatus(checks: HealthChecks): {
  overall: Overall;
  httpStatus: number;
} {
  if (checks.db.status === "down") return { overall: "down", httpStatus: 503 };
  const others = [checks.stripe, checks.resend, checks.redis];
  if (others.some(c => c.status === "down")) {
    return { overall: "degraded", httpStatus: 200 };
  }
  return { overall: "ok", httpStatus: 200 };
}

/**
 * Run all four checks in parallel. Used by the Netlify function.
 */
export async function runAllChecks(
  opts: {
    timeoutMs?: number;
  } = {}
): Promise<HealthChecks> {
  const [db, stripe, resend, redis] = await Promise.all([
    checkDb({ timeoutMs: opts.timeoutMs }),
    checkStripe({ timeoutMs: opts.timeoutMs }),
    checkResend({ timeoutMs: opts.timeoutMs }),
    checkRedis({ timeoutMs: opts.timeoutMs }),
  ]);
  return { db, stripe, resend, redis };
}
