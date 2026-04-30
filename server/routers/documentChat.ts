import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { documentEmbeddings } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { llmRateLimiter } from "../_core/rateLimiter";

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

// Helper: Get embedding for a query.
//
// NOTE: this is a deterministic hash-based pseudo-embedding — it does not
// produce semantically meaningful vectors. For production-grade semantic
// search, replace with Voyage AI (`voyage-3-large` via the Voyage REST API),
// Anthropic's recommended embeddings provider. Tracked under
// PRODUCTION_HARDENING.md.
async function getQueryEmbedding(query: string): Promise<number[]> {
  const hash = Array.from(query).reduce((acc, char) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);

  // Generate a 1536-dimensional vector from the hash
  const embedding: number[] = [];
  let seed = hash;
  for (let i = 0; i < 1536; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    embedding.push((seed / 233280) * 2 - 1);
  }
  return embedding;
}

export const documentChatRouter = router({
  // `documentEmbeddings` is a SHARED, platform-wide documentation knowledge
  // base (no `tenantId` column on the table) — so tenant scoping is not
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

      // Get embedding for the question
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
