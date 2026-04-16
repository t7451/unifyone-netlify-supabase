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
import { apiFetch } from "./utils.js";

export function registerStoreTools(server: McpServer): void {
  server.tool(
    "list_stores",
    "List all stores / tenants registered on the platform",
    { limit: z.number().int().positive().optional().describe("Max results to return") },
    async ({ limit }) => {
      const data = await apiFetch("list_stores", { limit });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_tenant_info",
    "Get tenant details by numeric tenant ID",
    { tenant_id: z.number().int().positive().describe("Numeric tenant identifier") },
    async ({ tenant_id }) => {
      const data = await apiFetch("get_tenant_info", { tenant_id });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}

