/**
 * server/routers/pixelforge.ts
 *
 * tRPC router for PixelForge Studio — pixel art editor and HTML5 game creation.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 *
 * Tenant isolation: every mcpCallTool() invocation passes
 * `authoritativeTenantId: ctx.user.tenantId`. The `tenantId` field is
 * intentionally NOT in the input schemas — it can't be spoofed.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { mcpCallTool } from "../lib/mcpClient";

function requireTenantId(ctx: { user: { tenantId: number | null } }): number {
  const tenantId = ctx.user.tenantId;
  if (tenantId == null) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });
  }
  return tenantId;
}

export const pixelforgeRouter = router({
  listAssets: protectedProcedure
    .input(
      z.object({
        assetType: z.enum(["sprite", "tileset", "animation"]).optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "list_pixel_assets",
          {
            asset_type: input.assetType,
            limit: input.limit,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getAsset: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "get_pixel_asset",
          { asset_id: input.assetId },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  createAsset: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        assetType: z.enum(["sprite", "tileset", "animation"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "create_pixel_asset",
          {
            name: input.name,
            width: input.width,
            height: input.height,
            asset_type: input.assetType,
          },
          { authoritativeTenantId: tenantId }
        );
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
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "export_sprite_sheet",
          {
            asset_id: input.assetId,
            columns: input.columns,
            scale: input.scale,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getMetadata: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "get_asset_metadata",
          { asset_id: input.assetId },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
