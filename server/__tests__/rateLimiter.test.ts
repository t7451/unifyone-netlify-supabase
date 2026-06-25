import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "../_core/rateLimiter";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Basic allow / deny ────────────────────────────────────────────────────

  it("allows the first request", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 3,
      windowMs: 60_000,
    });
    expect((await limiter.check("1.2.3.4")).allowed).toBe(true);
  });

  it("allows up to maxAttempts within the window", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 3,
      windowMs: 60_000,
    });
    expect((await limiter.check("1.2.3.4")).allowed).toBe(true);
    expect((await limiter.check("1.2.3.4")).allowed).toBe(true);
    expect((await limiter.check("1.2.3.4")).allowed).toBe(true);
  });

  it("blocks the (maxAttempts + 1)th request", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 3,
      windowMs: 60_000,
    });
    await limiter.check("1.2.3.4");
    await limiter.check("1.2.3.4");
    await limiter.check("1.2.3.4");
    const result = await limiter.check("1.2.3.4");
    expect(result.allowed).toBe(false);
  });

  it("returns a positive retryAfterMs when blocked", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 2,
      windowMs: 60_000,
    });
    await limiter.check("ip");
    await limiter.check("ip");
    const result = await limiter.check("ip");
    if (result.allowed) throw new Error("Expected blocked");
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  // ── Sliding window behaviour ──────────────────────────────────────────────

  it("re-allows requests after the window has fully elapsed", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 2,
      windowMs: 10_000,
    });
    vi.setSystemTime(0);
    await limiter.check("ip");
    await limiter.check("ip");

    // Advance past the window
    vi.advanceTimersByTime(10_001);

    // Now the old attempts are outside the window — should be allowed again
    expect((await limiter.check("ip")).allowed).toBe(true);
  });

  it("partial window expiry: expired attempts slide out, fresh remain", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 3,
      windowMs: 10_000,
    });
    vi.setSystemTime(0);
    await limiter.check("ip"); // t=0
    await limiter.check("ip"); // t=0

    // Advance 6 s — these two attempts are now almost out of the 10 s window
    vi.advanceTimersByTime(6_000); // t=6000
    await limiter.check("ip"); // t=6000 — 3rd attempt, now at the limit

    // Blocked at t=6000
    expect((await limiter.check("ip")).allowed).toBe(false);

    // Advance another 4.1 s — the t=0 attempts fall out of the 10 s window
    vi.advanceTimersByTime(4_100); // t=10100
    // Now only the t=6000 attempt remains — below maxAttempts(3)
    expect((await limiter.check("ip")).allowed).toBe(true);
  });

  it("retryAfterMs reflects the oldest timestamp in the window", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 1,
      windowMs: 60_000,
    });
    vi.setSystemTime(1_000);
    await limiter.check("ip"); // hits limit

    vi.advanceTimersByTime(10_000); // t=11000 — oldest attempt is 10 s ago
    const result = await limiter.check("ip");
    if (result.allowed) throw new Error("Expected blocked");
    // retryAfterMs = windowMs - (now - oldest) = 60000 - 10000 = 50000
    expect(result.retryAfterMs).toBeCloseTo(50_000, -2);
  });

  // ── Key isolation ─────────────────────────────────────────────────────────

  it("tracks separate counters for different keys", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 1,
      windowMs: 60_000,
    });
    await limiter.check("ip-A"); // exhausts ip-A
    expect((await limiter.check("ip-B")).allowed).toBe(true); // ip-B is fresh
    expect((await limiter.check("ip-A")).allowed).toBe(false); // ip-A is blocked
  });

  // ── reset() ──────────────────────────────────────────────────────────────

  it("reset() allows an exhausted key immediately", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 1,
      windowMs: 60_000,
    });
    await limiter.check("ip");
    expect((await limiter.check("ip")).allowed).toBe(false);
    await limiter.reset("ip");
    expect((await limiter.check("ip")).allowed).toBe(true);
  });

  it("reset() on an unknown key is a no-op", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 2,
      windowMs: 60_000,
    });
    await limiter.reset("ghost"); // should not throw
    expect((await limiter.check("ghost")).allowed).toBe(true);
  });

  it("reset() does not affect other keys", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 1,
      windowMs: 60_000,
    });
    await limiter.check("ip-A");
    await limiter.check("ip-B");
    await limiter.reset("ip-A");
    // ip-A is fresh again; ip-B still exhausted
    expect((await limiter.check("ip-A")).allowed).toBe(true);
    expect((await limiter.check("ip-B")).allowed).toBe(false);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("maxAttempts of 1 blocks the second call immediately", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 1,
      windowMs: 5_000,
    });
    expect((await limiter.check("ip")).allowed).toBe(true);
    expect((await limiter.check("ip")).allowed).toBe(false);
  });

  it("blocked check call does not add a new timestamp (stays blocked)", async () => {
    const limiter = createRateLimiter({
      name: "test",
      maxAttempts: 2,
      windowMs: 60_000,
    });
    vi.setSystemTime(0);
    await limiter.check("ip"); // t=0
    await limiter.check("ip"); // t=0 — at limit

    vi.advanceTimersByTime(1_000);
    // This blocked call must NOT push a new timestamp at t=1000
    const blocked1 = await limiter.check("ip");
    expect(blocked1.allowed).toBe(false);

    vi.advanceTimersByTime(1_000);
    const blocked2 = await limiter.check("ip");
    expect(blocked2.allowed).toBe(false);

    // After the original window expires (60 s from t=0), should unblock
    vi.advanceTimersByTime(58_001);
    expect((await limiter.check("ip")).allowed).toBe(true);
  });
});
