/**
 * server/routers/shopifyTheme.ts
 *
 * tRPC router for Shopify Theme — section manager and sync tools.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { mcpCallTool } from "../lib/mcpClient";

export const shopifyThemeRouter = router({
  getSections: protectedProcedure
    .input(z.object({ tenantId: z.number().int().positive().optional() }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_theme_sections", {
          tenant_id: input.tenantId,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  syncConfig: protectedProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        section: z.string().min(1),
        settings: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("sync_theme_config", {
          tenant_id: input.tenantId,
          section: input.section,
          settings: input.settings,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getPerformance: protectedProcedure
    .input(z.object({ tenantId: z.number().int().positive() }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_theme_performance", {
          tenant_id: input.tenantId,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  updateSection: protectedProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive(),
        section: z.enum([
          "hero",
          "trust-bar",
          "featured-collections",
          "brand-story",
          "featured-products",
          "testimonials",
          "newsletter",
        ]),
        settings: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("update_section_settings", {
          tenant_id: input.tenantId,
          section: input.section,
          settings: input.settings,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getLoyaltyConfig: protectedProcedure
    .input(z.object({ tenantId: z.number().int().positive() }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_loyalty_config", {
          tenant_id: input.tenantId,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
