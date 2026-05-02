import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "../env";

export { schema };

type Db = NeonHttpDatabase<typeof schema>;

let cachedSql: NeonQueryFunction<boolean, boolean> | null = null;
let cachedDb: Db | null = null;

export function getDb(): Db {
  if (cachedDb) return cachedDb;
  const url = resolveDatabaseUrl(import.meta.env);
  if (!url) {
    throw new Error(
      "No database URL set. Provide NEON_DATABASE_URL, or install the Netlify Neon extension."
    );
  }
  cachedSql = neon(url);
  cachedDb = drizzle(cachedSql, { schema });
  return cachedDb;
}
