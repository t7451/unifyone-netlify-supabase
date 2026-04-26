/**
 * server/routers/terpforge.ts
 *
 * tRPC router for TerpForge — terpene-science commerce platform.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { mcpCallTool } from "../lib/mcpClient";

export const terpforgeRouter = router({
  listCompounds: protectedProcedure
    .input(
      z.object({
        profile: z.enum(["FOCUS", "RECOVERY", "CALM"]).optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("list_compounds", {
          profile: input.profile,
          limit: input.limit,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getCompound: protectedProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_compound", { slug: input.slug });
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
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("simulate_compound_purity", {
          compound_slug: input.compoundSlug,
          purity_percentage: input.purityPercentage,
        });
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
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_coa_data", {
          product_id: input.productId,
          limit: input.limit,
        });
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
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("list_terp_products", {
          category: input.category,
          profile: input.profile,
          limit: input.limit,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  compareProfiles: protectedProcedure
    .input(z.object({ compoundSlugs: z.array(z.string().min(1)).min(2) }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("compare_terpene_profiles", {
          compound_slugs: input.compoundSlugs,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
