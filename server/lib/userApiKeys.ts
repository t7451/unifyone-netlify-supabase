/**
 * server/lib/userApiKeys.ts
 *
 * Data access for user-supplied provider API keys (BYOK).
 * Keys are encrypted at rest via apiKeyVault.
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { userApiKeys } from "../../drizzle/schema";
import { decryptApiKey, encryptApiKey } from "./apiKeyVault";

export const API_KEY_PROVIDERS = ["openrouter"] as const;
export type ApiKeyProvider = (typeof API_KEY_PROVIDERS)[number];

export interface StoredApiKeySummary {
  provider: ApiKeyProvider;
  last4: string;
  updatedAt: Date;
}

export async function listUserApiKeys(
  userId: number
): Promise<StoredApiKeySummary[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      provider: userApiKeys.provider,
      last4: userApiKeys.last4,
      updatedAt: userApiKeys.updatedAt,
    })
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId));
  return rows.map(row => ({
    provider: row.provider as ApiKeyProvider,
    last4: row.last4,
    updatedAt: row.updatedAt,
  }));
}

export async function upsertUserApiKey(input: {
  userId: number;
  tenantId?: number | null;
  provider: ApiKeyProvider;
  key: string;
}): Promise<StoredApiKeySummary> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const trimmed = input.key.trim();
  const encryptedKey = encryptApiKey(trimmed);
  const last4 = trimmed.slice(-4);
  const now = new Date();
  await db
    .insert(userApiKeys)
    .values({
      userId: input.userId,
      tenantId: input.tenantId ?? null,
      provider: input.provider,
      encryptedKey,
      last4,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userApiKeys.userId, userApiKeys.provider],
      set: {
        encryptedKey,
        last4,
        tenantId: input.tenantId ?? null,
        updatedAt: now,
      },
    });
  return { provider: input.provider, last4, updatedAt: now };
}

export async function deleteUserApiKey(input: {
  userId: number;
  provider: ApiKeyProvider;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db
    .delete(userApiKeys)
    .where(
      and(
        eq(userApiKeys.userId, input.userId),
        eq(userApiKeys.provider, input.provider)
      )
    );
}

/**
 * Resolve the decrypted key for a user/provider, or null when absent.
 * Deliberately swallows all errors (missing table, decrypt failure after a
 * JWT_SECRET rotation, db outage) — BYOK is an enhancement and must never
 * break the platform-keyed chat path.
 */
export async function getUserProviderKey(
  userId: number,
  provider: ApiKeyProvider
): Promise<string | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select({ encryptedKey: userApiKeys.encryptedKey })
      .from(userApiKeys)
      .where(
        and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider))
      );
    const encrypted = rows?.[0]?.encryptedKey;
    if (!encrypted || typeof encrypted !== "string") return null;
    return decryptApiKey(encrypted);
  } catch {
    return null;
  }
}
