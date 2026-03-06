#!/usr/bin/env node

/**
 * Seed Script: Master Intelligence Documents → documentEmbeddings (Direct SQL)
 * 
 * Uses direct database connection instead of Supabase client to avoid schema cache issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration from DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

// Parse DATABASE_URL: mysql://user:password@host:port/database?ssl=...
const urlMatch = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!urlMatch) {
  console.error('❌ Invalid DATABASE_URL format');
  process.exit(1);
}

const [, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME] = urlMatch;

const CHUNK_SIZE = 500; // tokens per chunk (approximate)

// Master Intelligence documents
const DOCS = [
  '00_Master_Intelligence.md',
  '01_Governance_and_Compliance.md',
  '02_Investor_and_Board.md',
  '03_Technical_Architecture.md',
  '04_Brand_Canon.md',
  '05_Chain_Prompt.md',
];

/**
 * Split text into chunks by approximate token count
 */
function chunkText(text, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  const words = text.split(/\s+/);
  let currentChunk = [];
  let currentLength = 0;

  for (const word of words) {
    const wordLength = Math.ceil(word.length / 4); // Rough token estimate
    if (currentLength + wordLength > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [word];
      currentLength = wordLength;
    } else {
      currentChunk.push(word);
      currentLength += wordLength;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

/**
 * Generate deterministic embedding for text
 */
function generateEmbedding(text) {
  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      h = ((h << 5) - h) + char;
      h = h & h;
    }
    return h;
  };

  const seed = Math.abs(hash(text));
  const embedding = new Array(1536).fill(0).map((_, i) => {
    const rng = Math.sin(seed + i) * 10000;
    return rng - Math.floor(rng);
  });

  return embedding;
}

/**
 * Seed a single document
 */
async function seedDocument(connection, docName) {
  const docPath = path.join(__dirname, 'docs', docName);

  if (!fs.existsSync(docPath)) {
    console.error(`❌ Document not found: ${docPath}`);
    return { success: false, docName, error: 'File not found' };
  }

  try {
    console.log(`\n📖 Processing: ${docName}`);
    const content = fs.readFileSync(docPath, 'utf-8');
    const chunks = chunkText(content, CHUNK_SIZE);

    console.log(`   Split into ${chunks.length} chunks`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Generate embedding
        const embedding = generateEmbedding(chunk);

        // Insert into document_embeddings table
        const docId = docName.replace('.md', '');
        const docTitle = docName.replace('.md', '').replace(/_/g, ' ');
        const embeddingJson = JSON.stringify(embedding);

        await connection.execute(
          `INSERT INTO document_embeddings (docId, docTitle, chunk, chunkIndex, embedding) 
           VALUES (?, ?, ?, ?, ?)`,
          [docId, docTitle, chunk, i, embeddingJson]
        );

        console.log(`   ✓ Chunk ${i}/${chunks.length - 1}`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Chunk ${i}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`   Result: ${successCount} inserted, ${errorCount} failed`);
    return {
      success: errorCount === 0,
      docName,
      successCount,
      errorCount,
      totalChunks: chunks.length,
    };
  } catch (error) {
    console.error(`❌ Error processing ${docName}: ${error.message}`);
    return { success: false, docName, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Seeding Master Intelligence Documents (Direct SQL)\n');
  console.log(`Configuration:`);
  console.log(`  Database: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}`);
  console.log(`  Chunk Size: ~${CHUNK_SIZE} tokens`);
  console.log(`  Documents: ${DOCS.length}`);

  let connection;

  try {
    // Create connection with SSL for TiDB Cloud
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: parseInt(DB_PORT),
      ssl: {
        rejectUnauthorized: false,
      },
      enableKeepAlive: true,
    });

    console.log(`\n✓ Connected to database\n`);

    const results = [];

    for (const doc of DOCS) {
      const result = await seedDocument(connection, doc);
      results.push(result);
    }

    // Summary
    console.log('\n\n📊 Summary\n');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalChunks = results.reduce((sum, r) => sum + (r.totalChunks || 0), 0);
    const totalInserted = results.reduce((sum, r) => sum + (r.successCount || 0), 0);

    console.log(`Documents: ${successful} successful, ${failed} failed`);
    console.log(`Chunks: ${totalInserted}/${totalChunks} inserted`);
    console.log(`Total size: ~${(totalInserted * CHUNK_SIZE / 1000).toFixed(1)}K tokens`);

    if (failed === 0) {
      console.log('\n✅ All documents seeded successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some documents failed. Check errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
