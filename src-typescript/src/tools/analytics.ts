/**
 * src-typescript/src/tools/analytics.ts
 *
 * MCP tool registrations — Vaults tier (analytics / reporting).
 *
 * Registered tools:
 *   • get_analytics_summary — revenue, order count, and customer summary
 *   • get_revenue_by_day    — daily revenue breakdown
 *   • get_webhook_events    — recent webhook events for a tenant
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "./utils.js";

export function registerAnalyticsTools(server: McpServer): void {
  server.tool(
    "get_analytics_summary",
    "Revenue, order count, and customer summary for a tenant",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      days: z.number().int().positive().optional().default(30).describe("Look-back window in days"),
    },
    async (args) => {
      const data = await apiFetch("get_analytics_summary", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_revenue_by_day",
    "Daily revenue breakdown for a tenant",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      days: z.number().int().positive().optional().default(30).describe("Look-back window in days"),
    },
    async (args) => {
      const data = await apiFetch("get_revenue_by_day", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_webhook_events",
    "Recent webhook events for a tenant",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      limit: z.number().int().positive().optional().default(50).describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("get_webhook_events", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
