import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./providers", () => ({
  registerBuiltinSocialProviders: vi.fn(),
}));

const publish = vi.fn();
const refresh = vi.fn();
const KNOWN = ["twitter", "bluesky", "mastodon"];
vi.mock("./socialProviders", () => ({
  isSocialPlatform: (p: unknown) => typeof p === "string" && KNOWN.includes(p),
  getProvider: vi.fn((platform: string) =>
    platform === "bluesky"
      ? { platform: "bluesky", publish, refresh }
      : undefined
  ),
}));

const getDecryptedConnection = vi.fn();
const updateConnectionTokens = vi.fn();
vi.mock("./socialAccountStore", () => ({
  getDecryptedConnection: (...args: unknown[]) =>
    getDecryptedConnection(...args),
  updateConnectionTokens: (...args: unknown[]) =>
    updateConnectionTokens(...args),
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

  it("refreshes the token and retries once on an auth failure", async () => {
    publish
      .mockResolvedValueOnce({ ok: false, error: "Bluesky 401: ExpiredToken" })
      .mockResolvedValueOnce({ ok: true, externalId: "uri2" });
    refresh.mockResolvedValue({
      accessToken: "NEW",
      refreshToken: "NEWREFRESH",
    });

    const out = await publishToConnectedAccounts(7, ["bluesky"], {
      content: "hi",
    });

    expect(refresh).toHaveBeenCalledWith("REFRESH");
    expect(updateConnectionTokens).toHaveBeenCalledWith(7, "bluesky", {
      accessToken: "NEW",
      refreshToken: "NEWREFRESH",
      expiresAt: null,
    });
    // Retry used the refreshed access token.
    expect(publish).toHaveBeenLastCalledWith(
      connected.account,
      { accessToken: "NEW", refreshToken: "NEWREFRESH" },
      { content: "hi", mediaUrls: undefined }
    );
    expect(out).toEqual([
      { platform: "bluesky", ok: true, externalId: "uri2" },
    ]);
  });

  it("keeps the original failure when refresh itself fails", async () => {
    publish.mockResolvedValue({
      ok: false,
      error: "Bluesky 401: ExpiredToken",
    });
    refresh.mockRejectedValue(new Error("refresh broke"));

    const out = await publishToConnectedAccounts(7, ["bluesky"], {
      content: "hi",
    });
    expect(out).toEqual([
      { platform: "bluesky", ok: false, error: "Bluesky 401: ExpiredToken" },
    ]);
  });

  it("does not refresh on a non-auth failure", async () => {
    publish.mockResolvedValue({ ok: false, error: "Bluesky 500: server" });
    const out = await publishToConnectedAccounts(7, ["bluesky"], {
      content: "hi",
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(out[0].ok).toBe(false);
  });
});
