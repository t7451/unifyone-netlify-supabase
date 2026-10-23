import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../_core/trpc";
import { historyInput, list } from "./service";

export const workHistoryRouter = router({
  list: protectedProcedure.input(historyInput).query(async ({ ctx, input }) => {
    try {
      return await list(ctx.user.id, input);
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Work history could not be loaded. Please retry.",
      });
    }
  }),
});
