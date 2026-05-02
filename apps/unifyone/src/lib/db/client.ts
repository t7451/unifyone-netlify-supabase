import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export { schema };

type Db = NeonHttpDatabase<typeof schema>;

let cachedSql: NeonQueryFunction<boolean, boolean> | null = null;
let cachedDb: Db | null = null;

export function getDb(): Db {
  if (cachedDb) return cachedDb;
  // Accept any of: NEON_DATABASE_URL (preferred), NETLIFY_DATABASE_URL
  // (auto-set by the Netlify Neon extension), or DATABASE_URL.
  const env = import.meta.env;
  const url =
    env.NEON_DATABASE_URL || env.NETLIFY_DATABASE_URL || env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No database URL set. Provide NEON_DATABASE_URL, or install the Netlify Neon extension."
    );
  }
  cachedSql = neon(url);
  cachedDb = drizzle(cachedSql, { schema });
  return cachedDb;
}
