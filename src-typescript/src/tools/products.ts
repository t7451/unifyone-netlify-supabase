/**
 * src-typescript/src/tools/products.ts
 *
 * MCP tool registrations — Walls tier (products / inventory / categories).
 *
 * Registered tools:
 *   • list_products          — list products with filters
 *   • get_product            — fetch a single product by ID
 *   • search_products        — full-text product search
 *   • get_inventory          — inventory levels for a tenant
 *   • get_low_stock_products — products at or below a stock threshold
 *   • get_categories         — product categories for a tenant
 *   • get_top_products       — top-selling products by revenue
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "./utils.js";

export function registerProductTools(server: McpServer): void {
  server.tool(
    "list_products",
    "List products with optional tenant and limit filters",
    {
      tenant_id: z.number().int().positive().optional().describe("Filter by tenant"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("list_products", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_product",
    "Get a single product by its numeric ID",
    {
      product_id: z.number().int().positive().describe("Product ID"),
      tenant_id: z.number().int().positive().optional().describe("Tenant ID (for scoped lookup)"),
    },
    async (args) => {
      const data = await apiFetch("get_product", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "search_products",
    "Full-text search across product names and descriptions",
    {
      query: z.string().min(1).describe("Search term"),
      tenant_id: z.number().int().positive().optional().describe("Restrict to a single tenant"),
    },
    async (args) => {
      const data = await apiFetch("search_products", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_inventory",
    "Get current inventory levels for a tenant",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      product_id: z.number().int().positive().optional().describe("Filter to a single product"),
    },
    async (args) => {
      const data = await apiFetch("get_inventory", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_low_stock_products",
    "Return products whose stock is at or below a threshold",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      threshold: z.number().int().min(0).optional().default(5).describe("Stock threshold (inclusive)"),
    },
    async (args) => {
      const data = await apiFetch("get_low_stock_products", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_categories",
    "List product categories for a tenant",
    { tenant_id: z.number().int().positive().describe("Tenant ID") },
    async (args) => {
      const data = await apiFetch("get_categories", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_top_products",
    "Top-selling products by revenue for a tenant",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      limit: z.number().int().positive().optional().default(5).describe("Number of results"),
    },
    async (args) => {
      const data = await apiFetch("get_top_products", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
