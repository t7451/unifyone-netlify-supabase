import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyTurnstileToken } from "../_core/turnstile";

describe("verifyTurnstileToken", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("skips verification (succeeds) when TURNSTILE_SECRET_KEY is unset", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await verifyTurnstileToken("any-token", "1.2.3.4");

    expect(result.success).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails when a secret key is configured but no token is provided", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await verifyTurnstileToken(undefined, "1.2.3.4");

    expect(result.success).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls Cloudflare siteverify with the secret, token, and remote IP", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await verifyTurnstileToken("cf-token", "9.8.7.6");

    expect(result.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    );
    const sentBody = (init.body as URLSearchParams).toString();
    expect(sentBody).toContain("secret=secret");
    expect(sentBody).toContain("response=cf-token");
    expect(sentBody).toContain("remoteip=9.8.7.6");
  });

  it("fails when Cloudflare reports success=false", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    }) as unknown as typeof fetch;

    const result = await verifyTurnstileToken("bad-token");

    expect(result.success).toBe(false);
  });

  it("fails closed when the siteverify request throws", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await verifyTurnstileToken("cf-token");

    expect(result.success).toBe(false);
  });
});
