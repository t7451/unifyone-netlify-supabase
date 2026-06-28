/**
 * documentChat/index.ts — tRPC router for documentation Q&A (RAG over the
 * shared docs knowledge base, answered by Claude).
 *
 * Transport layer: procedures, zod schemas, rate-limit middleware. Use-cases
 * live in documentChat.service.ts; data access lives in documentChat.repo.ts.
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { llmRateLimiter } from "../../_core/rateLimiter";
import { ask } from "./documentChat.service";

export const documentChatRouter = router({
  // `documentEmbeddings` is a SHARED, platform-wide documentation knowledge
  // base (no `tenantId` column on the table) -- so tenant scoping is not
  // applicable here. We still require an authenticated user and apply a
  // strict per-user rate limit because this endpoint invokes Claude on
  // every call and is otherwise a free LLM-cost burner.
  ask: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1).max(1000),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .max(20)
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Per-user rate limit on LLM-backed endpoint
      const limit = await llmRateLimiter.check(`documentChat:${ctx.user.id}`);
      if (!limit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Too many requests. Try again in ${Math.ceil(
            limit.retryAfterMs / 1000
          )}s.`,
        });
      }

      return ask(input);
    }),
});
