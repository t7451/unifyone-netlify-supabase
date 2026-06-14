/**
 * Social account vault — read/disconnect plumbing over the `social_accounts`
 * table, with token encryption at rest.
 *
 * Security invariants:
 *  - Raw access/refresh tokens NEVER leave this module toward the client.
 *    `redactAccount` strips them; only server-side callers (publishing engine,
 *    PR 3) get decrypted tokens via `decryptConnectionTokens`.
 *  - Tokens are stored as AES-256-GCM ciphertext (socialTokenCrypto).
 *
 * The write path (storeConnection) and per-platform decrypted reads land in the
 * connect-flow PR, alongside the DB enum/column migration. PR 1 provides the
 * crypto/redaction primitives plus tenant-scoped list/disconnect.
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { socialAccounts, type SocialAccount } from "../../drizzle/schema";
import { decryptToken, encryptToken } from "../_core/socialTokenCrypto";
import type { ConnectionTokens } from "./socialProviders";

/** A social account safe to return to the client — no tokens. */
export type PublicSocialAccount = Omit<
  SocialAccount,
  "accessToken" | "refreshToken"
>;

/** Strip secret token fields from an account row. Pure. */
export function redactAccount(account: SocialAccount): PublicSocialAccount {
  // Destructure-omit guarantees tokens are dropped even if new safe columns
  // are added to the table later.
  const {
    accessToken: _accessToken,
    refreshToken: _refreshToken,
    ...pub
  } = account;
  void _accessToken;
  void _refreshToken;
  return pub;
}

/** Encrypt the secret fields of a connection for storage. Pure. */
export function encryptConnectionTokens(tokens: ConnectionTokens): {
  accessToken: string;
  refreshToken: string | null;
} {
  return {
    accessToken: encryptToken(tokens.accessToken).ciphertext,
    refreshToken: tokens.refreshToken
      ? encryptToken(tokens.refreshToken).ciphertext
      : null,
  };
}

/** Decrypt the stored token ciphertext back into usable tokens. Pure. */
export function decryptConnectionTokens(account: SocialAccount): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return {
    accessToken: account.accessToken ? decryptToken(account.accessToken) : null,
    refreshToken: account.refreshToken
      ? decryptToken(account.refreshToken)
      : null,
  };
}

/** List a tenant's social accounts (redacted — never includes tokens). */
export async function listConnectedAccounts(
  tenantId: number
): Promise<PublicSocialAccount[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(socialAccounts)
    .where(eq(socialAccounts.tenantId, tenantId));
  return rows.map(redactAccount);
}

/**
 * Disconnect a tenant's account: wipe stored tokens and mark disconnected.
 * The row is retained (history); tokens are nulled so nothing usable remains.
 * Scoped by tenantId so one tenant can never disconnect another's account.
 */
export async function disconnectAccount(
  tenantId: number,
  accountId: number
): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };
  await db
    .update(socialAccounts)
    .set({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isConnected: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(socialAccounts.id, accountId),
        eq(socialAccounts.tenantId, tenantId)
      )
    );
  return { success: true };
}
