/**
 * server/routers/pixelforge.ts
 *
 * tRPC router for PixelForge Studio — pixel art editor and HTML5 game creation.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { mcpCallTool } from "../lib/mcpClient";

export const pixelforgeRouter = router({
  listAssets: protectedProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive().optional(),
        assetType: z.enum(["sprite", "tileset", "animation"]).optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("list_pixel_assets", {
          tenant_id: input.tenantId,
          asset_type: input.assetType,
          limit: input.limit,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getAsset: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_pixel_asset", { asset_id: input.assetId });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  createAsset: protectedProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        name: z.string().min(1),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        assetType: z.enum(["sprite", "tileset", "animation"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("create_pixel_asset", {
          tenant_id: input.tenantId,
          name: input.name,
          width: input.width,
          height: input.height,
          asset_type: input.assetType,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  exportSpriteSheet: protectedProcedure
    .input(
      z.object({
        assetId: z.string().min(1),
        columns: z.number().int().positive().optional(),
        scale: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("export_sprite_sheet", {
          asset_id: input.assetId,
          columns: input.columns,
          scale: input.scale,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getMetadata: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_asset_metadata", { asset_id: input.assetId });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
