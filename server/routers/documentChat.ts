import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { documentEmbeddings } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { llmRateLimiter } from "../_core/rateLimiter";
import { voyageEmbedOne } from "../_core/voyage";

// Helper: Compute cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Get a query embedding via Voyage AI.
 *
 * Production-grade semantic embedding using the Voyage AI REST API
 * (model: voyage-3-large by default; override via VOYAGE_MODEL). Falls back
 * automatically to a deterministic hash embedding when VOYAGE_API_KEY is
 * unset or the API errors. See server/_core/voyage.ts for details.
 *
 * Indexing-side calls (when adding documents) should pass mode="document";
 * search-side calls (this one) pass mode="query" so Voyage applies the
 * correct task-specific prompting internally.
 */
async function getQueryEmbedding(query: string): Promise<number[]> {
  return voyageEmbedOne(query, { mode: "query" });
}

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

      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Get embedding for the question (Voyage, mode=query)
      const queryEmbedding = await getQueryEmbedding(input.question);

      // Retrieve all document chunks (platform-wide shared docs)
      const allChunks = await db.select().from(documentEmbeddings);

      // Compute similarity scores and sort
      const scoredChunks = allChunks
        .map((chunk: typeof documentEmbeddings.$inferSelect) => ({
          ...chunk,
          similarity: cosineSimilarity(
            queryEmbedding,
            chunk.embedding as number[]
          ),
        }))
        .sort((a, b) => b.similarity - a.similarity);

      // Get top 5 most relevant chunks
      const relevantChunks = scoredChunks.slice(0, 5);

      // Build context from relevant chunks
      const context = relevantChunks
        .map(
          (chunk: (typeof scoredChunks)[0]) =>
            `[${chunk.docTitle}]\n${chunk.chunk}`
        )
        .join("\n\n---\n\n");

      // Build system prompt
      const systemPrompt = `You are a helpful assistant for UnifyOne, a Cathedral Framework-based commerce platform powered by Kai.

Answer user questions based on the following documentation context. Be concise, accurate, and helpful. If the answer is not in the documentation, say so honestly.

DOCUMENTATION CONTEXT:
${context}`;

      // Build messages array
      const messages = [
        ...input.conversationHistory.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user" as const, content: input.question },
      ];

      // Call Claude
      const response = await invokeLLM({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      });

      const assistantMessage =
        response.choices[0]?.message?.content ||
        "I couldn't generate a response.";

      // Return response with source documents
      return {
        answer: assistantMessage,
        sources: relevantChunks.map((chunk: (typeof scoredChunks)[0]) => ({
          docId: chunk.docId,
          docTitle: chunk.docTitle,
          chunk: chunk.chunk.substring(0, 200) + "...",
          similarity: chunk.similarity,
        })),
      };
    }),
});
