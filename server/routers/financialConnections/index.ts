import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  protectedProcedure,
  rateLimitedProcedure,
  router,
} from "../../_core/trpc";
import * as service from "./service";
import * as repo from "./repo";
import { ProviderError } from "./providers";

async function safe<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (error instanceof ProviderError)
      throw new TRPCError({ code: "BAD_GATEWAY", message: error.message });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Connected money could not complete this request. Please try again.",
    });
  }
}
import { createRateLimiter } from "../../_core/rateLimiter";
const linkProcedure = rateLimitedProcedure(
  createRateLimiter({
    name: "financial-link",
    maxAttempts: 20,
    windowMs: 15 * 60_000,
  }),
  "financial-link"
);
const syncProcedure = rateLimitedProcedure(
  createRateLimiter({
    name: "financial-sync",
    maxAttempts: 60,
    windowMs: 15 * 60_000,
  }),
  "financial-sync"
);

const consent = z.object({ readOnlyConsent: z.literal(true) });
const connection = z.object({ connectionId: z.string().uuid() });
export const financialConnectionsRouter = router({
  availability: protectedProcedure.query(({ ctx }) =>
    service.availability(ctx.user.id)
  ),
  list: protectedProcedure.query(({ ctx }) =>
    safe(() => service.list(ctx.user.id))
  ),
  beginBankLink: linkProcedure
    .input(consent)
    .mutation(({ ctx }) => safe(() => service.beginBank(ctx.user.id))),
  completeBankLink: linkProcedure
    .input(consent.extend({ publicToken: z.string().min(1).max(512) }))
    .mutation(({ ctx, input }) =>
      safe(() => service.completeBank(ctx.user.id, input.publicToken))
    ),
  beginGigLink: linkProcedure
    .input(consent)
    .mutation(({ ctx }) => safe(() => service.beginGig(ctx.user.id))),
  refresh: syncProcedure
    .input(connection)
    .mutation(({ ctx, input }) =>
      safe(() => service.sync(ctx.user.id, input.connectionId))
    ),
  disconnect: protectedProcedure
    .input(connection)
    .mutation(({ ctx, input }) =>
      safe(() => service.disconnect(ctx.user.id, input.connectionId))
    ),
  overview: protectedProcedure
    .input(
      z.object({
        days: z.union([z.literal(30), z.literal(90)]).default(30),
        offset: z.number().int().min(0).max(100_000).default(0),
      })
    )
    .query(({ ctx, input }) =>
      safe(() => repo.activityOverview(ctx.user.id, input.days, input.offset))
    ),
});
