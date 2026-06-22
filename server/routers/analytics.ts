import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getAnalyticsSummary,
  getBehaviorSummary,
  getDashboardOverview,
  getRevenueByDay,
  getTopProducts,
  getTopProductsSummary,
  getTopSearches,
  getTopViewedProducts,
  getWebhookEvents,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const requireTenant = (tenantId: number | null | undefined) => {
  if (!tenantId)
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant." });
  return tenantId;
};

// Bound numeric inputs so a negative/zero limit can't error the query and an
// oversized window can't trigger an unboundedly expensive scan.
const daysInput = z.number().int().min(1).max(365);
const limitInput = z.number().int().min(1).max(100);

export const analyticsRouter = router({
  summary: protectedProcedure
    .input(z.object({ days: daysInput.default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const summary = await getAnalyticsSummary(tenantId, input?.days ?? 30);
      return (
        summary ?? {
          totalRevenue: 0,
          orderCount: 0,
          customerCount: 0,
          productCount: 0,
        }
      );
    }),

  dashboardOverview: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getDashboardOverview(tenantId);
  }),

  revenueByDay: protectedProcedure
    .input(z.object({ days: daysInput.default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return getRevenueByDay(tenantId, input?.days ?? 30);
    }),

  topProducts: protectedProcedure
    .input(z.object({ limit: limitInput.default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return getTopProducts(tenantId, input?.limit ?? 5);
    }),

  topProductsSummary: protectedProcedure
    .input(z.object({ limit: limitInput.default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return getTopProductsSummary(tenantId, input?.limit ?? 5);
    }),

  webhookEvents: protectedProcedure
    .input(z.object({ limit: limitInput.default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return getWebhookEvents(tenantId, input?.limit ?? 20);
    }),

  // ── Customer behavior (first-party tracking) ──────────────────────────────

  /** View → cart → checkout → purchase funnel + unique visitors for the window. */
  behaviorSummary: protectedProcedure
    .input(z.object({ days: daysInput.default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return getBehaviorSummary(tenantId, input?.days ?? 30);
    }),

  /** Products ranked by views (demand intent), with add-to-cart conversion. */
  topViewedProducts: protectedProcedure
    .input(
      z
        .object({ days: daysInput.default(30), limit: limitInput.default(10) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return getTopViewedProducts(
        tenantId,
        input?.days ?? 30,
        input?.limit ?? 10
      );
    }),

  /** Most-searched queries with distinct searchers and average result counts. */
  topSearches: protectedProcedure
    .input(
      z
        .object({ days: daysInput.default(30), limit: limitInput.default(20) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return getTopSearches(tenantId, input?.days ?? 30, input?.limit ?? 20);
    }),
});
