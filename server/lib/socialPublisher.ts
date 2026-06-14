/**
 * Social publish dispatch.
 *
 * Pushes a post to the tenant's connected accounts for each requested platform,
 * using the registered provider adapters. Returns a per-target outcome list and
 * never throws on a single platform's failure — the caller decides how to
 * surface partial success.
 *
 * This runs ALONGSIDE the `social.post.published` automation event (which stays
 * in place for operator n8n/Zapier flows); native publish does not replace it.
 *
 * Note: short-lived-token refresh (e.g. Bluesky accessJwt) is intentionally not
 * handled here yet — it lands with the scheduler, where stale tokens matter. An
 * immediate publish after connect uses the freshly stored token.
 */
import { getDecryptedConnection } from "./socialAccountStore";
import { getProvider, isSocialPlatform } from "./socialProviders";
import { registerBuiltinSocialProviders } from "./providers";

export type PublishOutcome = {
  platform: string;
  ok: boolean;
  externalId?: string;
  permalink?: string;
  error?: string;
  /** Set when the platform was skipped rather than attempted. */
  skipped?: "no-provider" | "not-connected";
};

export async function publishToConnectedAccounts(
  tenantId: number,
  platforms: string[],
  post: { content: string; mediaUrls?: string[] }
): Promise<PublishOutcome[]> {
  registerBuiltinSocialProviders();

  const outcomes: PublishOutcome[] = [];
  for (const platform of platforms) {
    const provider = isSocialPlatform(platform)
      ? getProvider(platform)
      : undefined;
    if (!provider || !isSocialPlatform(platform)) {
      // No native adapter — distribution for this platform is left to the
      // operator's automation flow.
      outcomes.push({ platform, ok: false, skipped: "no-provider" });
      continue;
    }

    const conn = await getDecryptedConnection(tenantId, platform);
    if (!conn || !conn.accessToken) {
      outcomes.push({ platform, ok: false, skipped: "not-connected" });
      continue;
    }

    try {
      const result = await provider.publish(
        conn.account,
        { accessToken: conn.accessToken, refreshToken: conn.refreshToken },
        { content: post.content, mediaUrls: post.mediaUrls }
      );
      outcomes.push({ platform, ...result });
    } catch (e: unknown) {
      outcomes.push({
        platform,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return outcomes;
}
