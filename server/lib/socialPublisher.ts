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
import {
  getDecryptedConnection,
  updateConnectionTokens,
} from "./socialAccountStore";
import {
  getProvider,
  isSocialPlatform,
  type SocialPlatform,
  type SocialProvider,
  type ConnectionTokens,
  type PublishResult,
} from "./socialProviders";
import { registerBuiltinSocialProviders } from "./providers";

/** Heuristic: does this provider error look like an expired/invalid token? */
function isAuthError(error: string): boolean {
  return /401|403|expired|invalid.?token|auth/i.test(error);
}

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
      let result = await provider.publish(
        conn.account,
        { accessToken: conn.accessToken, refreshToken: conn.refreshToken },
        { content: post.content, mediaUrls: post.mediaUrls }
      );

      // On an auth failure, try a one-time token refresh + retry. Short-lived
      // tokens (e.g. Bluesky accessJwt) expire between connect and a later
      // scheduled publish; refresh keeps those posts working.
      if (!result.ok && isAuthError(result.error) && conn.refreshToken) {
        const refreshed = await refreshAndRetry(
          provider,
          platform,
          tenantId,
          conn.refreshToken,
          conn.account,
          post
        );
        if (refreshed) result = refreshed;
      }

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

/**
 * Refresh the access token via the provider, persist the new tokens, and retry
 * the publish once. Returns the retry result, or null if refresh is impossible
 * or itself fails (caller keeps the original failure).
 */
async function refreshAndRetry(
  provider: SocialProvider,
  platform: SocialPlatform,
  tenantId: number,
  refreshToken: string,
  account: Parameters<SocialProvider["publish"]>[0],
  post: { content: string; mediaUrls?: string[] }
): Promise<PublishResult | null> {
  if (!provider.refresh) return null;
  try {
    const next: ConnectionTokens = await provider.refresh(refreshToken);
    await updateConnectionTokens(tenantId, platform, {
      accessToken: next.accessToken,
      refreshToken: next.refreshToken ?? refreshToken,
      expiresAt: next.expiresAt ?? null,
    });
    return provider.publish(
      account,
      { accessToken: next.accessToken, refreshToken: next.refreshToken },
      { content: post.content, mediaUrls: post.mediaUrls }
    );
  } catch {
    return null;
  }
}
