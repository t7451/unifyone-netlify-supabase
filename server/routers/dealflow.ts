/**
 * server/routers/dealflow.ts
 *
 * tRPC router for DealFlow — referral & affiliate deal management.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { mcpCallTool } from "../lib/mcpClient";

export const dealflowRouter = router({
  listDeals: protectedProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive().optional(),
        category: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        search: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("list_deals", {
          tenant_id: input.tenantId,
          category: input.category,
          difficulty: input.difficulty,
          search: input.search,
          limit: input.limit,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getDeal: protectedProcedure
    .input(z.object({ dealId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_deal", { deal_id: input.dealId });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  searchDeals: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        tenantId: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("search_deals", {
          query: input.query,
          tenant_id: input.tenantId,
          limit: input.limit,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getRecommendations: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        tenantId: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_deal_recommendations", {
          user_id: input.userId,
          tenant_id: input.tenantId,
          limit: input.limit,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  manageWishlist: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        dealId: z.string().optional(),
        action: z.enum(["add", "remove", "list"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("manage_wishlist", {
          user_id: input.userId,
          deal_id: input.dealId,
          action: input.action,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  trackConversion: protectedProcedure
    .input(
      z.object({
        dealId: z.string().min(1),
        userId: z.string().optional(),
        eventType: z.enum(["click", "conversion"]),
        value: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("track_deal_conversion", {
          deal_id: input.dealId,
          user_id: input.userId,
          event_type: input.eventType,
          value: input.value,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  generateContent: protectedProcedure
    .input(
      z.object({
        dealId: z.string().min(1),
        contentType: z.enum(["blog_post", "landing_page", "description"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("generate_deal_content", {
          deal_id: input.dealId,
          content_type: input.contentType,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getFeatureFlags: protectedProcedure
    .input(z.object({ tenantId: z.number().int().positive().optional() }))
    .query(async ({ input }) => {
      try {
        return await mcpCallTool("get_feature_flags", {
          tenant_id: input.tenantId,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  setFeatureFlag: protectedProcedure
    .input(
      z.object({
        flagId: z.string().min(1),
        enabled: z.boolean(),
        rolloutPercentage: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await mcpCallTool("set_feature_flag", {
          flag_id: input.flagId,
          enabled: input.enabled,
          rollout_percentage: input.rolloutPercentage,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
