import { z } from "zod";
import { operatorProcedure, router } from "../../_core/trpc";
import * as service from "./revenueStreams.service";

const streamTypeEnum = z.enum([
  "affiliate",
  "saas",
  "consulting",
  "physical",
  "digital",
  "passive",
]);
const streamStatusEnum = z.enum(["active", "pending", "inactive", "broken"]);

export const revenueStreamsRouter = router({
  list: operatorProcedure.query(async ({ ctx }) => {
    return service.listStreams(ctx.user.id);
  }),

  create: operatorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        type: streamTypeEnum,
        platform: z.string().max(100).optional(),
        monthlyValue: z.number().min(0).default(0),
        commissionRate: z.number().min(0).max(100).optional(),
        status: streamStatusEnum.default("active"),
        affiliateLink: z.string().url().optional().or(z.literal("")),
        cookieDuration: z.number().min(0).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.createStream(ctx.user.id, input);
    }),

  update: operatorProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        type: streamTypeEnum.optional(),
        platform: z.string().max(100).optional(),
        monthlyValue: z.number().min(0).optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        status: streamStatusEnum.optional(),
        affiliateLink: z.string().optional(),
        cookieDuration: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.updateStreamRecord(ctx.user.id, input);
    }),

  delete: operatorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.deleteStreamRecord(ctx.user.id, input.id);
    }),

  getSummary: operatorProcedure.query(async ({ ctx }) => {
    return service.getStreamSummary(ctx.user.id);
  }),
});
