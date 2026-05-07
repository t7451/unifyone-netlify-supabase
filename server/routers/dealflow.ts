/**
 * server/routers/dealflow.ts
 *
 * tRPC router for DealFlow — referral & affiliate deal management.
 * All procedures are protected (require auth) and proxy to the MCP tool layer.
 *
 * Tenant isolation: every mcpCallTool() invocation passes
 * `authoritativeTenantId: ctx.user.tenantId` so the MCP worker sees the
 * caller's authenticated tenant regardless of what the client sent. The
 * `tenantId` field is intentionally NOT in the input schemas — it can't
 * be spoofed.
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

export const dealflowRouter = router({
  listDeals: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        search: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "list_deals",
          {
            category: input.category,
            difficulty: input.difficulty,
            search: input.search,
            limit: input.limit,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getDeal: protectedProcedure
    .input(z.object({ dealId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "get_deal",
          { deal_id: input.dealId },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  searchDeals: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "search_deals",
          {
            query: input.query,
            limit: input.limit,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getRecommendations: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "get_deal_recommendations",
          {
            user_id: input.userId,
            limit: input.limit,
          },
          { authoritativeTenantId: tenantId }
        );
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
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "manage_wishlist",
          {
            user_id: input.userId,
            deal_id: input.dealId,
            action: input.action,
          },
          { authoritativeTenantId: tenantId }
        );
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
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "track_deal_conversion",
          {
            deal_id: input.dealId,
            user_id: input.userId,
            event_type: input.eventType,
            value: input.value,
          },
          { authoritativeTenantId: tenantId }
        );
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
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "generate_deal_content",
          {
            deal_id: input.dealId,
            content_type: input.contentType,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  getFeatureFlags: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx);
    try {
      return await mcpCallTool(
        "get_feature_flags",
        {},
        { authoritativeTenantId: tenantId }
      );
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
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      try {
        return await mcpCallTool(
          "set_feature_flag",
          {
            flag_id: input.flagId,
            enabled: input.enabled,
            rollout_percentage: input.rolloutPercentage,
          },
          { authoritativeTenantId: tenantId }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
