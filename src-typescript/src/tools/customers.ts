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
import { apiFetch } from "./utils.js";

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
