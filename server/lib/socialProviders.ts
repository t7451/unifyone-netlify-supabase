/**
 * Social provider adapter contract + registry.
 *
 * Each social network is implemented as a `SocialProvider` and registered here.
 * The connect flow (PR 2) and publishing engine (PR 3) resolve providers by
 * platform via this registry, so platforms are pluggable.
 *
 * Note: `SocialPlatform` is intentionally broader than the current DB
 * `social_platform` enum — it already includes the v1 targets (bluesky,
 * mastodon). The DB enum is widened to match in the connect-flow PR, which is
 * also where rows for the new platforms are first inserted.
 */
import type { SocialAccount } from "../../drizzle/schema";

export const SOCIAL_PLATFORMS = [
  "twitter",
  "instagram",
  "linkedin",
  "facebook",
  "tiktok",
  "bluesky",
  "mastodon",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return (
    typeof value === "string" &&
    (SOCIAL_PLATFORMS as readonly string[]).includes(value)
  );
}

/** Tokens/metadata returned by a provider after a successful connection. */
export type ConnectionTokens = {
  accessToken: string;
  refreshToken?: string | null;
  /** Absolute expiry of the access token, if the platform issues one. */
  expiresAt?: Date | null;
  handle?: string | null;
  displayName?: string | null;
  platformUserId?: string | null;
  profileImageUrl?: string | null;
  /** Mastodon: the instance origin the token is valid for. */
  instanceUrl?: string | null;
  scopes?: string[] | null;
};

/** A post ready to be pushed to a platform. */
export type PublishablePost = {
  content: string;
  mediaUrls?: string[];
};

export type PublishResult =
  | { ok: true; externalId?: string; permalink?: string }
  | { ok: false; error: string };

/**
 * Provider adapter. Platforms vary in how they connect:
 *  - OAuth redirect platforms implement `getAuthUrl` + `exchangeCode`.
 *  - App-password / direct-credential platforms (e.g. Bluesky) implement
 *    `connectWithCredentials` instead.
 * A provider implements whichever connect path applies plus `publish`.
 */
export interface SocialProvider {
  platform: SocialPlatform;

  // OAuth redirect connect path
  getAuthUrl?(args: {
    state: string;
    redirectUri: string;
    instanceUrl?: string;
  }): string;
  exchangeCode?(args: {
    code: string;
    redirectUri: string;
    instanceUrl?: string;
  }): Promise<ConnectionTokens>;

  // Direct-credential connect path (e.g. Bluesky app password)
  connectWithCredentials?(args: {
    identifier: string;
    secret: string;
    instanceUrl?: string;
  }): Promise<ConnectionTokens>;

  // Optional token refresh
  refresh?(refreshToken: string): Promise<ConnectionTokens>;

  // Publish a post on behalf of a connected account
  publish(
    account: SocialAccount,
    tokens: ConnectionTokens,
    post: PublishablePost
  ): Promise<PublishResult>;
}

// ── Registry ──────────────────────────────────────────────────────────────
const registry = new Map<SocialPlatform, SocialProvider>();

export function registerProvider(provider: SocialProvider): void {
  if (registry.has(provider.platform)) {
    throw new Error(
      `Social provider already registered for "${provider.platform}"`
    );
  }
  registry.set(provider.platform, provider);
}

export function getProvider(platform: string): SocialProvider | undefined {
  return isSocialPlatform(platform) ? registry.get(platform) : undefined;
}

export function hasProvider(platform: string): boolean {
  return isSocialPlatform(platform) && registry.has(platform);
}

export function listRegisteredPlatforms(): SocialPlatform[] {
  return Array.from(registry.keys());
}

/** Test-only: clear the registry between cases. */
export function __resetProvidersForTest(): void {
  registry.clear();
}
