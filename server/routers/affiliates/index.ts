import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import * as service from "./affiliates.service";

const commissionTypeEnum = z.enum(["percentage", "flat", "recurring"]);

export const affiliatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return service.listPrograms(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        category: z.string().max(100).optional(),
        platform: z.string().max(100).optional(),
        commissionRate: z.number().min(0).max(100),
        commissionType: commissionTypeEnum.default("percentage"),
        cookieDuration: z.number().min(0).default(30),
        affiliateLink: z.string().optional(),
        monthlyEarnings: z.number().min(0).default(0),
        pendingPayout: z.number().min(0).default(0),
        instantPayout: z.boolean().default(false),
        active: z.boolean().default(true),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.createProgram(ctx.user.id, input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        category: z.string().optional(),
        platform: z.string().optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        commissionType: commissionTypeEnum.optional(),
        cookieDuration: z.number().min(0).optional(),
        affiliateLink: z.string().optional(),
        monthlyEarnings: z.number().min(0).optional(),
        pendingPayout: z.number().min(0).optional(),
        instantPayout: z.boolean().optional(),
        active: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.updateProgram(ctx.user.id, input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.deleteProgram(ctx.user.id, input.id);
    }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    return service.getSummary(ctx.user.id);
  }),
});
