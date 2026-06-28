import { getDb } from "../../db";
import {
  shopifySyncLog,
  shopifyApiQuota,
  shopifyStores,
} from "../../../drizzle/schema";
import {
  eq,
  desc,
  and,
  gte,
  sql,
  count,
  avg,
  inArray,
  type SQL,
} from "drizzle-orm";

/**
 * Data-access layer for the Shopify sync monitor. Wraps the existing ../../db
 * helper and relocates the read queries from the original router verbatim. The
 * tenant scoping (every query filters by tenantId / store ownership) is
 * preserved exactly — see the service layer for the assertion logic.
 */

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

export async function findStoreInTenant(storeId: number, tenantId: number) {
  const db = await requireDb();
  const [row] = await db
    .select({ id: shopifyStores.id })
    .from(shopifyStores)
    .where(
      and(eq(shopifyStores.id, storeId), eq(shopifyStores.tenantId, tenantId))
    )
    .limit(1);
  return row ?? null;
}

export async function syncTotals(baseWhere: SQL | undefined) {
  const db = await requireDb();
  const [totals] = await db
    .select({
      total: count(),
      avgLatency: avg(shopifySyncLog.latencyMs),
    })
    .from(shopifySyncLog)
    .where(baseWhere);
  return totals;
}

export async function syncStatusCounts(baseWhere: SQL | undefined) {
  const db = await requireDb();
  return db
    .select({
      status: shopifySyncLog.status,
      cnt: count(),
    })
    .from(shopifySyncLog)
    .where(baseWhere)
    .groupBy(shopifySyncLog.status);
}

export async function syncEntityCounts(baseWhere: SQL | undefined) {
  const db = await requireDb();
  return db
    .select({
      entity: shopifySyncLog.entity,
      cnt: count(),
    })
    .from(shopifySyncLog)
    .where(baseWhere)
    .groupBy(shopifySyncLog.entity);
}

export async function auditLog(
  where: SQL | undefined,
  limit: number,
  offset: number
) {
  const db = await requireDb();
  return Promise.all([
    db
      .select({
        id: shopifySyncLog.id,
        storeId: shopifySyncLog.storeId,
        event: shopifySyncLog.event,
        entity: shopifySyncLog.entity,
        entityId: shopifySyncLog.entityId,
        direction: shopifySyncLog.direction,
        status: shopifySyncLog.status,
        latencyMs: shopifySyncLog.latencyMs,
        errorMsg: shopifySyncLog.errorMsg,
        retryCount: shopifySyncLog.retryCount,
        createdAt: shopifySyncLog.createdAt,
      })
      .from(shopifySyncLog)
      .where(where)
      .orderBy(desc(shopifySyncLog.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(shopifySyncLog).where(where),
  ]);
}

export async function latestQuota(storeId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(shopifyApiQuota)
    .where(eq(shopifyApiQuota.storeId, storeId))
    .orderBy(desc(shopifyApiQuota.recordedAt))
    .limit(1);
}

export async function latencyChart(baseWhere: SQL | undefined) {
  const db = await requireDb();
  // Group by hour bucket (PostgreSQL).
  // Use the same TO_CHAR expression in both SELECT and GROUP BY so
  // PostgreSQL doesn't complain about a non-aggregate not being in the
  // GROUP BY. The format produces a proper ISO-8601 UTC string
  // (e.g. "2024-01-15T14:00:00Z") so that new Date(hour) parses
  // correctly in all browsers including Safari.
  const hourExpr = sql<string>`TO_CHAR(DATE_TRUNC('hour', ${shopifySyncLog.createdAt}) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
  return db
    .select({
      hour: hourExpr.as("hour"),
      avgLatency: avg(shopifySyncLog.latencyMs),
      eventCount: count(),
      errorCount:
        sql<number>`SUM(CASE WHEN ${shopifySyncLog.status} = 'failed' THEN 1 ELSE 0 END)`.as(
          "errorCount"
        ),
    })
    .from(shopifySyncLog)
    .where(baseWhere)
    .groupBy(hourExpr)
    .orderBy(sql`hour ASC`);
}

export async function activeStores(tenantId: number) {
  const db = await requireDb();
  return db
    .select({
      id: shopifyStores.id,
      shopDomain: shopifyStores.shopDomain,
      shopName: shopifyStores.shopName,
      status: shopifyStores.status,
      lastSyncAt: shopifyStores.lastSyncAt,
    })
    .from(shopifyStores)
    .where(
      and(
        eq(shopifyStores.tenantId, tenantId),
        eq(shopifyStores.status, "active")
      )
    )
    .orderBy(desc(shopifyStores.installedAt));
}

export async function errorCountsForStores(
  tenantId: number,
  storeIds: number[],
  since: Date
) {
  const db = await requireDb();
  return db
    .select({
      storeId: shopifySyncLog.storeId,
      errors: count(),
    })
    .from(shopifySyncLog)
    .where(
      and(
        eq(shopifySyncLog.tenantId, tenantId),
        inArray(shopifySyncLog.storeId, storeIds),
        eq(shopifySyncLog.status, "failed"),
        gte(shopifySyncLog.createdAt, since)
      )
    )
    .groupBy(shopifySyncLog.storeId);
}

// Re-export schema tables + drizzle ops the service uses to build identical
// WHERE clauses without reaching past the repo boundary.
export { shopifySyncLog, eq, and, gte, count };
