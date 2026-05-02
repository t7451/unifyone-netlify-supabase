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

/**
 * Resolve the database URL with the documented fallback chain. Returns
 * undefined if none of the variables are set.
 */
export function resolveDatabaseUrl(env: DbEnv): string | undefined {
  return env.NEON_DATABASE_URL || env.NETLIFY_DATABASE_URL || env.DATABASE_URL;
}
