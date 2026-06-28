/**
 * server/routers/terpforge/index.ts
 *
 * tRPC router for TerpForge — terpene-science commerce platform.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 *
 * Tenant isolation: every mcpCallTool() invocation passes
 * `authoritativeTenantId: ctx.user.tenantId` so the MCP worker scopes
 * results to the caller's authenticated tenant.
 *
 * Transport only: rate-limited procedures + zod schemas live here; the MCP
 * dispatch and tenant guard live in terpforge.service.ts.
 */

import { z } from "zod";
import { rateLimitedProcedure, router } from "../../_core/trpc";
import { mcpRateLimiter } from "../../_core/rateLimiter";
import { requireTenantId, callTerpTool } from "./terpforge.service";

// All procedures proxy to an external Cloudflare MCP worker — rate-limit
// per user to cap abuse and runaway egress costs.
const protectedProcedure = rateLimitedProcedure(mcpRateLimiter, "mcp:terp");

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
      return callTerpTool(tenantId, "list_compounds", {
        profile: input.profile,
        limit: input.limit,
      });
    }),

  getCompound: protectedProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return callTerpTool(tenantId, "get_compound", { slug: input.slug });
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
      return callTerpTool(tenantId, "simulate_compound_purity", {
        compound_slug: input.compoundSlug,
        purity_percentage: input.purityPercentage,
      });
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
      return callTerpTool(tenantId, "get_coa_data", {
        product_id: input.productId,
        limit: input.limit,
      });
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
      return callTerpTool(tenantId, "list_terp_products", {
        category: input.category,
        profile: input.profile,
        limit: input.limit,
      });
    }),

  compareProfiles: protectedProcedure
    .input(z.object({ compoundSlugs: z.array(z.string().min(1)).min(2) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return callTerpTool(tenantId, "compare_terpene_profiles", {
        compound_slugs: input.compoundSlugs,
      });
    }),
});
