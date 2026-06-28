/**
 * documentChat.service.ts — use-cases for the document-chat router.
 *
 * Retrieval-augmented Q&A over the shared documentation knowledge base:
 * embeds the question (Voyage), ranks chunks by cosine similarity, builds the
 * grounded system prompt, and calls Claude.
 */

import { invokeLLM } from "../../_core/llm";
import {
  getAllChunks,
  getQueryEmbedding,
  requireDb,
  type DocumentChunk,
} from "./documentChat.repo";

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

type ConversationTurn = { role: "user" | "assistant"; content: string };

export async function ask(input: {
  question: string;
  conversationHistory: ConversationTurn[];
}) {
  const db = await requireDb();

  // Get embedding for the question (Voyage, mode=query)
  const queryEmbedding = await getQueryEmbedding(input.question);

  // Retrieve all document chunks (platform-wide shared docs)
  const allChunks = await getAllChunks(db);

  // Compute similarity scores and sort
  const scoredChunks = allChunks
    .map((chunk: DocumentChunk) => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding as number[]),
    }))
    .sort((a, b) => b.similarity - a.similarity);

  // Get top 5 most relevant chunks
  const relevantChunks = scoredChunks.slice(0, 5);

  // Build context from relevant chunks
  const context = relevantChunks
    .map(
      (chunk: (typeof scoredChunks)[0]) => `[${chunk.docTitle}]\n${chunk.chunk}`
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
    response.choices[0]?.message?.content || "I couldn't generate a response.";

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
}
