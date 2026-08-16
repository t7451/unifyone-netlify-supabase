/**
 * ai/index.ts — tRPC router for Kai, the UnifyOne AI sidekick.
 *
 * Transport layer: procedures, zod schemas, middleware. LLM orchestration and
 * credit-metering use-cases live in ai.service.ts; conversation data access
 * lives in ai.repo.ts; prompt constants live in ai.prompts.ts.
 */

import { z } from "zod";
import { protectedProcedure, router, tenantProcedure } from "../../_core/trpc";
import { KAI_MODEL_IDS } from "../../lib/kaiModels";
import * as service from "./ai.service";

export const aiRouter = router({
  /** List Kai model choices clients are allowed to request. */
  listModels: protectedProcedure.query(() => service.listModels()),

  /** Get context-aware suggested prompts for the current page — Kai */
  getSuggestions: protectedProcedure
    .input(z.object({ context: z.string().default("general") }))
    .query(({ input }) => service.getSuggestions(input.context)),

  /** List conversation history for the current user */
  listConversations: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx }) => service.listConversations(ctx.user.id)),

  /** Get a specific conversation with full message history */
  getConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) =>
      service.getConversation(ctx.user.id, input.id)
    ),

  /** Send a message and get an AI response — persists to conversation history */
  chat: tenantProcedure
    .input(
      z.object({
        message: z.string().min(1).max(4000),
        context: z.string().default("general"),
        conversationId: z.number().optional(),
        model: z.enum(KAI_MODEL_IDS).optional(),
        /** Optional data context injected into the system prompt (e.g. current shift stats) */
        dataContext: z.string().optional(),
        /** Response quality: fast | standard | high (default standard; premium models → high) */
        quality: z.enum(["fast", "standard", "high"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => service.chat(ctx, input)),

  /** Delete a conversation */
  deleteConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) =>
      service.deleteConversation(ctx.user.id, input.id)
    ),

  /** Clear all conversations for the current user */
  clearAllConversations: protectedProcedure.mutation(async ({ ctx }) =>
    service.clearAllConversations(ctx.user.id)
  ),
});
