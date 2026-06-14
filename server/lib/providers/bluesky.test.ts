import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { blueskyProvider } from "./bluesky";
import type { SocialAccount } from "../../../drizzle/schema";

const okJson = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const errResponse = (status: number, body = "nope") =>
  ({
    ok: false,
    status,
    statusText: "Error",
    json: async () => ({}),
    text: async () => body,
  }) as unknown as Response;

const account = (over: Partial<SocialAccount> = {}): SocialAccount =>
  ({
    id: 1,
    tenantId: 7,
    platform: "bluesky",
    handle: "alice.bsky.social",
    platformUserId: "did:plc:abc123",
    instanceUrl: "https://bsky.social",
    accessToken: null,
    refreshToken: null,
    ...over,
  }) as SocialAccount;

describe("blueskyProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("connects via app password and maps the session", async () => {
    fetchMock.mockResolvedValue(
      okJson({
        accessJwt: "ACCESS",
        refreshJwt: "REFRESH",
        handle: "alice.bsky.social",
        did: "did:plc:abc123",
      })
    );

    const tokens = await blueskyProvider.connectWithCredentials!({
      identifier: "alice.bsky.social",
      secret: "app-pass-1234",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://bsky.social/xrpc/com.atproto.server.createSession"
    );
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      identifier: "alice.bsky.social",
      password: "app-pass-1234",
    });
    expect(tokens).toMatchObject({
      accessToken: "ACCESS",
      refreshToken: "REFRESH",
      handle: "alice.bsky.social",
      platformUserId: "did:plc:abc123",
      instanceUrl: "https://bsky.social",
    });
  });

  it("honors a custom PDS instance and strips trailing slash", async () => {
    fetchMock.mockResolvedValue(
      okJson({ accessJwt: "a", refreshJwt: "r", handle: "h", did: "d" })
    );
    await blueskyProvider.connectWithCredentials!({
      identifier: "h",
      secret: "s",
      instanceUrl: "https://pds.example.com/",
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://pds.example.com/xrpc/com.atproto.server.createSession"
    );
  });

  it("throws on a failed connect", async () => {
    fetchMock.mockResolvedValue(errResponse(401, "bad creds"));
    await expect(
      blueskyProvider.connectWithCredentials!({ identifier: "x", secret: "y" })
    ).rejects.toThrow(/Bluesky 401/);
  });

  it("publishes a post and builds a permalink", async () => {
    fetchMock.mockResolvedValue(
      okJson({ uri: "at://did:plc:abc123/app.bsky.feed.post/3kxyz" })
    );
    const res = await blueskyProvider.publish(
      account(),
      { accessToken: "ACCESS" },
      { content: "hello world" }
    );
    expect(res).toEqual({
      ok: true,
      externalId: "at://did:plc:abc123/app.bsky.feed.post/3kxyz",
      permalink: "https://bsky.app/profile/alice.bsky.social/post/3kxyz",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://bsky.social/xrpc/com.atproto.repo.createRecord");
    expect((init as RequestInit).headers).toMatchObject({
      authorization: "Bearer ACCESS",
    });
  });

  it("returns ok:false on a publish API error", async () => {
    fetchMock.mockResolvedValue(errResponse(500, "boom"));
    const res = await blueskyProvider.publish(
      account(),
      { accessToken: "ACCESS" },
      { content: "x" }
    );
    expect(res.ok).toBe(false);
  });

  it("fails fast when the account has no DID", async () => {
    const res = await blueskyProvider.publish(
      account({ platformUserId: null }),
      { accessToken: "ACCESS" },
      { content: "x" }
    );
    expect(res).toEqual({
      ok: false,
      error: "Missing Bluesky DID for account",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
