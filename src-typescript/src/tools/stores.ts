/**
 * src-typescript/src/tools/stores.ts
 *
 * MCP tool registrations — Foundation tier (stores / tenants).
 *
 * Registered tools:
 *   • list_stores      — list all tenants
 *   • get_tenant_info  — get a single tenant by ID
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_BASE_URL, MCP_API_KEY } from "../constants.js";

async function apiFetch(path: string, body: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (MCP_API_KEY) headers["Authorization"] = `Bearer ${MCP_API_KEY}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: body }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = (await res.json()) as { result?: { content?: Array<{ text: string }> } };
  const text = json.result?.content?.[0]?.text ?? "{}";
  return JSON.parse(text);
}

export function registerStoreTools(server: McpServer): void {
  server.tool(
    "list_stores",
    "List all stores / tenants registered on the platform",
    { limit: z.number().int().positive().optional().describe("Max results to return") },
    async ({ limit }) => {
      const data = await apiFetch("/mcp", { name: "list_stores", arguments: { limit } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_tenant_info",
    "Get tenant details by numeric tenant ID",
    { tenant_id: z.number().int().positive().describe("Numeric tenant identifier") },
    async ({ tenant_id }) => {
      const data = await apiFetch("/mcp", { name: "get_tenant_info", arguments: { tenant_id } });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
