import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { logger } from "../_core/logger";
import { resolveDatabaseUrl } from "../lib/databaseUrl";
// drizzle/neon-http loaded dynamically in getDb() to prevent cold-start crash

let _db: NeonHttpDatabase | null = null;

export async function getDb() {
  if (_db) return _db;
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) return null;
  try {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle: drizzleFn } = await import("drizzle-orm/neon-http");
    const queryClient = neon(connectionString);
    _db = drizzleFn(queryClient);
  } catch (error) {
    logger.error("Database connection failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    _db = null;
  }
  return _db;
}
