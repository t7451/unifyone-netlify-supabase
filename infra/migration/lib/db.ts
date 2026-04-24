import postgres from "postgres";

// We use the `postgres` driver here (not @neondatabase/serverless) because the
// migration scripts run from a workstation against the Neon direct connection
// string — no edge runtime, no HTTP-per-query. `postgres.js` handles bulk
// inserts and COPY much better than the HTTP driver.

export function connectNeon(url: string) {
  const sql = postgres(url, {
    ssl: "require",
    max: 4,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false, // drizzle/pgbouncer-friendly default; we issue raw SQL here
  });
  return sql;
}

export function connectSupabase(url: string) {
  // Supabase's direct port 5432 enforces SSL; session pool is fine for one-off
  // reads. We never write to Supabase, so we open a very small pool.
  const sql = postgres(url, {
    ssl: "require",
    max: 2,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });
  return sql;
}
