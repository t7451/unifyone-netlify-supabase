/**
 * src-typescript/src/tools/customers.ts
 *
 * MCP tool registrations — Walls tier (customers).
 *
 * Registered tools:
 *   • list_customers — list customers for a tenant
 *   • get_customer   — fetch a single customer by ID
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

export function registerCustomerTools(server: McpServer): void {
  server.tool(
    "list_customers",
    "List customers for a tenant",
    {
      tenant_id: z.number().int().positive().optional().describe("Filter by tenant"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("list_customers", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_customer",
    "Get a customer by their numeric ID",
    {
      customer_id: z.number().int().positive().describe("Customer ID"),
      tenant_id: z.number().int().positive().optional().describe("Tenant ID (for scoped lookup)"),
    },
    async (args) => {
      const data = await apiFetch("get_customer", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
