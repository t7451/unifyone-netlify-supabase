/**
 * Netlify Functions — UnifyOne API server
 *
 * Uses tRPC fetchRequestHandler (no Express adapter, no serverless-http,
 * no path-to-regexp dependency) to eliminate the "pathRegexp is not a
 * function" crash on Netlify Functions with tRPC v11.
 *
 * Non-tRPC routes (Stripe, PayPal, Square, billing webhooks, OAuth) are
 * handled by a lightweight inline router BEFORE tRPC so raw-body parsing
 * is preserved for webhook signature verification.
 */
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

// ── Lazy singletons — avoid re-importing on every warm invocation ───────────
let _routerModule: any = null;
let _nonTrpcHandler: ((req: Request) => Promise<Response | null>) | null = null;

async function getRouter() {
  if (_routerModule) return _routerModule;
  const [{ appRouter }, { createFetchContext }] = await Promise.all([
    import("../../server/routers"),
    import("../../server/_core/fetchContext"),
  ]);
  _routerModule = { appRouter, createFetchContext };
  return _routerModule;
}

async function getNonTrpcHandler() {
  if (_nonTrpcHandler) return _nonTrpcHandler;
  const { buildNonTrpcHandler } = await import("../../server/_core/nonTrpcRoutes");
  _nonTrpcHandler = await buildNonTrpcHandler();
  return _nonTrpcHandler;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // Health check — no auth required
  if (url.pathname === "/api/health" || url.pathname.endsWith("/api/health")) {
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || "";
    return Response.json({
      status: "ok",
      version: "2.1.0",
      jwt_secret_set: jwtSecret.length > 0,
      database_url_set: !!(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL),
      stripe_key_set: !!process.env.STRIPE_SECRET_KEY,
      ts: new Date().toISOString(),
    });
  }

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, stripe-signature",
      },
    });
  }

  try {
    // Non-tRPC routes first (webhooks need raw body before any JSON parsing)
    const nonTrpc = await getNonTrpcHandler();
    const nonTrpcResponse = await nonTrpc(req.clone());
    if (nonTrpcResponse) return nonTrpcResponse;

    // tRPC — handles /api/trpc/*
    const { appRouter, createFetchContext } = await getRouter();
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: createFetchContext,
      onError: ({ error, path }) => {
        console.error(`[tRPC] ${path ?? "unknown"}: ${error.message}`);
      },
    });
  } catch (err: any) {
    console.error("[server] Unhandled error:", err?.message ?? err);
    return Response.json(
      { error: "Internal server error", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/*",
};
