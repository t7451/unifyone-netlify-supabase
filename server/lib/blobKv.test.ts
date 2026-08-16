import { describe, it, expect, vi } from "vitest";

vi.mock("@netlify/blobs", () => ({
  getStore: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { blobKvGet, blobKvSet, BlobKvNS } from "./blobKv";

describe("blobKv", () => {
  it("exposes stable namespaces", () => {
    expect(BlobKvNS.routePulseRoutes).toBe("rp-routes");
    expect(BlobKvNS.routePulseGeocode).toBe("rp-geocode");
  });

  it("get returns null on miss without throwing", async () => {
    await expect(blobKvGet("rp-routes", "missing-key")).resolves.toBeNull();
  });

  it("set does not throw when store is mocked", async () => {
    await expect(
      blobKvSet("rp-routes", "k", { ok: true }, 60_000)
    ).resolves.toBeUndefined();
  });
});
