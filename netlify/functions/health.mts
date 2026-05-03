/**
 * Netlify Function — /api/health (v2)
 *
 * Real liveness probe. Pings DB / Stripe / Resend / Upstash Redis in parallel,
 * each with a 3s timeout, and rolls them up to an overall status.
 *
 * Backwards-compat: still includes the v1 boolean fields (`jwt_secret_set`,
 * `database_url_set`, `stripe_key_set`) so any external monitor that was
 * grepping the old shape doesn't break.
 *
 *   200 + status:"ok"        — everything healthy or unconfigured
 *   200 + status:"degraded"  — non-DB dep is down (Stripe/Resend/Redis)
 *   503 + status:"down"      — DB is down (page on this!)
 *
 * Cache-Control: no-store (uptime monitors must always see live state).
 */
import type { Context } from "@netlify/functions";
import { runAllChecks, rollupStatus } from "../../server/_core/healthChecks";

// Module-load timestamp — used to report how long this function instance has
// been alive (helps spot crash-loops / cold-start patterns when comparing
// across requests).
const MODULE_BOOTED_AT = Date.now();

export default async (_req: Request, _ctx: Context) => {
  const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || "";
  const checks = await runAllChecks({ timeoutMs: 3000 });
  const { overall, httpStatus } = rollupStatus(checks);

  const body = {
    status: overall,
    version: "2.2.0",
    env: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - MODULE_BOOTED_AT,
    checks,
    // ── v1 backwards-compat fields ──────────────────────────────────────────
    jwt_secret_set: jwtSecret.length > 0,
    database_url_set: Boolean(
      process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL
    ),
    stripe_key_set: Boolean(process.env.STRIPE_SECRET_KEY),
  };

  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};

export const config = {
  path: "/api/health",
};
