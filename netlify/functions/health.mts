/**
 * Netlify Function — minimal health check
 * Bypasses Express entirely to test function runtime
 */
import type { Context } from "@netlify/functions";

export default async (_req: Request, _ctx: Context) => {
  return new Response(JSON.stringify({ 
    status: "ok", 
    version: "2.0.0",
    env: process.env.NODE_ENV,
    jwt_secret_set: Boolean(process.env.JWT_SECRET),
    database_url_set: Boolean(process.env.DATABASE_URL),
    stripe_key_set: Boolean(process.env.STRIPE_SECRET_KEY),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

export const config = {
  path: "/api/health"
};
