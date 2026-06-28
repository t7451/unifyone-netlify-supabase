import { z } from "zod";
import { protectedProcedure, router, tenantProcedure } from "../../_core/trpc";
import * as service from "./kaiCredits.service";

export const kaiCreditsRouter = router({
  listPackages: protectedProcedure.query(async () => {
    const packages = await service.listActivePackages();
    return { packages };
  }),

  getBalance: tenantProcedure
    .input(
      z.object({ transactionLimit: z.number().min(1).max(100).default(20) })
    )
    .query(async ({ ctx, input }) => {
      return service.getKaiBalance(
        ctx.user,
        ctx.tenantId,
        input.transactionLimit
      );
    }),

  listHistory: tenantProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(25) }))
    .query(async ({ ctx, input }) => {
      return service.listPurchaseHistory(ctx.user, ctx.tenantId, input.limit);
    }),

  createCheckout: tenantProcedure
    .input(
      z
        .object({
          packageSlug: z.string().min(1).max(64).optional(),
          packageId: z.number().int().positive().optional(),
          origin: z.string().min(1),
        })
        .refine(input => input.packageSlug || input.packageId, {
          message: "packageSlug or packageId is required",
        })
    )
    .mutation(async ({ ctx, input }) => {
      return service.createKaiCreditCheckout(ctx.user, ctx.tenantId, input);
    }),
});
