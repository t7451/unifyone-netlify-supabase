/**
 * src-typescript/src/tools/pixelforge.ts
 *
 * MCP tool registrations — PixelForge Studio (pixel art & game creation).
 *
 * Registered tools:
 *   • list_pixel_assets  — list pixel art assets for a tenant
 *   • get_pixel_asset    — get a single asset with frame data
 *   • create_pixel_asset — create a new pixel asset record
 *   • export_sprite_sheet — export frames as a PNG sprite sheet
 *   • get_asset_metadata — get asset metadata
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFetch } from "./utils.js";

export function registerPixelforgeTools(server: McpServer): void {
  server.tool(
    "list_pixel_assets",
    "List pixel art assets (sprites, tilesets, animations) for a tenant",
    {
      tenant_id: z.number().int().positive().optional().describe("Tenant context"),
      asset_type: z.enum(["sprite", "tileset", "animation"]).optional().describe("Filter by asset type"),
      limit: z.number().int().positive().optional().describe("Max results"),
    },
    async (args) => {
      const data = await apiFetch("list_pixel_assets", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_pixel_asset",
    "Get a single pixel art asset with its frame data, palette, and export URLs",
    {
      asset_id: z.string().min(1).describe("Asset ID"),
    },
    async (args) => {
      const data = await apiFetch("get_pixel_asset", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_pixel_asset",
    "Create a new pixel asset record (metadata only; editing happens in the browser studio)",
    {
      tenant_id: z.number().int().positive().describe("Tenant ID"),
      name: z.string().min(1).describe("Asset name"),
      width: z.number().int().positive().describe("Canvas width in pixels"),
      height: z.number().int().positive().describe("Canvas height in pixels"),
      asset_type: z.enum(["sprite", "tileset", "animation"]).describe("Asset type"),
    },
    async (args) => {
      const data = await apiFetch("create_pixel_asset", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "export_sprite_sheet",
    "Export a pixel asset's frames as a base64-encoded PNG sprite sheet",
    {
      asset_id: z.string().min(1).describe("Asset ID"),
      columns: z.number().int().positive().optional().describe("Number of columns in the sheet"),
      scale: z.number().positive().optional().describe("Scale multiplier (e.g. 2 = 2x)"),
    },
    async (args) => {
      const data = await apiFetch("export_sprite_sheet", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_asset_metadata",
    "Get metadata for a pixel asset including palette, frame count, size, and creation date",
    {
      asset_id: z.string().min(1).describe("Asset ID"),
    },
    async (args) => {
      const data = await apiFetch("get_asset_metadata", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
