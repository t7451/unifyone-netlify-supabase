import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./providers", () => ({
  registerBuiltinSocialProviders: vi.fn(),
}));

const publish = vi.fn();
const KNOWN = ["twitter", "bluesky", "mastodon"];
vi.mock("./socialProviders", () => ({
  isSocialPlatform: (p: unknown) => typeof p === "string" && KNOWN.includes(p),
  getProvider: vi.fn((platform: string) =>
    platform === "bluesky" ? { platform: "bluesky", publish } : undefined
  ),
}));

const getDecryptedConnection = vi.fn();
vi.mock("./socialAccountStore", () => ({
  getDecryptedConnection: (...args: unknown[]) =>
    getDecryptedConnection(...args),
}));

import { publishToConnectedAccounts } from "./socialPublisher";

const connected = {
  account: { id: 1, platform: "bluesky", platformUserId: "did:x" },
  accessToken: "ACCESS",
  refreshToken: "REFRESH",
};

describe("publishToConnectedAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDecryptedConnection.mockResolvedValue(connected);
    publish.mockResolvedValue({ ok: true, externalId: "uri", permalink: "p" });
  });

  it("publishes to a connected platform with decrypted tokens", async () => {
    const out = await publishToConnectedAccounts(7, ["bluesky"], {
      content: "hi",
    });
    expect(getDecryptedConnection).toHaveBeenCalledWith(7, "bluesky");
    expect(publish).toHaveBeenCalledWith(
      connected.account,
      { accessToken: "ACCESS", refreshToken: "REFRESH" },
      { content: "hi", mediaUrls: undefined }
    );
    expect(out).toEqual([
      { platform: "bluesky", ok: true, externalId: "uri", permalink: "p" },
    ]);
  });

  it("skips platforms with no registered adapter (left to automation)", async () => {
    const out = await publishToConnectedAccounts(7, ["twitter"], {
      content: "hi",
    });
    expect(publish).not.toHaveBeenCalled();
    expect(out).toEqual([
      { platform: "twitter", ok: false, skipped: "no-provider" },
    ]);
  });

  it("skips when the platform is not connected", async () => {
    getDecryptedConnection.mockResolvedValue(null);
    const out = await publishToConnectedAccounts(7, ["bluesky"], {
      content: "hi",
    });
    expect(publish).not.toHaveBeenCalled();
    expect(out).toEqual([
      { platform: "bluesky", ok: false, skipped: "not-connected" },
    ]);
  });

  it("captures a thrown adapter error as a failed outcome (no throw)", async () => {
    publish.mockRejectedValue(new Error("network down"));
    const out = await publishToConnectedAccounts(7, ["bluesky"], {
      content: "hi",
    });
    expect(out).toEqual([
      { platform: "bluesky", ok: false, error: "network down" },
    ]);
  });

  it("returns one outcome per platform, in order", async () => {
    const out = await publishToConnectedAccounts(7, ["bluesky", "twitter"], {
      content: "hi",
    });
    expect(out.map(o => o.platform)).toEqual(["bluesky", "twitter"]);
  });
});
