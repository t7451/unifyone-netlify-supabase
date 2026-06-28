/**
 * server/routers/shopifyTheme/index.ts
 *
 * tRPC router for Shopify Theme — section manager and sync tools.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 *
 * Tenant isolation: every mcpCallTool() invocation passes
 * `authoritativeTenantId: ctx.user.tenantId` so the MCP worker sees the
 * caller's authenticated tenant regardless of what the client sent. The
 * `tenantId` field is intentionally NOT in the input schemas — it can't
 * be spoofed.
 *
 * Transport only: procedures + zod schemas live here; the MCP dispatch and
 * tenant guard live in shopifyTheme.service.ts.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { requireTenantId, callThemeTool } from "./shopifyTheme.service";

export const shopifyThemeRouter = router({
  getSections: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx);
    return callThemeTool(tenantId, "get_theme_sections", {});
  }),

  syncConfig: protectedProcedure
    .input(
      z.object({
        section: z.string().min(1),
        settings: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return callThemeTool(tenantId, "sync_theme_config", {
        section: input.section,
        settings: input.settings,
      });
    }),

  getPerformance: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx);
    return callThemeTool(tenantId, "get_theme_performance", {});
  }),

  updateSection: protectedProcedure
    .input(
      z.object({
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
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return callThemeTool(tenantId, "update_section_settings", {
        section: input.section,
        settings: input.settings,
      });
    }),

  getLoyaltyConfig: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx);
    return callThemeTool(tenantId, "get_loyalty_config", {});
  }),
});
