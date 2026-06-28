/**
 * server/routers/dealflow/dealflow.repo.ts
 *
 * Data-access layer for DealFlow. Wraps the MCP tool transport
 * (`mcpCallTool`) so the service layer never touches it directly.
 *
 * Every call forwards the caller's authoritative tenant id so the MCP
 * worker enforces tenant isolation regardless of client-supplied input.
 */

import { mcpCallTool } from "../../lib/mcpClient";

type McpArgs = Record<string, unknown>;

function callTool(tool: string, args: McpArgs, tenantId: number) {
  return mcpCallTool(tool, args, { authoritativeTenantId: tenantId });
}

export const dealflowRepo = {
  listDeals(
    args: {
      category?: string;
      difficulty?: "easy" | "medium" | "hard";
      search?: string;
      limit?: number;
    },
    tenantId: number
  ) {
    return callTool(
      "list_deals",
      {
        category: args.category,
        difficulty: args.difficulty,
        search: args.search,
        limit: args.limit,
      },
      tenantId
    );
  },

  getDeal(dealId: string, tenantId: number) {
    return callTool("get_deal", { deal_id: dealId }, tenantId);
  },

  searchDeals(args: { query: string; limit?: number }, tenantId: number) {
    return callTool(
      "search_deals",
      { query: args.query, limit: args.limit },
      tenantId
    );
  },

  getRecommendations(
    args: { userId: string; limit?: number },
    tenantId: number
  ) {
    return callTool(
      "get_deal_recommendations",
      { user_id: args.userId, limit: args.limit },
      tenantId
    );
  },

  manageWishlist(
    args: {
      userId: string;
      dealId?: string;
      action: "add" | "remove" | "list";
    },
    tenantId: number
  ) {
    return callTool(
      "manage_wishlist",
      { user_id: args.userId, deal_id: args.dealId, action: args.action },
      tenantId
    );
  },

  trackConversion(
    args: {
      dealId: string;
      userId?: string;
      eventType: "click" | "conversion";
      value?: number;
    },
    tenantId: number
  ) {
    return callTool(
      "track_deal_conversion",
      {
        deal_id: args.dealId,
        user_id: args.userId,
        event_type: args.eventType,
        value: args.value,
      },
      tenantId
    );
  },

  generateContent(
    args: {
      dealId: string;
      contentType: "blog_post" | "landing_page" | "description";
    },
    tenantId: number
  ) {
    return callTool(
      "generate_deal_content",
      { deal_id: args.dealId, content_type: args.contentType },
      tenantId
    );
  },

  getFeatureFlags(tenantId: number) {
    return callTool("get_feature_flags", {}, tenantId);
  },

  setFeatureFlag(
    args: { flagId: string; enabled: boolean; rolloutPercentage?: number },
    tenantId: number
  ) {
    return callTool(
      "set_feature_flag",
      {
        flag_id: args.flagId,
        enabled: args.enabled,
        rollout_percentage: args.rolloutPercentage,
      },
      tenantId
    );
  },
};
