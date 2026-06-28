import * as db from "../../db";

/** Thin data-access layer: forwards to the shared `../../db` analytics helpers
 *  so the service orchestrates against a single dependency. Calls are forwarded
 *  lazily (inside each wrapper) so test mocks of `../../db` that omit unrelated
 *  exports don't trip vitest's strict-mock guard at module-load time. */
export const analyticsRepo = {
  getAcquisitionSources: (...a: Parameters<typeof db.getAcquisitionSources>) =>
    db.getAcquisitionSources(...a),
  getAnalyticsSummary: (...a: Parameters<typeof db.getAnalyticsSummary>) =>
    db.getAnalyticsSummary(...a),
  getBehaviorSummary: (...a: Parameters<typeof db.getBehaviorSummary>) =>
    db.getBehaviorSummary(...a),
  getDashboardOverview: (...a: Parameters<typeof db.getDashboardOverview>) =>
    db.getDashboardOverview(...a),
  getFunnelDropoff: (...a: Parameters<typeof db.getFunnelDropoff>) =>
    db.getFunnelDropoff(...a),
  getGeoBreakdown: (...a: Parameters<typeof db.getGeoBreakdown>) =>
    db.getGeoBreakdown(...a),
  getOutboundDestinations: (
    ...a: Parameters<typeof db.getOutboundDestinations>
  ) => db.getOutboundDestinations(...a),
  getProductEngagement: (...a: Parameters<typeof db.getProductEngagement>) =>
    db.getProductEngagement(...a),
  getRevenueByDay: (...a: Parameters<typeof db.getRevenueByDay>) =>
    db.getRevenueByDay(...a),
  getSurveyResults: (...a: Parameters<typeof db.getSurveyResults>) =>
    db.getSurveyResults(...a),
  getTopProducts: (...a: Parameters<typeof db.getTopProducts>) =>
    db.getTopProducts(...a),
  getTopProductsSummary: (...a: Parameters<typeof db.getTopProductsSummary>) =>
    db.getTopProductsSummary(...a),
  getTopSearches: (...a: Parameters<typeof db.getTopSearches>) =>
    db.getTopSearches(...a),
  getTopViewedProducts: (...a: Parameters<typeof db.getTopViewedProducts>) =>
    db.getTopViewedProducts(...a),
  getUnmetDemand: (...a: Parameters<typeof db.getUnmetDemand>) =>
    db.getUnmetDemand(...a),
  getViewedTogether: (...a: Parameters<typeof db.getViewedTogether>) =>
    db.getViewedTogether(...a),
  getWebhookEvents: (...a: Parameters<typeof db.getWebhookEvents>) =>
    db.getWebhookEvents(...a),
};
