/**
 * Netlify Function — minimal health check
 * Bypasses Express entirely to test function runtime
 */
import type { Context } from "@netlify/functions";

export default async (_req: Request, _ctx: Context) => {
  const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || "";
  return new Response(JSON.stringify({ 
    status: "ok", 
    version: "2.2.0",
    env: process.env.NODE_ENV,
    jwt_secret_set: jwtSecret.length > 0,
    database_url_set: Boolean(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL),
    stripe_key_set: Boolean(process.env.STRIPE_SECRET_KEY),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const config = {
  path: "/api/health"
};
