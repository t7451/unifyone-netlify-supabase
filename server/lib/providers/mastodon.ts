/**
 * Mastodon provider adapter (publish).
 *
 * Connect is handled by the per-instance OAuth routes in server/mastodonOAuth.ts
 * (app registration → authorize → callback). This adapter implements posting:
 * POST {instance}/api/v1/statuses with the stored bearer token. Mastodon access
 * tokens do not expire by default, so no refresh path is needed.
 */
import type {
  ConnectionTokens,
  PublishResult,
  PublishablePost,
  SocialProvider,
} from "../socialProviders";
import type { SocialAccount } from "../../../drizzle/schema";

function instanceOrigin(instanceUrl?: string | null): string | null {
  if (!instanceUrl) return null;
  return instanceUrl.trim().replace(/\/+$/, "") || null;
}

export const mastodonProvider: SocialProvider = {
  platform: "mastodon",

  async publish(
    account: SocialAccount,
    tokens: ConnectionTokens,
    post: PublishablePost
  ): Promise<PublishResult> {
    const origin = instanceOrigin(account.instanceUrl);
    if (!origin) {
      return { ok: false, error: "Missing Mastodon instance URL for account" };
    }

    const res = await fetch(`${origin}/api/v1/statuses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokens.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: post.content }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Mastodon ${res.status} ${res.statusText}${
          body ? `: ${body}` : ""
        }`,
      };
    }

    const data = (await res.json()) as { id?: string; url?: string };
    return { ok: true, externalId: data.id, permalink: data.url };
  },
};
