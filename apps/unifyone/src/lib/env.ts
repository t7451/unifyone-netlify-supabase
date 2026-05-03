/**
 * Environment-variable helpers for the marketing site.
 *
 * The site can be configured with either a manual `NEON_DATABASE_URL`
 * or via the Netlify Neon extension (which sets `NETLIFY_DATABASE_URL`).
 * `DATABASE_URL` is also accepted as a last-resort fallback.
 */

type DbEnv = {
  NEON_DATABASE_URL?: string;
  NETLIFY_DATABASE_URL?: string;
  DATABASE_URL?: string;
};

function pick(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Resolve the database URL with the documented fallback chain. Whitespace-
 * only values are treated as missing (so a blank Netlify env var doesn't
 * silently defer the failure to the DB driver).
 */
export function resolveDatabaseUrl(env: DbEnv): string | undefined {
  return (
    pick(env.NEON_DATABASE_URL) ||
    pick(env.NETLIFY_DATABASE_URL) ||
    pick(env.DATABASE_URL)
  );
}
