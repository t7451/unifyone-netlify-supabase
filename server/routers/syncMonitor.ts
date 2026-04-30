import { z } from "zod";
import { tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  shopifySyncLog,
  shopifyApiQuota,
  shopifyStores,
} from "../../drizzle/schema";
import { eq, desc, and, gte, sql, count, avg, inArray } from "drizzle-orm";

// All procedures here read shopifySyncLog / shopifyApiQuota / shopifyStores —
// tables that carry a tenantId. Previously these were `protectedProcedure`
// with no tenant filter, which meant any authenticated user could read any
// tenant's Shopify sync logs (event volumes, error rates, store domains and
// names). All procedures now use `tenantProcedure` and scope queries to
// `ctx.tenantId`. Quota lookups also re-validate that the requested storeId
// belongs to the caller's tenant before returning data.

async function assertStoreInTenant(
  db: Awaited<ReturnType<typeof getDb>>,
  storeId: number,
  tenantId: number
): Promise<void> {
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .select({ id: shopifyStores.id })
    .from(shopifyStores)
    .where(
      and(eq(shopifyStores.id, storeId), eq(shopifyStores.tenantId, tenantId))
    )
    .limit(1);
  if (!row) {
    throw new Error("Store not found for this tenant");
  }
}

export const syncMonitorRouter = router({
  // Overall sync stats: success rate, error rate, avg latency, total events
  getSyncStats: tenantProcedure
    .input(
      z.object({
        storeId: z.number().optional(),
        hours: z.number().default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      if (input.storeId)
        await assertStoreInTenant(db, input.storeId, ctx.tenantId);

      const since = new Date(Date.now() - input.hours * 60 * 60 * 1000);

      const baseWhere = and(
        eq(shopifySyncLog.tenantId, ctx.tenantId),
        gte(shopifySyncLog.createdAt, since),
        ...(input.storeId ? [eq(shopifySyncLog.storeId, input.storeId)] : [])
      );

      const [totals] = await db
        .select({
          total: count(),
          avgLatency: avg(shopifySyncLog.latencyMs),
        })
        .from(shopifySyncLog)
        .where(baseWhere);

      const statusCounts = await db
        .select({
          status: shopifySyncLog.status,
          cnt: count(),
        })
        .from(shopifySyncLog)
        .where(baseWhere)
        .groupBy(shopifySyncLog.status);

      const entityCounts = await db
        .select({
          entity: shopifySyncLog.entity,
          cnt: count(),
        })
        .from(shopifySyncLog)
        .where(baseWhere)
        .groupBy(shopifySyncLog.entity);

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
    }),

  // Paginated audit log with filtering
  getAuditLog: tenantProcedure
    .input(
      z.object({
        storeId: z.number().optional(),
        entity: z
          .enum([
            "product",
            "order",
            "customer",
            "inventory",
            "fulfillment",
            "webhook",
          ])
          .optional(),
        status: z.enum(["success", "failed", "skipped", "retrying"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      if (input.storeId)
        await assertStoreInTenant(db, input.storeId, ctx.tenantId);

      const conditions = [eq(shopifySyncLog.tenantId, ctx.tenantId)];
      if (input.storeId)
        conditions.push(eq(shopifySyncLog.storeId, input.storeId));
      if (input.entity)
        conditions.push(eq(shopifySyncLog.entity, input.entity));
      if (input.status)
        conditions.push(eq(shopifySyncLog.status, input.status));

      const where = and(...conditions);

      const [logs, [{ total }]] = await Promise.all([
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
          .limit(input.limit)
          .offset(input.offset),
        db.select({ total: count() }).from(shopifySyncLog).where(where),
      ]);

      return {
        logs,
        total: Number(total),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // API quota utilization for a store
  getQuotaUtilization: tenantProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // shopifyApiQuota has no tenantId column — gate via the store ownership check.
      await assertStoreInTenant(db, input.storeId, ctx.tenantId);

      const quotas = await db
        .select()
        .from(shopifyApiQuota)
        .where(eq(shopifyApiQuota.storeId, input.storeId))
        .orderBy(desc(shopifyApiQuota.recordedAt))
        .limit(1);

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
    }),

  // Latency chart data: hourly average latency over the last N hours
  getLatencyChart: tenantProcedure
    .input(
      z.object({
        storeId: z.number().optional(),
        hours: z.number().default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      if (input.storeId)
        await assertStoreInTenant(db, input.storeId, ctx.tenantId);

      const since = new Date(Date.now() - input.hours * 60 * 60 * 1000);
      const baseWhere = and(
        eq(shopifySyncLog.tenantId, ctx.tenantId),
        gte(shopifySyncLog.createdAt, since),
        ...(input.storeId ? [eq(shopifySyncLog.storeId, input.storeId)] : [])
      );

      // Group by hour bucket
      const rows = await db
        .select({
          hour: sql<string>`DATE_FORMAT(${shopifySyncLog.createdAt}, '%Y-%m-%d %H:00:00')`.as(
            "hour"
          ),
          avgLatency: avg(shopifySyncLog.latencyMs),
          eventCount: count(),
          errorCount:
            sql<number>`SUM(CASE WHEN ${shopifySyncLog.status} = 'failed' THEN 1 ELSE 0 END)`.as(
              "errorCount"
            ),
        })
        .from(shopifySyncLog)
        .where(baseWhere)
        .groupBy(
          sql`DATE_FORMAT(${shopifySyncLog.createdAt}, '%Y-%m-%d %H:00:00')`
        )
        .orderBy(sql`hour ASC`);

      return rows.map(r => ({
        hour: r.hour,
        avgLatencyMs: Math.round(Number(r.avgLatency ?? 0)),
        eventCount: Number(r.eventCount),
        errorCount: Number(r.errorCount),
      }));
    }),

  // Store health summary: all stores with their last sync time and recent error count
  getStoreHealth: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const stores = await db
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
          eq(shopifyStores.tenantId, ctx.tenantId),
          eq(shopifyStores.status, "active")
        )
      )
      .orderBy(desc(shopifyStores.installedAt));

    if (stores.length === 0) return [];

    // Get recent error counts per store (last 24h) — restricted to the
    // caller's stores so we never aggregate over another tenant's logs.
    const storeIds = stores.map(s => s.id);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const errorCounts = await db
      .select({
        storeId: shopifySyncLog.storeId,
        errors: count(),
      })
      .from(shopifySyncLog)
      .where(
        and(
          eq(shopifySyncLog.tenantId, ctx.tenantId),
          inArray(shopifySyncLog.storeId, storeIds),
          eq(shopifySyncLog.status, "failed"),
          gte(shopifySyncLog.createdAt, since)
        )
      )
      .groupBy(shopifySyncLog.storeId);

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
  }),
});
