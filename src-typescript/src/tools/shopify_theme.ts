/**
 * src-typescript/src/tools/shopify_theme.ts
 *
 * MCP tool registrations — Shopify Theme section manager.
 *
 * Registered tools:
 *   • get_theme_sections     — list all available theme sections
 *   • sync_theme_config      — push updated settings to Shopify
 *   • get_theme_performance  — Lighthouse/performance metrics
 *   • update_section_settings — update a specific section's settings
 *   • get_loyalty_config     — get loyalty program configuration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "./utils.js";

export function registerShopifyThemeTools(server: McpServer): void {
  server.tool(
    "get_theme_sections",
    "List all available Shopify theme sections with their schema settings",
    {
      tenant_id: z.number().int().positive().optional().describe("Tenant context"),
    },
    async (args) => {
      const data = await apiFetch("get_theme_sections", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "sync_theme_config",
    "Push updated theme settings (colors, fonts, section content) to a tenant's Shopify store",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      section: z.string().min(1).describe("Theme section name"),
      settings: z.record(z.string(), z.unknown()).describe("Section settings to apply"),
    },
    async (args) => {
      const data = await apiFetch("sync_theme_config", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_theme_performance",
    "Get Lighthouse/performance metrics for a tenant's storefront",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
    },
    async (args) => {
      const data = await apiFetch("get_theme_performance", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_section_settings",
    "Update a specific section's settings (e.g. hero headline, newsletter copy)",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      section: z.enum(["hero", "trust-bar", "featured-collections", "brand-story", "featured-products", "testimonials", "newsletter"]).describe("Section to update"),
      settings: z.record(z.string(), z.unknown()).describe("New settings for the section"),
    },
    async (args) => {
      const data = await apiFetch("update_section_settings", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_loyalty_config",
    "Get the loyalty program configuration (smile.io or custom) for a tenant's Shopify theme",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
    },
    async (args) => {
      const data = await apiFetch("get_loyalty_config", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
