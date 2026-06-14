import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeInstanceUrl,
  registerMastodonApp,
  buildMastodonAuthorizeUrl,
  exchangeMastodonCode,
  verifyMastodonCredentials,
} from "./mastodonOAuth";

const okJson = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const errResponse = (status: number) =>
  ({
    ok: false,
    status,
    statusText: "Error",
    text: async () => "",
  }) as unknown as Response;

describe("normalizeInstanceUrl", () => {
  it("adds https and strips path/trailing slash", () => {
    expect(normalizeInstanceUrl("mastodon.social")).toBe(
      "https://mastodon.social"
    );
    expect(normalizeInstanceUrl("https://mastodon.social/")).toBe(
      "https://mastodon.social"
    );
    expect(normalizeInstanceUrl("https://m.example.com/foo")).toBe(
      "https://m.example.com"
    );
  });

  it("rejects empty / invalid input", () => {
    expect(normalizeInstanceUrl("")).toBeNull();
    expect(normalizeInstanceUrl("   ")).toBeNull();
    expect(normalizeInstanceUrl("not a url with spaces and ://")).toBeNull();
  });
});

describe("buildMastodonAuthorizeUrl", () => {
  it("builds an authorize URL with encoded params", () => {
    const url = buildMastodonAuthorizeUrl({
      instance: "https://mastodon.social",
      clientId: "abc",
      redirectUri: "https://app.example.com/api/social/mastodon/callback",
      state: "xyz",
    });
    expect(url).toContain("https://mastodon.social/oauth/authorize");
    expect(url).toContain("response_type=code");
    expect(url).toContain("client_id=abc");
    expect(url).toContain("scope=read%20write");
    expect(url).toContain(
      "redirect_uri=https%3A%2F%2Fapp.example.com%2Fapi%2Fsocial%2Fmastodon%2Fcallback"
    );
    expect(url).toContain("state=xyz");
  });
});

describe("mastodon HTTP helpers", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("registers an app and returns credentials", async () => {
    fetchMock.mockResolvedValue(
      okJson({ client_id: "CID", client_secret: "CSECRET" })
    );
    const creds = await registerMastodonApp(
      "https://mastodon.social",
      "https://app/cb"
    );
    expect(creds).toEqual({ clientId: "CID", clientSecret: "CSECRET" });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://mastodon.social/api/v1/apps"
    );
  });

  it("throws when app registration fails", async () => {
    fetchMock.mockResolvedValue(errResponse(500));
    await expect(
      registerMastodonApp("https://mastodon.social", "https://app/cb")
    ).rejects.toThrow(/registration failed/);
  });

  it("exchanges a code for an access token", async () => {
    fetchMock.mockResolvedValue(okJson({ access_token: "AT" }));
    const token = await exchangeMastodonCode({
      instance: "https://mastodon.social",
      clientId: "CID",
      clientSecret: "CSECRET",
      code: "CODE",
      redirectUri: "https://app/cb",
    });
    expect(token).toBe("AT");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://mastodon.social/oauth/token"
    );
  });

  it("reads the account and builds a full handle", async () => {
    fetchMock.mockResolvedValue(
      okJson({
        id: 42,
        username: "alice",
        acct: "alice",
        display_name: "Alice",
        avatar: "https://cdn/a.png",
      })
    );
    const profile = await verifyMastodonCredentials(
      "https://mastodon.social",
      "AT"
    );
    expect(profile).toEqual({
      id: "42",
      handle: "@alice@mastodon.social",
      displayName: "Alice",
      avatar: "https://cdn/a.png",
    });
  });
});
