/**
 * server/routers/terpforge.ts
 *
 * tRPC router for TerpForge — terpene-science commerce platform.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 *
 * Tenant isolation: every mcpCallTool() invocation passes
 * `authoritativeTenantId: ctx.user.tenantId` so the MCP worker scopes
 * results to the caller's authenticated tenant.
 */

import { z } from "zod";
import { rateLimitedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { mcpCallTool } from "../lib/mcpClient";
import { mcpRateLimiter } from "../_core/rateLimiter";

// All procedures proxy to an external Cloudflare MCP worker — rate-limit
// per user to cap abuse and runaway egress costs.
const protectedProcedure = rateLimitedProcedure(mcpRateLimiter, "mcp:terp");

function requireTenantId(ctx: { user: { tenantId: number | null } }): number {
  const tenantId = ctx.user.tenantId;
  if (tenantId == null) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active tenant" });
  }
  return tenantId;
}

export const terpforgeRouter = router({
  listCompounds: protectedProcedure
    .input(
      z.object({
        profile: z.enum(["FOCUS", "RECOVERY", "CALM"]).optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "list_compounds",
          {
            profile: input.profile,
            limit: input.limit,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getCompound: protectedProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "get_compound",
          { slug: input.slug },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  simulatePurity: protectedProcedure
    .input(
      z.object({
        compoundSlug: z.string().min(1),
        purityPercentage: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "simulate_compound_purity",
          {
            compound_slug: input.compoundSlug,
            purity_percentage: input.purityPercentage,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getCoaData: protectedProcedure
    .input(
      z.object({
        productId: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "get_coa_data",
          {
            product_id: input.productId,
            limit: input.limit,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  listProducts: protectedProcedure
    .input(
      z.object({
        category: z.enum(["apparel", "hardware", "wellness"]).optional(),
        profile: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "list_terp_products",
          {
            category: input.category,
            profile: input.profile,
            limit: input.limit,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  compareProfiles: protectedProcedure
    .input(z.object({ compoundSlugs: z.array(z.string().min(1)).min(2) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "compare_terpene_profiles",
          {
            compound_slugs: input.compoundSlugs,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
