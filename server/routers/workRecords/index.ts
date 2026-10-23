import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../_core/trpc";
import { createWorkRecordInput } from "./service";
import * as service from "./service";

async function safe<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    // Never expose query text, connection details or submitted financial data.
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The work record operation could not finish. Please retry.",
    });
  }
}
export const workRecordsRouter = router({
  get: protectedProcedure
    .input(z.object({ recordId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      safe(() => service.get(ctx.user.id, input.recordId))
    ),
  update: protectedProcedure
    .input(service.updateWorkRecordInput)
    .mutation(({ ctx, input }) =>
      safe(() => service.update(ctx.user.id, input))
    ),
  create: protectedProcedure
    .input(createWorkRecordInput)
    .mutation(({ ctx, input }) =>
      safe(() => service.create(ctx.user.id, input))
    ),
  remove: protectedProcedure
    .input(z.object({ recordId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      safe(() => service.remove(ctx.user.id, input.recordId))
    ),
});
