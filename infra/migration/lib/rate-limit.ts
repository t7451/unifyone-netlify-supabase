// Simple token-bucket rate limiter for Clerk API calls.
// Refills `rps` tokens per second up to a burst capacity of `rps`. Before each
// Clerk call, `await limiter.take()` blocks just long enough to respect the cap.

export function createTokenBucket(rps: number) {
  let tokens = rps;
  let lastRefill = Date.now();

  async function take(): Promise<void> {
    // Refill.
    const now = Date.now();
    const elapsedMs = now - lastRefill;
    if (elapsedMs > 0) {
      tokens = Math.min(rps, tokens + (elapsedMs / 1000) * rps);
      lastRefill = now;
    }
    if (tokens >= 1) {
      tokens -= 1;
      return;
    }
    // Wait until at least one token is available.
    const waitMs = Math.ceil(((1 - tokens) / rps) * 1000);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    return take();
  }

  return { take };
}
