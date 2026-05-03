#!/usr/bin/env npx tsx

/**
 * Seed Intelligence Script - Phase 42
 *
 * Reads the 6 master intelligence docs from /docs/, chunks them into ~500-word
 * segments, generates real semantic embeddings via Voyage AI, and inserts them
 * into the documentEmbeddings table so the document chatbot has context to
 * work with.
 *
 * Usage:
 *   DATABASE_URL=<your-db> VOYAGE_API_KEY=<your-key> \
 *     npx tsx scripts/seed-intelligence.ts
 *
 * If VOYAGE_API_KEY is unset, the helper falls back to deterministic hash
 * embeddings (useful for local dev only - production must set the key).
 */

import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";
import { voyageEmbed, EMBEDDING_DIM } from "../server/_core/voyage";

// -- Config -----------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

/** The 6 master intelligence documents to seed */
const MASTER_DOCS = [
  {
    file: "00_Master_Intelligence.md",
    id: "master-intelligence",
    title: "Master Intelligence",
  },
  {
    file: "01_Governance_and_Compliance.md",
    id: "governance-compliance",
    title: "Governance and Compliance",
  },
  {
    file: "02_Investor_and_Board.md",
    id: "investor-board",
    title: "Investor and Board",
  },
  {
    file: "03_Technical_Architecture.md",
    id: "technical-architecture",
    title: "Technical Architecture",
  },
  { file: "04_Brand_Canon.md", id: "brand-canon", title: "Brand Canon" },
  { file: "05_Chain_Prompt.md", id: "chain-prompt", title: "Chain Prompt" },
];

const TARGET_CHUNK_WORDS = 500;

// -- Helpers ----------------------------------------------------------------

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
    if (
      currentWordCount > 0 &&
      currentWordCount + paraWordCount > targetWords * 1.3
    ) {
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

// -- Main -------------------------------------------------------------------

async function main() {
  const docsDir = path.resolve(__dirname, "..", "docs");

  // Verify docs directory exists
  if (!fs.existsSync(docsDir)) {
    console.error(`Docs directory not found at ${docsDir}`);
    process.exit(1);
  }

  if (!process.env.VOYAGE_API_KEY) {
    console.warn(
      "VOYAGE_API_KEY is not set - falling back to deterministic hash embeddings."
    );
    console.warn(
      "Production deployments must set VOYAGE_API_KEY for semantic retrieval."
    );
  }

  try {
    console.log("Connecting to database...");

    // Clear existing intelligence embeddings to make script re-runnable.
    // The current Neon serverless API uses tagged-template literals or the
    // `sql.query("...", params)` form -- NOT the legacy `sql("...", params)`
    // call signature. We use the tagged-template form here.
    for (const doc of MASTER_DOCS) {
      await sql`DELETE FROM document_embeddings WHERE "docId" = ${doc.id}`;
    }
    console.log("Cleared existing intelligence embeddings");

    let totalChunks = 0;

    for (const doc of MASTER_DOCS) {
      const filePath = path.join(docsDir, doc.file);

      if (!fs.existsSync(filePath)) {
        console.warn(`  Skipping ${doc.file} - file not found`);
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const chunks = chunkText(content, TARGET_CHUNK_WORDS);

      console.log(`\nProcessing ${doc.file} (${chunks.length} chunks)...`);

      // Batch-embed all chunks for this doc in one API round-trip when
      // possible. voyageEmbed handles batching, retries, and fallback.
      const embeddings = await voyageEmbed(chunks, { mode: "document" });

      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const embedding = embeddings[idx];
        const embeddingJson = JSON.stringify(embedding);

        await sql`
          INSERT INTO document_embeddings ("docId", "docTitle", chunk, "chunkIndex", embedding, "createdAt")
          VALUES (${doc.id}, ${doc.title}, ${chunk}, ${idx}, ${embeddingJson}, NOW())
        `;
        console.log(
          `  Chunk ${idx + 1}/${chunks.length} (${chunk.split(/\s+/).length} words)`
        );
      }

      totalChunks += chunks.length;
    }

    console.log(`\nSeeding complete!`);
    console.log(`  Documents processed: ${MASTER_DOCS.length}`);
    console.log(`  Total chunks inserted: ${totalChunks}`);
    console.log(`  Embedding dimensions: ${EMBEDDING_DIM}`);
    if (process.env.VOYAGE_API_KEY) {
      console.log(
        `  Embeddings: real Voyage AI vectors (model=${process.env.VOYAGE_MODEL || "voyage-3-large"}).`
      );
    } else {
      console.log(
        `  Embeddings: deterministic hash fallback. Set VOYAGE_API_KEY for semantic retrieval.`
      );
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error seeding intelligence:", msg);
    process.exit(1);
  }
}

main();
