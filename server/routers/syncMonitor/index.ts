import { z } from "zod";
import { tenantProcedure, router } from "../../_core/trpc";
import * as service from "./syncMonitor.service";

/**
 * Transport layer for the Shopify sync monitor router. Procedures + zod
 * schemas live here; the stats aggregation and per-tenant scoping live in
 * syncMonitor.service.ts and data access in syncMonitor.repo.ts.
 *
 * All procedures use `tenantProcedure` and scope queries to `ctx.tenantId`.
 */
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
      return service.getSyncStats(ctx.tenantId, input);
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
      return service.getAuditLog(ctx.tenantId, input);
    }),

  // API quota utilization for a store
  getQuotaUtilization: tenantProcedure
    .input(z.object({ storeId: z.number() }))
    .query(async ({ ctx, input }) => {
      return service.getQuotaUtilization(ctx.tenantId, input.storeId);
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
      return service.getLatencyChart(ctx.tenantId, input);
    }),

  // Store health summary: all stores with their last sync time and recent error count
  getStoreHealth: tenantProcedure.query(async ({ ctx }) => {
    return service.getStoreHealth(ctx.tenantId);
  }),
});
