import type { APIRoute } from "astro";
import { resolveDatabaseUrl } from "../../lib/env";

// On-demand rendering — this endpoint reports live env state, so it must
// not be pre-rendered to disk at build time.
export const prerender = false;

/**
 * GET /api/health → 200 JSON with build + env presence flags.
 *
 * Used as a Netlify smoke check after deploy. Reports presence (boolean)
 * not values, so it's safe to expose. The `db` flag accepts the Netlify
 * Neon extension (NETLIFY_DATABASE_URL) as well as the legacy variable
 * names — see resolveDatabaseUrl().
 */
export const GET: APIRoute = () => {
  const env = import.meta.env;
  const body = {
    status: "ok",
    site: env.PUBLIC_SITE_URL ?? null,
    db: Boolean(resolveDatabaseUrl(env)),
    waitlist: Boolean(env.WAITLIST_N8N_WEBHOOK_URL),
    builtAt: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
