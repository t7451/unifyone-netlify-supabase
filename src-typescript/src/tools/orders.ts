/**
 * src-typescript/src/tools/orders.ts
 *
 * MCP tool registrations — Walls tier (orders).
 *
 * Registered tools:
 *   • list_orders  — list orders with optional filters
 *   • get_order    — fetch a single order with its line items
 *   • create_order — create a new order for a tenant
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

const orderItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive().optional(),
});

export function registerOrderTools(server: McpServer): void {
  server.tool(
    "list_orders",
    "List orders with optional tenant and limit filters",
    {
      tenant_id: z.number().int().positive().optional().describe("Filter by tenant"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("list_orders", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_order",
    "Get a single order with its line items",
    {
      order_id: z.number().int().positive().describe("Order ID"),
      tenant_id: z.number().int().positive().optional().describe("Tenant ID (for scoped lookup)"),
    },
    async (args) => {
      const data = await apiFetch("get_order", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_order",
    "Create a new order for a tenant",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      customer_email: z.string().email().optional().describe("Customer email address"),
      items: z.array(orderItemSchema).min(1).describe("Order line items"),
      payment_method: z
        .enum(["stripe", "paypal", "square", "shopify"])
        .optional()
        .describe("Payment gateway"),
      notes: z.string().optional().describe("Internal order notes"),
    },
    async (args) => {
      const data = await apiFetch("create_order", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
