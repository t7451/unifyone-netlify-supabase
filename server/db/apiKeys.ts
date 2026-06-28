import { and, desc, eq, sql } from "drizzle-orm";
import { InsertApiKey, apiKeys } from "../../drizzle/schema";
import { getDb } from "./connection";

// ── API Keys ──────────────────────────────────────────────────────────────────
export async function createApiKey(data: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(apiKeys).values(data).returning();
  return result[0];
}

export async function getApiKeysByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.tenantId, tenantId), sql`${apiKeys.revokedAt} IS NULL`)
    )
    .orderBy(desc(apiKeys.createdAt));
}

export async function getApiKeyByHash(keyHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), sql`${apiKeys.revokedAt} IS NULL`))
    .limit(1);
  return result[0];
}

export async function touchApiKey(id: number) {
  const db = await getDb();
  if (!db) return;
  // PATCHED:CR1 — record last-used timestamp on successful API-key auth.
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}
export async function revokeApiKey(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)));
}

export async function touchApiKeyLastUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}
