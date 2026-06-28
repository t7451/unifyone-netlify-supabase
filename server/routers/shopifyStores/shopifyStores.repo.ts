import { getDb } from "../../db";
import { shopifyStores } from "../../../drizzle/schema";
import { eq, and, desc, type SQL } from "drizzle-orm";

/**
 * Data-access layer for Shopify stores. Thin wrappers around the existing
 * Drizzle helpers in ../../db — queries are relocated verbatim, not rewritten.
 */

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

export async function listStoresSummary(whereClause: SQL | undefined) {
  const db = await requireDb();
  return db
    .select({
      id: shopifyStores.id,
      shopDomain: shopifyStores.shopDomain,
      shopName: shopifyStores.shopName,
      shopEmail: shopifyStores.shopEmail,
      shopCurrency: shopifyStores.shopCurrency,
      shopPlan: shopifyStores.shopPlan,
      scopes: shopifyStores.scopes,
      status: shopifyStores.status,
      lastSyncAt: shopifyStores.lastSyncAt,
      installedAt: shopifyStores.installedAt,
      tenantId: shopifyStores.tenantId,
    })
    .from(shopifyStores)
    .where(whereClause)
    .orderBy(desc(shopifyStores.installedAt));
}

export async function selectStoreFull(whereClause: SQL | undefined) {
  const db = await requireDb();
  return db.select().from(shopifyStores).where(whereClause).limit(1);
}

export async function selectStoreOwnership(storeId: number) {
  const db = await requireDb();
  return db
    .select({
      userId: shopifyStores.userId,
      tenantId: shopifyStores.tenantId,
    })
    .from(shopifyStores)
    .where(eq(shopifyStores.id, storeId))
    .limit(1);
}

export async function selectStoreOwnershipWithDomain(storeId: number) {
  const db = await requireDb();
  return db
    .select({
      userId: shopifyStores.userId,
      tenantId: shopifyStores.tenantId,
      shopDomain: shopifyStores.shopDomain,
    })
    .from(shopifyStores)
    .where(eq(shopifyStores.id, storeId))
    .limit(1);
}

export async function selectStoreScopes(storeId: number) {
  const db = await requireDb();
  return db
    .select({
      scopes: shopifyStores.scopes,
      userId: shopifyStores.userId,
      tenantId: shopifyStores.tenantId,
    })
    .from(shopifyStores)
    .where(eq(shopifyStores.id, storeId))
    .limit(1);
}

export async function setStoreStatus(
  whereClause: SQL | undefined,
  status: typeof shopifyStores.$inferInsert.status
) {
  const db = await requireDb();
  await db.update(shopifyStores).set({ status }).where(whereClause);
}

export async function setStoreLastSyncAt(
  whereClause: SQL | undefined,
  lastSyncAt: Date
) {
  const db = await requireDb();
  await db.update(shopifyStores).set({ lastSyncAt }).where(whereClause);
}

export async function linkStoreToUser(
  storeId: number,
  userId: number,
  tenantId: number | undefined
) {
  const db = await requireDb();
  await db
    .update(shopifyStores)
    .set({ userId, tenantId })
    .where(eq(shopifyStores.id, storeId));
}

// Re-export the schema table + drizzle ops the service needs to build
// identical WHERE clauses, so callers don't reach past the repo layer.
export { shopifyStores, eq, and };
