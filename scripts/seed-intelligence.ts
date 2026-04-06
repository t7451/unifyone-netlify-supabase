#!/usr/bin/env npx tsx

/**
 * Seed Intelligence Script — Phase 42
 *
 * Reads the 6 master intelligence docs from /docs/, chunks them into ~500-word
 * segments, generates placeholder embedding vectors, and inserts them into the
 * documentEmbeddings table so the document chatbot has context to work with.
 *
 * Usage:
 *   DATABASE_URL=<your-db> npx tsx scripts/seed-intelligence.ts
 */

import * as fs from "fs";
import * as path from "path";
import mysql from "mysql2/promise";

// ── Config ────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const url = new URL(DATABASE_URL);
const dbConfig = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  port: Number(url.port) || 3306,
};

/** The 6 master intelligence documents to seed */
const MASTER_DOCS = [
  { file: "00_Master_Intelligence.md", id: "master-intelligence", title: "Master Intelligence" },
  { file: "01_Governance_and_Compliance.md", id: "governance-compliance", title: "Governance and Compliance" },
  { file: "02_Investor_and_Board.md", id: "investor-board", title: "Investor and Board" },
  { file: "03_Technical_Architecture.md", id: "technical-architecture", title: "Technical Architecture" },
  { file: "04_Brand_Canon.md", id: "brand-canon", title: "Brand Canon" },
  { file: "05_Chain_Prompt.md", id: "chain-prompt", title: "Chain Prompt" },
];

const EMBEDDING_DIM = 1536;
const TARGET_CHUNK_WORDS = 500;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Split text into chunks of approximately `targetWords` words, breaking on
 * paragraph boundaries when possible.
 */
function chunkText(text: string, targetWords: number): string[] {
  // Split into paragraphs (double newline)
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let currentChunk = "";
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const paraWordCount = trimmed.split(/\s+/).length;

    // If adding this paragraph would exceed the target by a significant margin,
    // flush the current chunk first (unless it's empty).
    if (currentWordCount > 0 && currentWordCount + paraWordCount > targetWords * 1.3) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
      currentWordCount = 0;
    }

    currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    currentWordCount += paraWordCount;

    // If we've reached the target, flush
    if (currentWordCount >= targetWords) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
      currentWordCount = 0;
    }
  }

  // Don't lose the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate a deterministic placeholder embedding from text content.
 * Uses a simple hash-based seeded PRNG so the same text always produces the
 * same vector — this makes the seed script idempotent in spirit.
 *
 * In production you would replace this with a call to an embeddings API.
 */
function generatePlaceholderEmbedding(text: string): number[] {
  // Simple string hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  const embedding: number[] = [];
  let seed = Math.abs(hash);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    embedding.push((seed / 233280) * 2 - 1); // range [-1, 1]
  }
  return embedding;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const docsDir = path.resolve(__dirname, "..", "docs");

  // Verify docs directory exists
  if (!fs.existsSync(docsDir)) {
    console.error(`Docs directory not found at ${docsDir}`);
    process.exit(1);
  }

  let connection: mysql.Connection | undefined;

  try {
    console.log("Connecting to database...");
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to database");

    // Clear existing intelligence embeddings to make script re-runnable
    const docIds = MASTER_DOCS.map((d) => d.id);
    const placeholders = docIds.map(() => "?").join(", ");
    await connection.execute(
      `DELETE FROM document_embeddings WHERE docId IN (${placeholders})`,
      docIds
    );
    console.log("Cleared existing intelligence embeddings");

    let totalChunks = 0;

    for (const doc of MASTER_DOCS) {
      const filePath = path.join(docsDir, doc.file);

      if (!fs.existsSync(filePath)) {
        console.warn(`  Skipping ${doc.file} — file not found`);
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const chunks = chunkText(content, TARGET_CHUNK_WORDS);

      console.log(`\nProcessing ${doc.file} (${chunks.length} chunks)...`);

      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const embedding = generatePlaceholderEmbedding(chunk);

        await connection.execute(
          `INSERT INTO document_embeddings (docId, docTitle, chunk, chunkIndex, embedding, createdAt)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [doc.id, doc.title, chunk, idx, JSON.stringify(embedding)]
        );
        console.log(`  Chunk ${idx + 1}/${chunks.length} (${chunk.split(/\s+/).length} words)`);
      }

      totalChunks += chunks.length;
    }

    console.log(`\nSeeding complete!`);
    console.log(`  Documents processed: ${MASTER_DOCS.length}`);
    console.log(`  Total chunks inserted: ${totalChunks}`);
    console.log(`  Embedding dimensions: ${EMBEDDING_DIM}`);
    console.log(`  Note: Embeddings are placeholder vectors. Replace with real`);
    console.log(`        embeddings from an API for production similarity search.`);
  } catch (error: any) {
    console.error("Error seeding intelligence:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
