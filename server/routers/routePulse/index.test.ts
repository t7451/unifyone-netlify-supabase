/**
 * routePulse router — validation and rate-limiting for importStopsFromImage.
 * Exercises the procedure through router.createCaller (zod input parsing +
 * the publicRateLimitedProcedure middleware), not just the underlying
 * service function — routePulse.service.test.ts already covers the
 * extraction/parsing logic in isolation.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("./routePulse.service", async () => {
  const actual = await vi.importActual<typeof import("./routePulse.service")>(
    "./routePulse.service"
  );
  return {
    ...actual,
    extractStopsFromImage: vi
      .fn()
      .mockResolvedValue([
        { address: "123 SW Main St, Portland, OR", label: null, dueBy: null },
      ]),
  };
});

import { routePulseRouter } from "./index";
import * as service from "./routePulse.service";

function buildCtx(ip: string) {
  return {
    req: {
      headers: {},
      ip,
      socket: { remoteAddress: ip },
    },
    res: {},
  } as any;
}

const VALID_IMAGE_DATA_URL = "data:image/jpeg;base64," + "A".repeat(100);

describe("routePulseRouter.importStopsFromImage", () => {
  it("rejects a non-data-URL input before ever calling the service", async () => {
    const caller = routePulseRouter.createCaller(buildCtx("1.1.1.1"));
    await expect(
      caller.importStopsFromImage({ imageDataUrl: "https://example.com/x.jpg" })
    ).rejects.toThrow();
    expect(service.extractStopsFromImage).not.toHaveBeenCalled();
  });

  it("rejects an oversized data URL before ever calling the service", async () => {
    const caller = routePulseRouter.createCaller(buildCtx("1.1.1.2"));
    const huge = "data:image/jpeg;base64," + "A".repeat(10_000_001);
    await expect(
      caller.importStopsFromImage({ imageDataUrl: huge })
    ).rejects.toThrow();
    expect(service.extractStopsFromImage).not.toHaveBeenCalled();
  });

  it("delegates a valid data URL straight to the service", async () => {
    const caller = routePulseRouter.createCaller(buildCtx("1.1.1.3"));
    const result = await caller.importStopsFromImage({
      imageDataUrl: VALID_IMAGE_DATA_URL,
    });
    expect(result).toEqual([
      { address: "123 SW Main St, Portland, OR", label: null, dueBy: null },
    ]);
    expect(service.extractStopsFromImage).toHaveBeenCalledWith(
      VALID_IMAGE_DATA_URL
    );
  });

  it("enforces routeSheetImportLimiter (6 per 5 min) — the 7th call from the same IP is rate-limited", async () => {
    const ctx = buildCtx("1.1.1.4");
    const caller = routePulseRouter.createCaller(ctx);
    for (let i = 0; i < 6; i++) {
      await caller.importStopsFromImage({ imageDataUrl: VALID_IMAGE_DATA_URL });
    }
    await expect(
      caller.importStopsFromImage({ imageDataUrl: VALID_IMAGE_DATA_URL })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
