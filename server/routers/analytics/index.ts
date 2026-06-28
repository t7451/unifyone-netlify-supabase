import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  protectedProcedure,
  rateLimitedProcedure,
  router,
} from "../../_core/trpc";
import { llmRateLimiter } from "../../_core/rateLimiter";
import { analyticsService } from "./analytics.service";

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
      return analyticsService.summary(tenantId, input?.days ?? 30);
    }),

  dashboardOverview: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return analyticsService.dashboardOverview(tenantId);
  }),

  revenueByDay: protectedProcedure
    .input(z.object({ days: daysInput.default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.revenueByDay(tenantId, input?.days ?? 30);
    }),

  topProducts: protectedProcedure
    .input(z.object({ limit: limitInput.default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.topProducts(tenantId, input?.limit ?? 5);
    }),

  topProductsSummary: protectedProcedure
    .input(z.object({ limit: limitInput.default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.topProductsSummary(tenantId, input?.limit ?? 5);
    }),

  webhookEvents: protectedProcedure
    .input(z.object({ limit: limitInput.default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.webhookEvents(tenantId, input?.limit ?? 20);
    }),

  // ── Customer behavior (first-party tracking) ──────────────────────────────

  /** View → cart → checkout → purchase funnel + unique visitors for the window. */
  behaviorSummary: protectedProcedure
    .input(z.object({ days: daysInput.default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.behaviorSummary(tenantId, input?.days ?? 30);
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
      return analyticsService.topViewedProducts(
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
      return analyticsService.topSearches(
        tenantId,
        input?.days ?? 30,
        input?.limit ?? 20
      );
    }),

  // ── WHERE: acquisition, exits, geo ────────────────────────────────────────

  /** Where visitors come from — page views grouped by acquisition source. */
  acquisitionSources: protectedProcedure
    .input(
      z
        .object({ days: daysInput.default(30), limit: limitInput.default(12) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.acquisitionSources(
        tenantId,
        input?.days ?? 30,
        input?.limit ?? 12
      );
    }),

  /** Where visitors go — outbound link clicks grouped by destination domain. */
  outboundDestinations: protectedProcedure
    .input(
      z
        .object({ days: daysInput.default(30), limit: limitInput.default(12) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.outboundDestinations(
        tenantId,
        input?.days ?? 30,
        input?.limit ?? 12
      );
    }),

  /** Where visitors are — distinct visitors grouped by country (coarse geo). */
  geoBreakdown: protectedProcedure
    .input(
      z
        .object({ days: daysInput.default(30), limit: limitInput.default(12) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.geoBreakdown(
        tenantId,
        input?.days ?? 30,
        input?.limit ?? 12
      );
    }),

  // ── WHAT (depth) + WHY (funnel) ───────────────────────────────────────────

  /** Product engagement depth — avg dwell time + scroll depth per product. */
  productEngagement: protectedProcedure
    .input(
      z
        .object({ days: daysInput.default(30), limit: limitInput.default(10) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.productEngagement(
        tenantId,
        input?.days ?? 30,
        input?.limit ?? 10
      );
    }),

  /** Session-level funnel with the drop-off rate between each stage. */
  funnelDropoff: protectedProcedure
    .input(z.object({ days: daysInput.default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.funnelDropoff(tenantId, input?.days ?? 30);
    }),

  // ── WHY: LLM synthesis ────────────────────────────────────────────────────

  /**
   * On-demand, rate-limited LLM narrative that reads the behavior + search +
   * survey signals and explains, in plain English, why customers are or aren't
   * buying (plus concrete next actions). A mutation because it's an expensive,
   * user-triggered action; grounded only in the tenant's own data.
   */
  whySummary: rateLimitedProcedure(llmRateLimiter, "analytics:why")
    .input(z.object({ days: daysInput.default(30) }).optional())
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.whySummary(tenantId, input?.days ?? 30);
    }),

  // ── Phase 3: market intelligence ──────────────────────────────────────────

  /**
   * Unmet demand — high-volume searches on your own site that return little or
   * nothing. Demand you're not currently stocking/surfacing. First-party only.
   */
  unmetDemand: protectedProcedure
    .input(
      z
        .object({ days: daysInput.default(30), limit: limitInput.default(20) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.unmetDemand(
        tenantId,
        input?.days ?? 30,
        input?.limit ?? 20
      );
    }),

  /** Products frequently viewed together by the same visitor (market basket). */
  viewedTogether: protectedProcedure
    .input(
      z
        .object({ days: daysInput.default(30), limit: limitInput.default(10) })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return analyticsService.viewedTogether(
        tenantId,
        input?.days ?? 30,
        input?.limit ?? 10
      );
    }),

  /**
   * Google Trends related/rising queries for a seed term — aggregate off-site
   * demand. Best-effort: returns { available:false } when Trends is
   * unreachable/rate-limited (it has no official API), never errors the page.
   */
  trendingQueries: rateLimitedProcedure(llmRateLimiter, "analytics:trends")
    .input(
      z.object({
        term: z.string().trim().min(1).max(100),
        geo: z
          .string()
          .trim()
          .max(5)
          .regex(/^[A-Za-z-]*$/)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireTenant(ctx.user.tenantId);
      return analyticsService.trendingQueries(input.term, input.geo ?? "");
    }),
});
