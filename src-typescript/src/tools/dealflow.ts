/**
 * src-typescript/src/tools/dealflow.ts
 *
 * MCP tool registrations — DealFlow (referral & affiliate deals).
 *
 * Registered tools:
 *   • list_deals               — list deals with filters
 *   • get_deal                 — get a single deal by ID
 *   • search_deals             — full-text search across deals
 *   • get_deal_recommendations — personalized deal recommendations
 *   • manage_wishlist          — add/remove/list wishlist items
 *   • track_deal_conversion    — record click or conversion event
 *   • generate_deal_content    — AI-generated content for a deal
 *   • get_feature_flags        — list A/B test feature flags
 *   • set_feature_flag         — enable/disable a feature flag
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "./utils.js";

export function registerDealflowTools(server: McpServer): void {
  server.tool(
    "list_deals",
    "List referral/affiliate deals with optional category, difficulty, and search filters",
    {
      tenant_id: z.number().int().positive().optional().describe("Filter by tenant"),
      category: z.string().optional().describe("Filter by category (Banking, Cashback, Food Delivery, Investing, Shopping)"),
      difficulty: z.enum(["easy", "medium", "hard"]).optional().describe("Filter by difficulty"),
      search: z.string().optional().describe("Search term"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("list_deals", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_deal",
    "Get a single deal by ID with full details, requirements, and promo code",
    {
      deal_id: z.string().min(1).describe("Deal ID"),
    },
    async (args) => {
      const data = await apiFetch("get_deal", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "search_deals",
    "Full-text search across deal titles, descriptions, and brands",
    {
      query: z.string().min(1).describe("Search term"),
      tenant_id: z.number().int().positive().optional().describe("Restrict to a single tenant"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("search_deals", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_deal_recommendations",
    "Get personalized deal recommendations based on user behavior and preferences",
    {
      user_id: z.string().min(1).describe("User ID"),
      tenant_id: z.number().int().positive().optional().describe("Tenant context"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("get_deal_recommendations", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "manage_wishlist",
    'Add or remove a deal from a user\'s wishlist; action="add"|"remove"|"list"',
    {
      user_id: z.string().min(1).describe("User ID"),
      deal_id: z.string().optional().describe("Deal ID (required for add/remove)"),
      action: z.enum(["add", "remove", "list"]).describe("Wishlist action"),
    },
    async (args) => {
      const data = await apiFetch("manage_wishlist", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "track_deal_conversion",
    "Record a deal click or conversion event for analytics",
    {
      deal_id: z.string().min(1).describe("Deal ID"),
      user_id: z.string().optional().describe("User ID (optional for anonymous tracking)"),
      event_type: z.enum(["click", "conversion"]).describe("Event type"),
      value: z.number().optional().describe("Monetary value of the conversion"),
    },
    async (args) => {
      const data = await apiFetch("track_deal_conversion", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "generate_deal_content",
    "Generate AI-written blog post or SEO landing page content for a deal",
    {
      deal_id: z.string().min(1).describe("Deal ID"),
      content_type: z.enum(["blog_post", "landing_page", "description"]).describe("Type of content to generate"),
    },
    async (args) => {
      const data = await apiFetch("generate_deal_content", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_feature_flags",
    "List all A/B test feature flags and their current rollout percentages",
    {
      tenant_id: z.number().int().positive().optional().describe("Tenant context"),
    },
    async (args) => {
      const data = await apiFetch("get_feature_flags", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "set_feature_flag",
    "Enable/disable a feature flag or change its rollout percentage",
    {
      flag_id: z.string().min(1).describe("Feature flag ID"),
      enabled: z.boolean().describe("Whether the flag is enabled"),
      rollout_percentage: z.number().min(0).max(100).optional().describe("Rollout percentage (0–100)"),
    },
    async (args) => {
      const data = await apiFetch("set_feature_flag", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
