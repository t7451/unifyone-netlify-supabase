import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getAcquisitionSources,
  getAnalyticsSummary,
  getBehaviorSummary,
  getDashboardOverview,
  getFunnelDropoff,
  getGeoBreakdown,
  getOutboundDestinations,
  getProductEngagement,
  getRevenueByDay,
  getTopProducts,
  getTopProductsSummary,
  getSurveyResults,
  getTopSearches,
  getTopViewedProducts,
  getUnmetDemand,
  getViewedTogether,
  getWebhookEvents,
} from "../db";
import { fetchRelatedQueries } from "../lib/googleTrends";
import {
  protectedProcedure,
  rateLimitedProcedure,
  router,
} from "../_core/trpc";
import { llmRateLimiter } from "../_core/rateLimiter";
import { invokeLLM } from "../_core/llm";
import {
  buildWhyPrompt,
  extractSummaryText,
  hasInsightData,
  WHY_SYSTEM_PROMPT,
} from "../lib/whySummary";

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
      return getAcquisitionSources(
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
      return getOutboundDestinations(
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
      return getGeoBreakdown(tenantId, input?.days ?? 30, input?.limit ?? 12);
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
      return getProductEngagement(
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
      return getFunnelDropoff(tenantId, input?.days ?? 30);
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
      const days = input?.days ?? 30;

      const [behavior, funnel, topSearches, topViewed, surveys] =
        await Promise.all([
          getBehaviorSummary(tenantId, days),
          getFunnelDropoff(tenantId, days),
          getTopSearches(tenantId, days, 10),
          getTopViewedProducts(tenantId, days, 8),
          getSurveyResults(tenantId, days),
        ]);

      const data = {
        days,
        behavior,
        funnel,
        topSearches: topSearches.map(s => ({
          query: s.query,
          searches: Number(s.searches ?? 0),
          avgResults: Number(s.avgResults ?? 0),
        })),
        topViewed: topViewed.map(p => ({
          productName: p.productName,
          views: Number(p.views ?? 0),
          viewToCartRate: Number(p.viewToCartRate ?? 0),
        })),
        surveys: {
          total: surveys.total,
          topAnswers: surveys.topAnswers,
        },
      };

      if (!hasInsightData(data)) {
        return {
          summary:
            "Not enough behavioral data yet to draw conclusions. Once visitors accept cookies and start browsing, searching, and answering surveys, a grounded summary will appear here.",
          generatedAt: new Date().toISOString(),
          days,
          model: null as string | null,
        };
      }

      const result = await invokeLLM({
        messages: [
          { role: "system", content: WHY_SYSTEM_PROMPT },
          { role: "user", content: buildWhyPrompt(data) },
        ],
        maxTokens: 700,
      });

      return {
        summary: extractSummaryText(result),
        generatedAt: new Date().toISOString(),
        days,
        model: result.model ?? null,
      };
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
      return getUnmetDemand(tenantId, input?.days ?? 30, input?.limit ?? 20);
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
      return getViewedTogether(tenantId, input?.days ?? 30, input?.limit ?? 10);
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
      const data = await fetchRelatedQueries(input.term, input.geo ?? "");
      if (!data) {
        return { available: false as const, term: input.term };
      }
      return {
        available: true as const,
        term: input.term,
        top: data.top.slice(0, 12),
        rising: data.rising.slice(0, 12),
      };
    }),
});
