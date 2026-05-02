import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { resolveDatabaseUrl } from "../env";
import { DatabaseConnectionError } from "@shared/errors";
import { NO_DATABASE_URL } from "@shared/const";

export { schema };

type Db = NeonHttpDatabase<typeof schema>;

let cachedSql: NeonQueryFunction<boolean, boolean> | null = null;
let cachedDb: Db | null = null;

export function getDb(): Db {
  if (cachedDb) return cachedDb;
  const url = resolveDatabaseUrl(import.meta.env);
  if (!url) {
    throw new DatabaseConnectionError(NO_DATABASE_URL);
  }
  cachedSql = neon(url);
  cachedDb = drizzle(cachedSql, { schema });
  return cachedDb;
}
