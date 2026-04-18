import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export { schema };

type Db = NeonHttpDatabase<typeof schema>;

let cachedSql: NeonQueryFunction<boolean, boolean> | null = null;
let cachedDb: Db | null = null;

export function getDb(): Db {
  if (cachedDb) return cachedDb;
  const url = import.meta.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL not set");
  cachedSql = neon(url);
  cachedDb = drizzle(cachedSql, { schema });
  return cachedDb;
}
