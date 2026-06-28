/**
 * server/routers/apiKeys/index.ts
 *
 * Transport layer for user-scoped provider API keys. Procedures and zod
 * schemas only; use-case logic lives in `apiKeys.service.ts` and data
 * access in `apiKeys.repo.ts`.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { API_KEY_PROVIDERS } from "./apiKeys.repo";
import * as service from "./apiKeys.service";

const providerSchema = z.enum(API_KEY_PROVIDERS);

export const apiKeysRouter = router({
  /** List the user's stored provider keys (masked — last 4 chars only). */
  list: protectedProcedure.query(async ({ ctx }) => {
    return service.list(Number(ctx.user.id));
  }),

  /** Save (or replace) a provider key after validating it live. */
  save: protectedProcedure
    .input(
      z.object({
        provider: providerSchema,
        key: z.string().trim().min(20).max(300),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.save(
        Number(ctx.user.id),
        ctx.user.tenantId ? Number(ctx.user.tenantId) : null,
        input
      );
    }),

  /** Remove a stored provider key. */
  remove: protectedProcedure
    .input(z.object({ provider: providerSchema }))
    .mutation(async ({ ctx, input }) => {
      return service.remove(Number(ctx.user.id), input);
    }),
});
