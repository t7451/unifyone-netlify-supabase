import {
  findStoreInTenant,
  syncTotals,
  syncStatusCounts,
  syncEntityCounts,
  auditLog,
  latestQuota,
  latencyChart,
  activeStores,
  errorCountsForStores,
  shopifySyncLog,
  eq,
  and,
  gte,
} from "./syncMonitor.repo";

/**
 * Use-case layer for the Shopify sync monitor. Holds the stats aggregation and
 * the per-tenant scoping logic; transport (zod, procedures) stays in index.ts
 * and data access in syncMonitor.repo.ts. Queries and tenant scoping are
 * identical to the original single-file router.
 *
 * All procedures read shopifySyncLog / shopifyApiQuota / shopifyStores — tables
 * that carry a tenantId. Every query is scoped to ctx.tenantId, and quota
 * lookups re-validate that the requested storeId belongs to the caller's tenant
 * before returning data.
 */

async function assertStoreInTenant(
  storeId: number,
  tenantId: number
): Promise<void> {
  const row = await findStoreInTenant(storeId, tenantId);
  if (!row) {
    throw new Error("Store not found for this tenant");
  }
}

export async function getSyncStats(
  tenantId: number,
  input: { storeId?: number; hours: number }
) {
  if (input.storeId) await assertStoreInTenant(input.storeId, tenantId);

  const since = new Date(Date.now() - input.hours * 60 * 60 * 1000);

  const baseWhere = and(
    eq(shopifySyncLog.tenantId, tenantId),
    gte(shopifySyncLog.createdAt, since),
    ...(input.storeId ? [eq(shopifySyncLog.storeId, input.storeId)] : [])
  );

  const totals = await syncTotals(baseWhere);
  const statusCounts = await syncStatusCounts(baseWhere);
  const entityCounts = await syncEntityCounts(baseWhere);

  const byStatus = Object.fromEntries(
    statusCounts.map(r => [r.status, Number(r.cnt)])
  );
  const byEntity = Object.fromEntries(
    entityCounts.map(r => [r.entity, Number(r.cnt)])
  );
  const total = Number(totals?.total ?? 0);
  const successCount = byStatus.success ?? 0;
  const failedCount = byStatus.failed ?? 0;

  return {
    total,
    successCount,
    failedCount,
    skippedCount: byStatus.skipped ?? 0,
    retryingCount: byStatus.retrying ?? 0,
    successRate: total > 0 ? Math.round((successCount / total) * 100) : 100,
    errorRate: total > 0 ? Math.round((failedCount / total) * 100) : 0,
    avgLatencyMs: Math.round(Number(totals?.avgLatency ?? 0)),
    byEntity,
    byStatus,
    windowHours: input.hours,
  };
}

export async function getAuditLog(
  tenantId: number,
  input: {
    storeId?: number;
    entity?:
      | "product"
      | "order"
      | "customer"
      | "inventory"
      | "fulfillment"
      | "webhook";
    status?: "success" | "failed" | "skipped" | "retrying";
    limit: number;
    offset: number;
  }
) {
  if (input.storeId) await assertStoreInTenant(input.storeId, tenantId);

  const conditions = [eq(shopifySyncLog.tenantId, tenantId)];
  if (input.storeId) conditions.push(eq(shopifySyncLog.storeId, input.storeId));
  if (input.entity) conditions.push(eq(shopifySyncLog.entity, input.entity));
  if (input.status) conditions.push(eq(shopifySyncLog.status, input.status));

  const where = and(...conditions);

  const [logs, [{ total }]] = await auditLog(where, input.limit, input.offset);

  return {
    logs,
    total: Number(total),
    limit: input.limit,
    offset: input.offset,
  };
}

export async function getQuotaUtilization(tenantId: number, storeId: number) {
  // shopifyApiQuota has no tenantId column — gate via the store ownership check.
  await assertStoreInTenant(storeId, tenantId);

  const quotas = await latestQuota(storeId);

  if (!quotas.length) {
    return {
      restUtilization: 0,
      graphqlUtilization: 0,
      throttledCount: 0,
      restCallsMade: 0,
      restCallsLimit: 40,
      graphqlPointsUsed: 0,
      graphqlPointsLimit: 1000,
      recordedAt: null,
    };
  }

  const q = quotas[0];
  return {
    restUtilization: Math.round((q.restCallsMade / q.restCallsLimit) * 100),
    graphqlUtilization: Math.round(
      (q.graphqlPointsUsed / q.graphqlPointsLimit) * 100
    ),
    throttledCount: q.throttledCount,
    restCallsMade: q.restCallsMade,
    restCallsLimit: q.restCallsLimit,
    graphqlPointsUsed: q.graphqlPointsUsed,
    graphqlPointsLimit: q.graphqlPointsLimit,
    recordedAt: q.recordedAt,
  };
}

export async function getLatencyChart(
  tenantId: number,
  input: { storeId?: number; hours: number }
) {
  if (input.storeId) await assertStoreInTenant(input.storeId, tenantId);

  const since = new Date(Date.now() - input.hours * 60 * 60 * 1000);
  const baseWhere = and(
    eq(shopifySyncLog.tenantId, tenantId),
    gte(shopifySyncLog.createdAt, since),
    ...(input.storeId ? [eq(shopifySyncLog.storeId, input.storeId)] : [])
  );

  const rows = await latencyChart(baseWhere);

  return rows.map(r => ({
    hour: r.hour,
    avgLatencyMs: Math.round(Number(r.avgLatency ?? 0)),
    eventCount: Number(r.eventCount),
    errorCount: Number(r.errorCount),
  }));
}

export async function getStoreHealth(tenantId: number) {
  const stores = await activeStores(tenantId);

  if (stores.length === 0) return [];

  // Get recent error counts per store (last 24h) — restricted to the
  // caller's stores so we never aggregate over another tenant's logs.
  const storeIds = stores.map(s => s.id);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const errorCounts = await errorCountsForStores(tenantId, storeIds, since);

  const errorMap = Object.fromEntries(
    errorCounts.map(r => [r.storeId, Number(r.errors)])
  );

  return stores.map(s => ({
    ...s,
    recentErrors: errorMap[s.id] ?? 0,
    health:
      (errorMap[s.id] ?? 0) === 0
        ? "healthy"
        : (errorMap[s.id] ?? 0) < 5
          ? "warning"
          : "critical",
  }));
}
