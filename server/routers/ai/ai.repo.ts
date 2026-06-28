/**
 * ai.repo.ts — data access for the Kai AI router.
 *
 * Wraps the Drizzle queries against `aiConversations`.
 */

import { getDb } from "../../db";
import { aiConversations } from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export type ConvoMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};

/** List conversation summaries for a user (most-recently updated first). */
export async function listConversations(userId: number) {
  const db = await getDb();
  if (!db) return { conversations: [] };
  const convos = await db
    .select({
      id: aiConversations.id,
      title: aiConversations.title,
      context: aiConversations.context,
      createdAt: aiConversations.createdAt,
      updatedAt: aiConversations.updatedAt,
    })
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(desc(aiConversations.updatedAt))
    .limit(20);
  return { conversations: convos };
}

/** Get a single conversation with full message history, scoped to the user. */
export async function getConversation(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [convo] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId)))
    .limit(1);
  if (!convo) throw new Error("Conversation not found");
  return { conversation: convo };
}

/** Load the existing message history for a conversation, if it belongs to the user. */
export async function loadExistingMessages(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number,
  conversationId: number
): Promise<ConvoMessage[]> {
  const [existing] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId)
      )
    )
    .limit(1);
  if (existing) {
    return (existing.messages as ConvoMessage[]) ?? [];
  }
  return [];
}

/** Update the message history of an existing conversation. */
export async function updateConversationMessages(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number,
  conversationId: number,
  messages: ConvoMessage[]
): Promise<void> {
  await db
    .update(aiConversations)
    .set({ messages, updatedAt: new Date() })
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId)
      )
    );
}

/** Insert a new conversation, returning its id. */
export async function insertConversation(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  values: {
    userId: number;
    context: string;
    messages: ConvoMessage[];
    title: string;
  }
): Promise<number | undefined> {
  const [inserted] = await db
    .insert(aiConversations)
    .values(values)
    .returning({ id: aiConversations.id });
  return inserted?.id;
}

/** Delete a single conversation scoped to the user. */
export async function deleteConversation(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(aiConversations)
    .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId)));
  return { success: true };
}

/** Delete all conversations for the user. */
export async function clearAllConversations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(aiConversations).where(eq(aiConversations.userId, userId));
  return { success: true };
}
