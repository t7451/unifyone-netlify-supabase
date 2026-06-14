import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mastodonProvider } from "./mastodon";
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
    text: async () => body,
  }) as unknown as Response;

const account = (over: Partial<SocialAccount> = {}): SocialAccount =>
  ({
    id: 1,
    tenantId: 7,
    platform: "mastodon",
    handle: "@alice@mastodon.social",
    instanceUrl: "https://mastodon.social",
    ...over,
  }) as SocialAccount;

describe("mastodonProvider.publish", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("posts a status and returns id + url", async () => {
    fetchMock.mockResolvedValue(
      okJson({ id: "12345", url: "https://mastodon.social/@alice/12345" })
    );
    const res = await mastodonProvider.publish(
      account(),
      { accessToken: "TOKEN" },
      { content: "hello fedi" }
    );
    expect(res).toEqual({
      ok: true,
      externalId: "12345",
      permalink: "https://mastodon.social/@alice/12345",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://mastodon.social/api/v1/statuses");
    expect((init as RequestInit).headers).toMatchObject({
      authorization: "Bearer TOKEN",
    });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      status: "hello fedi",
    });
  });

  it("fails fast without an instance URL", async () => {
    const res = await mastodonProvider.publish(
      account({ instanceUrl: null }),
      { accessToken: "TOKEN" },
      { content: "x" }
    );
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns ok:false on an API error", async () => {
    fetchMock.mockResolvedValue(errResponse(422, "rejected"));
    const res = await mastodonProvider.publish(
      account(),
      { accessToken: "TOKEN" },
      { content: "x" }
    );
    expect(res.ok).toBe(false);
  });
});
