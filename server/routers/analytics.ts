import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getAnalyticsSummary, getRevenueByDay, getTopProducts, getWebhookEvents } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const requireTenant = (tenantId: number | null | undefined) => {
  if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant." });
  return tenantId;
};

export const analyticsRouter = router({
  summary: protectedProcedure.input(z.object({ days: z.number().default(30) }).optional()).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const summary = await getAnalyticsSummary(tenantId, input?.days ?? 30);
    return summary ?? { totalRevenue: 0, orderCount: 0, customerCount: 0, productCount: 0 };
  }),

  revenueByDay: protectedProcedure.input(z.object({ days: z.number().default(30) }).optional()).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getRevenueByDay(tenantId, input?.days ?? 30);
  }),

  topProducts: protectedProcedure.input(z.object({ limit: z.number().default(5) }).optional()).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getTopProducts(tenantId, input?.limit ?? 5);
  }),

  webhookEvents: protectedProcedure.input(z.object({ limit: z.number().default(20) }).optional()).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getWebhookEvents(tenantId, input?.limit ?? 20);
  }),
});
