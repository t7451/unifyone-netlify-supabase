import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  API_KEY_PROVIDERS,
  deleteUserApiKey,
  listUserApiKeys,
  upsertUserApiKey,
} from "../lib/userApiKeys";

const providerSchema = z.enum(API_KEY_PROVIDERS);

/** Validate an OpenRouter key with a cheap authenticated call. */
async function validateOpenRouterKey(key: string): Promise<{
  valid: boolean;
  detail?: string;
}> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { authorization: `Bearer ${key}` },
    });
    if (response.ok) return { valid: true };
    return {
      valid: false,
      detail: `OpenRouter rejected the key (HTTP ${response.status}).`,
    };
  } catch (error) {
    return {
      valid: false,
      detail:
        error instanceof Error
          ? `Could not reach OpenRouter: ${error.message}`
          : "Could not reach OpenRouter.",
    };
  }
}

export const apiKeysRouter = router({
  /** List the user's stored provider keys (masked — last 4 chars only). */
  list: protectedProcedure.query(async ({ ctx }) => {
    const keys = await listUserApiKeys(Number(ctx.user.id));
    return { keys };
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
      const validation = await validateOpenRouterKey(input.key);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.detail ?? "The API key failed validation.",
        });
      }
      const saved = await upsertUserApiKey({
        userId: Number(ctx.user.id),
        tenantId: ctx.user.tenantId ? Number(ctx.user.tenantId) : null,
        provider: input.provider,
        key: input.key,
      });
      return { saved };
    }),

  /** Remove a stored provider key. */
  remove: protectedProcedure
    .input(z.object({ provider: providerSchema }))
    .mutation(async ({ ctx, input }) => {
      await deleteUserApiKey({
        userId: Number(ctx.user.id),
        provider: input.provider,
      });
      return { success: true };
    }),
});
