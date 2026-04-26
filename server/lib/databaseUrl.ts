/**
 * Resolve the Postgres connection string from any of the supported env vars,
 * in priority order:
 *   1. DATABASE_URL                  — explicit override (preferred)
 *   2. NETLIFY_DATABASE_URL          — pooled, auto-injected by Netlify Postgres add-on
 *   3. NETLIFY_DATABASE_URL_UNPOOLED — direct connection (also auto-injected)
 *
 * Centralised so every entry point (auth, app router, scripts) reads the same
 * fallback chain. Avoids the "signin works, but auth.me 500s because db.ts
 * forgot to fall back" mismatch that locks users out post-login.
 */
export function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    undefined
  );
}
