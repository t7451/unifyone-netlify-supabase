/**
 * server/routers/pixelforge/index.ts
 *
 * tRPC router for PixelForge Studio — pixel art editor and HTML5 game creation.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 *
 * Tenant isolation: every mcpCallTool() invocation passes
 * `authoritativeTenantId: ctx.user.tenantId`. The `tenantId` field is
 * intentionally NOT in the input schemas — it can't be spoofed.
 *
 * Transport only: procedures + zod schemas live here; the MCP dispatch and
 * tenant guard live in pixelforge.service.ts.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { requireTenantId, callPixelTool } from "./pixelforge.service";

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
      return callPixelTool(tenantId, "list_pixel_assets", {
        asset_type: input.assetType,
        limit: input.limit,
      });
    }),

  getAsset: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return callPixelTool(tenantId, "get_pixel_asset", {
        asset_id: input.assetId,
      });
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
      return callPixelTool(tenantId, "create_pixel_asset", {
        name: input.name,
        width: input.width,
        height: input.height,
        asset_type: input.assetType,
      });
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
      return callPixelTool(tenantId, "export_sprite_sheet", {
        asset_id: input.assetId,
        columns: input.columns,
        scale: input.scale,
      });
    }),

  getMetadata: protectedProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return callPixelTool(tenantId, "get_asset_metadata", {
        asset_id: input.assetId,
      });
    }),
});
