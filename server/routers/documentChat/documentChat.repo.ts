/**
 * documentChat.repo.ts — data access for the document-chat router.
 *
 * Reads the shared, platform-wide documentation knowledge base
 * (`documentEmbeddings`) and provides the Voyage query embedding helper.
 */

import { getDb } from "../../db";
import { documentEmbeddings } from "../../../drizzle/schema";
import { voyageEmbedOne } from "../../_core/voyage";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type DocumentChunk = typeof documentEmbeddings.$inferSelect;

/** Resolve the DB handle, throwing when persistence is unavailable. */
export async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
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
export async function getQueryEmbedding(query: string): Promise<number[]> {
  return voyageEmbedOne(query, { mode: "query" });
}

/** Retrieve all document chunks (platform-wide shared docs). */
export async function getAllChunks(db: Db): Promise<DocumentChunk[]> {
  return db.select().from(documentEmbeddings);
}
