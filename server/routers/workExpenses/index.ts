import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../_core/trpc";
import { createExpenseInput, listExpensesInput } from "./service";
import * as service from "./service";

async function safe<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "This expense operation could not finish. Please retry.",
    });
  }
}
export const workExpensesRouter = router({
  create: protectedProcedure
    .input(createExpenseInput)
    .mutation(({ ctx, input }) =>
      safe(() => service.create(ctx.user.id, input))
    ),
  list: protectedProcedure
    .input(listExpensesInput.default({ period: "month", limit: 25, offset: 0 }))
    .query(({ ctx, input }) => safe(() => service.list(ctx.user.id, input))),
  remove: protectedProcedure
    .input(z.object({ expenseId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      safe(() => service.remove(ctx.user.id, input.expenseId))
    ),
});
