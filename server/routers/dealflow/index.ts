/**
 * server/routers/dealflow/index.ts
 *
 * tRPC router for DealFlow — referral & affiliate deal management.
 * Transport layer: procedures, input schemas, auth. Business logic and
 * data access live in dealflow.service.ts / dealflow.repo.ts.
 *
 * All procedures are protected (require auth) and proxy to the MCP tool
 * layer. Tenant isolation: the service resolves the caller's authoritative
 * tenant id and forwards it to every MCP call. The `tenantId` field is
 * intentionally NOT in the input schemas — it can't be spoofed.
 */

import { z } from "zod";
import { operatorProcedure, router } from "../../_core/trpc";
import { dealflowService, requireTenantId } from "./dealflow.service";

export const dealflowRouter = router({
  listDeals: operatorProcedure
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
      return dealflowService.listDeals(tenantId, input);
    }),

  getDeal: operatorProcedure
    .input(z.object({ dealId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return dealflowService.getDeal(tenantId, input.dealId);
    }),

  searchDeals: operatorProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return dealflowService.searchDeals(tenantId, input);
    }),

  getRecommendations: operatorProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        limit: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return dealflowService.getRecommendations(tenantId, input);
    }),

  manageWishlist: operatorProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        dealId: z.string().optional(),
        action: z.enum(["add", "remove", "list"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return dealflowService.manageWishlist(tenantId, input);
    }),

  trackConversion: operatorProcedure
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
      return dealflowService.trackConversion(tenantId, input);
    }),

  generateContent: operatorProcedure
    .input(
      z.object({
        dealId: z.string().min(1),
        contentType: z.enum(["blog_post", "landing_page", "description"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return dealflowService.generateContent(tenantId, input);
    }),

  getFeatureFlags: operatorProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx);
    return dealflowService.getFeatureFlags(tenantId);
  }),

  setFeatureFlag: operatorProcedure
    .input(
      z.object({
        flagId: z.string().min(1),
        enabled: z.boolean(),
        rolloutPercentage: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenantId(ctx);
      return dealflowService.setFeatureFlag(tenantId, input);
    }),
});
