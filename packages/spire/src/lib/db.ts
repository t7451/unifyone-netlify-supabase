import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../schema.js";

// Connection is per-process. Netlify scheduled functions are cold-start-heavy —
// keep the pool small and the timeout short so a wedged query can't hold a
// container invocation open past its runtime budget.

export function connectNeon(url: string) {
  const sql = postgres(url, {
    ssl: "require",
    max: 3,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false, // pgbouncer / transaction-pooler friendly
  });
  return { sql, db: drizzle(sql, { schema }) };
}

export { schema };
