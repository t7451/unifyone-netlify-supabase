import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { summary } from "./service";

export const workInsightsRouter = router({
  summary: protectedProcedure
    .input(
      z
        .object({
          period: z.enum(["week", "month", "year", "all"]).default("month"),
          asOfDate: z.string().optional(),
        })
        .default({ period: "month" })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await summary(
          ctx.user.id,
          input.period,
          new Date(),
          input.asOfDate
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "We could not load your work history. Please try again.",
        });
      }
    }),
});
