import { invokeLLM } from "../../_core/llm";
import { fetchRelatedQueries } from "../../lib/googleTrends";
import {
  buildWhyPrompt,
  extractSummaryText,
  hasInsightData,
  WHY_SYSTEM_PROMPT,
} from "../../lib/whySummary";
import { analyticsRepo } from "./analytics.repo";

export const analyticsService = {
  async summary(tenantId: number, days: number) {
    const summary = await analyticsRepo.getAnalyticsSummary(tenantId, days);
    return (
      summary ?? {
        totalRevenue: 0,
        orderCount: 0,
        customerCount: 0,
        productCount: 0,
      }
    );
  },

  dashboardOverview(tenantId: number) {
    return analyticsRepo.getDashboardOverview(tenantId);
  },

  revenueByDay(tenantId: number, days: number) {
    return analyticsRepo.getRevenueByDay(tenantId, days);
  },

  topProducts(tenantId: number, limit: number) {
    return analyticsRepo.getTopProducts(tenantId, limit);
  },

  topProductsSummary(tenantId: number, limit: number) {
    return analyticsRepo.getTopProductsSummary(tenantId, limit);
  },

  webhookEvents(tenantId: number, limit: number) {
    return analyticsRepo.getWebhookEvents(tenantId, limit);
  },

  behaviorSummary(tenantId: number, days: number) {
    return analyticsRepo.getBehaviorSummary(tenantId, days);
  },

  topViewedProducts(tenantId: number, days: number, limit: number) {
    return analyticsRepo.getTopViewedProducts(tenantId, days, limit);
  },

  topSearches(tenantId: number, days: number, limit: number) {
    return analyticsRepo.getTopSearches(tenantId, days, limit);
  },

  acquisitionSources(tenantId: number, days: number, limit: number) {
    return analyticsRepo.getAcquisitionSources(tenantId, days, limit);
  },

  outboundDestinations(tenantId: number, days: number, limit: number) {
    return analyticsRepo.getOutboundDestinations(tenantId, days, limit);
  },

  geoBreakdown(tenantId: number, days: number, limit: number) {
    return analyticsRepo.getGeoBreakdown(tenantId, days, limit);
  },

  productEngagement(tenantId: number, days: number, limit: number) {
    return analyticsRepo.getProductEngagement(tenantId, days, limit);
  },

  funnelDropoff(tenantId: number, days: number) {
    return analyticsRepo.getFunnelDropoff(tenantId, days);
  },

  unmetDemand(tenantId: number, days: number, limit: number) {
    return analyticsRepo.getUnmetDemand(tenantId, days, limit);
  },

  viewedTogether(tenantId: number, days: number, limit: number) {
    return analyticsRepo.getViewedTogether(tenantId, days, limit);
  },

  async whySummary(tenantId: number, days: number) {
    const [behavior, funnel, topSearches, topViewed, surveys] =
      await Promise.all([
        analyticsRepo.getBehaviorSummary(tenantId, days),
        analyticsRepo.getFunnelDropoff(tenantId, days),
        analyticsRepo.getTopSearches(tenantId, days, 10),
        analyticsRepo.getTopViewedProducts(tenantId, days, 8),
        analyticsRepo.getSurveyResults(tenantId, days),
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
  },

  async trendingQueries(term: string, geo: string) {
    const data = await fetchRelatedQueries(term, geo);
    if (!data) {
      return { available: false as const, term };
    }
    return {
      available: true as const,
      term,
      top: data.top.slice(0, 12),
      rising: data.rising.slice(0, 12),
    };
  },
};
