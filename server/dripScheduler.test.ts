import { afterEach, describe, expect, it, vi } from "vitest";

describe("dripScheduler", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("does not throw on import when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;

    await expect(import("./_core/dripScheduler")).resolves.toBeDefined();
  });

  it("returns a graceful error when sending welcome email without RESEND_API_KEY", async () => {
    delete process.env.RESEND_API_KEY;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { sendWelcomeEmail } = await import("./_core/dripScheduler");
    const result = await sendWelcomeEmail("test@example.com");

    expect(result).toEqual({
      success: false,
      error: "Welcome email disabled: RESEND_API_KEY is not configured",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[Welcome] Welcome email disabled: RESEND_API_KEY is not configured"
    );
  });
});
