/**
 * Bluesky (AT Protocol) provider adapter.
 *
 * Connect: app-password flow — the user supplies their handle/email + an app
 * password (created at https://bsky.app/settings/app-passwords). We exchange it
 * for a session via com.atproto.server.createSession. No OAuth redirect / app
 * registration is required, which is why Bluesky is the v1 pipeline-proof.
 */
import type {
  ConnectionTokens,
  PublishResult,
  PublishablePost,
  SocialProvider,
} from "../socialProviders";
import type { SocialAccount } from "../../../drizzle/schema";

const DEFAULT_PDS = "https://bsky.social";

function pdsOrigin(instanceUrl?: string | null): string {
  const raw = (instanceUrl && instanceUrl.trim()) || DEFAULT_PDS;
  return raw.replace(/\/+$/, "");
}

type CreateSessionResponse = {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
};

async function xrpcError(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `Bluesky ${res.status} ${res.statusText}${body ? `: ${body}` : ""}`;
}

export const blueskyProvider: SocialProvider = {
  platform: "bluesky",

  async connectWithCredentials({ identifier, secret, instanceUrl }) {
    const origin = pdsOrigin(instanceUrl);
    const res = await fetch(`${origin}/xrpc/com.atproto.server.createSession`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password: secret }),
    });
    if (!res.ok) throw new Error(await xrpcError(res));
    const data = (await res.json()) as CreateSessionResponse;
    const tokens: ConnectionTokens = {
      accessToken: data.accessJwt,
      refreshToken: data.refreshJwt,
      handle: data.handle,
      displayName: data.handle,
      platformUserId: data.did,
      instanceUrl: origin,
    };
    return tokens;
  },

  async refresh(refreshToken: string) {
    const res = await fetch(
      `${DEFAULT_PDS}/xrpc/com.atproto.server.refreshSession`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${refreshToken}` },
      }
    );
    if (!res.ok) throw new Error(await xrpcError(res));
    const data = (await res.json()) as CreateSessionResponse;
    return {
      accessToken: data.accessJwt,
      refreshToken: data.refreshJwt,
      handle: data.handle,
      platformUserId: data.did,
    } satisfies ConnectionTokens;
  },

  async publish(
    account: SocialAccount,
    tokens: ConnectionTokens,
    post: PublishablePost
  ): Promise<PublishResult> {
    const did = account.platformUserId;
    if (!did) return { ok: false, error: "Missing Bluesky DID for account" };
    const origin = pdsOrigin(account.instanceUrl);

    const res = await fetch(`${origin}/xrpc/com.atproto.repo.createRecord`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokens.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        repo: did,
        collection: "app.bsky.feed.post",
        record: {
          $type: "app.bsky.feed.post",
          text: post.content,
          createdAt: new Date().toISOString(),
        },
      }),
    });
    if (!res.ok) return { ok: false, error: await xrpcError(res) };

    const data = (await res.json()) as { uri?: string };
    const rkey = data.uri?.split("/").pop();
    const permalink =
      rkey && account.handle
        ? `https://bsky.app/profile/${account.handle}/post/${rkey}`
        : undefined;
    return { ok: true, externalId: data.uri, permalink };
  },
};
