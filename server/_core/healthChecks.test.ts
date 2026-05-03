/**
 * Tests for healthChecks.ts. We mock fetch + the neon HTTP client so these
 * tests don't touch the network. Coverage:
 *
 *   - all-green        → status "ok",       httpStatus 200
 *   - db-down          → status "down",     httpStatus 503
 *   - stripe-degraded  → status "degraded", httpStatus 200
 *   - unconfigured     → status "ok",       httpStatus 200 (env vars missing)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  checkDb,
  checkStripe,
  checkResend,
  checkRedis,
  rollupStatus,
  runAllChecks,
} from "./healthChecks";

function mockResponse(status: number, body: unknown = { ok: true }): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ENV_KEYS = [
  "DATABASE_URL",
  "NETLIFY_DATABASE_URL",
  "NETLIFY_DATABASE_URL_UNPOOLED",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("checkDb", () => {
  it("returns 'unconfigured' when DATABASE_URL is unset", async () => {
    const r = await checkDb({});
    expect(r.status).toBe("unconfigured");
    expect(r.error).toBeNull();
  });

  it("returns 'ok' when neon SELECT 1 succeeds", async () => {
    const queryFn = vi.fn().mockResolvedValue([{ one: 1 }]);
    const r = await checkDb({
      databaseUrl: "postgres://x",
      neonFactory: () => ({ query: queryFn }),
    });
    expect(r.status).toBe("ok");
    expect(queryFn).toHaveBeenCalledWith("SELECT 1 as one");
  });

  it("returns 'down' when neon throws", async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error("connection refused"));
    const r = await checkDb({
      databaseUrl: "postgres://x",
      neonFactory: () => ({ query: queryFn }),
    });
    expect(r.status).toBe("down");
    expect(r.error).toMatch(/connection refused/);
  });

  it("returns 'down' when the query never resolves before the timeout", async () => {
    const queryFn = vi.fn(() => new Promise<unknown>(() => {})); // hangs
    const r = await checkDb({
      databaseUrl: "postgres://x",
      neonFactory: () => ({ query: queryFn }),
      timeoutMs: 25,
    });
    expect(r.status).toBe("down");
    expect(r.error).toMatch(/timed out/);
  });

  it("returns 'down' with a clear message when the neon client lacks .query()", async () => {
    const r = await checkDb({
      databaseUrl: "postgres://x",
      // @ts-expect-error — intentional bad shape
      neonFactory: () => ({}),
    });
    expect(r.status).toBe("down");
    expect(r.error).toMatch(/missing \.query/);
  });
});

describe("checkStripe", () => {
  it("returns 'unconfigured' when STRIPE_SECRET_KEY is unset", async () => {
    const r = await checkStripe({});
    expect(r.status).toBe("unconfigured");
  });

  it("returns 'ok' when /v1/balance returns 200", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { available: [] }));
    const r = await checkStripe({
      apiKey: "sk_test_x",
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(r.status).toBe("ok");
    const url = fetcher.mock.calls[0][0] as string;
    expect(url).toBe("https://api.stripe.com/v1/balance");
  });

  it("returns 'down' on non-2xx", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(mockResponse(401, { error: "bad key" }));
    const r = await checkStripe({
      apiKey: "sk_test_x",
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(r.status).toBe("down");
    expect(r.error).toMatch(/Stripe HTTP 401/);
  });
});

describe("checkResend", () => {
  it("returns 'unconfigured' when RESEND_API_KEY is unset", async () => {
    const r = await checkResend({});
    expect(r.status).toBe("unconfigured");
  });

  it("returns 'ok' on 200", async () => {
    const fetcher = vi.fn().mockResolvedValue(mockResponse(200, { data: [] }));
    const r = await checkResend({
      apiKey: "re_x",
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(r.status).toBe("ok");
    expect(fetcher.mock.calls[0][0]).toBe("https://api.resend.com/domains");
  });

  it("returns 'down' on 500", async () => {
    const fetcher = vi.fn().mockResolvedValue(mockResponse(500, { err: "x" }));
    const r = await checkResend({
      apiKey: "re_x",
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(r.status).toBe("down");
  });
});

describe("checkRedis", () => {
  it("returns 'unconfigured' when url+token missing", async () => {
    const r = await checkRedis({});
    expect(r.status).toBe("unconfigured");
  });

  it("returns 'ok' on 200 PONG", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(mockResponse(200, { result: "PONG" }));
    const r = await checkRedis({
      url: "https://x.upstash.io/",
      token: "t",
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(r.status).toBe("ok");
    expect(fetcher.mock.calls[0][0]).toBe("https://x.upstash.io/ping");
  });

  it("returns 'down' on non-2xx", async () => {
    const fetcher = vi.fn().mockResolvedValue(mockResponse(403, ""));
    const r = await checkRedis({
      url: "https://x.upstash.io",
      token: "t",
      fetcher: fetcher as unknown as typeof fetch,
    });
    expect(r.status).toBe("down");
  });
});

describe("rollupStatus", () => {
  const okCheck = { status: "ok" as const, latency_ms: 1, error: null };
  const downCheck = { status: "down" as const, latency_ms: 1, error: "x" };
  const unconf = {
    status: "unconfigured" as const,
    latency_ms: 0,
    error: null,
  };

  it("all green → ok / 200", () => {
    expect(
      rollupStatus({
        db: okCheck,
        stripe: okCheck,
        resend: okCheck,
        redis: okCheck,
      })
    ).toEqual({ overall: "ok", httpStatus: 200 });
  });

  it("db down → down / 503", () => {
    expect(
      rollupStatus({
        db: downCheck,
        stripe: okCheck,
        resend: okCheck,
        redis: okCheck,
      })
    ).toEqual({ overall: "down", httpStatus: 503 });
  });

  it("stripe down (db ok) → degraded / 200", () => {
    expect(
      rollupStatus({
        db: okCheck,
        stripe: downCheck,
        resend: okCheck,
        redis: okCheck,
      })
    ).toEqual({ overall: "degraded", httpStatus: 200 });
  });

  it("everything unconfigured → ok / 200", () => {
    expect(
      rollupStatus({
        db: unconf,
        stripe: unconf,
        resend: unconf,
        redis: unconf,
      })
    ).toEqual({ overall: "ok", httpStatus: 200 });
  });

  it("db ok, redis down → degraded / 200", () => {
    expect(
      rollupStatus({
        db: okCheck,
        stripe: okCheck,
        resend: okCheck,
        redis: downCheck,
      })
    ).toEqual({ overall: "degraded", httpStatus: 200 });
  });
});

describe("runAllChecks", () => {
  it("aggregates all four probes (all unconfigured by default)", async () => {
    const r = await runAllChecks();
    expect(r.db.status).toBe("unconfigured");
    expect(r.stripe.status).toBe("unconfigured");
    expect(r.resend.status).toBe("unconfigured");
    expect(r.redis.status).toBe("unconfigured");
  });
});
