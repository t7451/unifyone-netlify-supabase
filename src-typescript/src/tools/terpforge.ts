/**
 * src-typescript/src/tools/terpforge.ts
 *
 * MCP tool registrations — TerpForge (terpene-science commerce).
 *
 * Registered tools:
 *   • list_compounds          — list terpene compounds
 *   • get_compound            — get detailed molecular data
 *   • simulate_compound_purity — run a purity simulation
 *   • get_coa_data            — retrieve COA lab results
 *   • list_terp_products      — list products by category
 *   • compare_terpene_profiles — compare compounds side-by-side
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "./utils.js";

export function registerTerpforgeTools(server: McpServer): void {
  server.tool(
    "list_compounds",
    "List all terpene compounds in the TerpForge compound library with molecular data",
    {
      profile: z.enum(["FOCUS", "RECOVERY", "CALM"]).optional().describe("Filter by terpene profile"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("list_compounds", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_compound",
    "Get detailed molecular data for a single terpene compound (boiling point, density, logP, radar chart data)",
    {
      slug: z.string().min(1).describe("Compound slug identifier"),
    },
    async (args) => {
      const data = await apiFetch("get_compound", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "simulate_compound_purity",
    "Run a purity simulation for a terpene compound at a given concentration percentage",
    {
      compound_slug: z.string().min(1).describe("Compound slug identifier"),
      purity_percentage: z.number().min(0).max(100).describe("Purity concentration percentage"),
    },
    async (args) => {
      const data = await apiFetch("simulate_compound_purity", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_coa_data",
    "Retrieve Certificate of Analysis (COA) entries with lab results, terpene percentages, and pass/fail status",
    {
      product_id: z.string().optional().describe("Filter by product ID"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("get_coa_data", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "list_terp_products",
    "List TerpForge products by category with pricing and terpene profiles",
    {
      category: z.enum(["apparel", "hardware", "wellness"]).optional().describe("Product category"),
      profile: z.string().optional().describe("Filter by terpene profile"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("list_terp_products", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "compare_terpene_profiles",
    "Compare two or more terpene compounds side-by-side on recovery, focus, calm, anti-inflammatory, aromatic strength, and bioavailability",
    {
      compound_slugs: z.array(z.string().min(1)).min(2).describe("Array of compound slugs to compare (minimum 2)"),
    },
    async (args) => {
      const data = await apiFetch("compare_terpene_profiles", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
