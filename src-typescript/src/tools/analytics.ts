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
import { API_BASE_URL, MCP_API_KEY } from "../constants.js";

async function apiFetch(toolName: string, args: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (MCP_API_KEY) headers["Authorization"] = `Bearer ${MCP_API_KEY}`;

  const res = await fetch(`${API_BASE_URL}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: toolName, arguments: args } }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = (await res.json()) as { result?: { content?: Array<{ text: string }> } };
  const text = json.result?.content?.[0]?.text ?? "{}";
  return JSON.parse(text);
}

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
