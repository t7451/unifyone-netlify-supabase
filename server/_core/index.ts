import "dotenv/config";
import "./sentry"; // Initialize Sentry before anything else
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStripeRoutes } from "../stripe";
import { registerPayPalRoutes } from "../paypal";
import { registerShopifyRoutes } from "../shopify";
import { registerMastodonRoutes } from "../mastodonOAuth";
import { registerSquareRoutes } from "../square";
import { registerN8nWebhookRoutes } from "../n8nWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerDockerRoutes, registerGracefulShutdown } from "./docker";
import { ENV } from "./env";
import { logger, requestLogger } from "./logger";
import { securityHeaders } from "./securityHeaders";
import { csrfProtection } from "./csrf";
import { Sentry } from "./sentry";
import { registerCustomAuthExpressRoutes } from "./customAuthRoutes";
import { registerCliWebSocket } from "./cliWebSocket";
import { resolveDatabaseUrl } from "../lib/databaseUrl";
import { getNgrokUrl, startNgrokTunnel } from "./ngrok";
import { registerResourceDownloadRoutes } from "../resourceDownloads";
import { registerClipsToolkitRoutes } from "../clipsToolkit";
import { registerSseClient } from "./sseManager";
import { sdk } from "./sdk";

/** Validate critical environment variables before the server accepts traffic. */
function validateEnv() {
  if (!ENV.cookieSecret || ENV.cookieSecret.length < 32) {
    throw new Error(
      "[startup] JWT_SECRET must be set and at least 32 characters long. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  if (!resolveDatabaseUrl()) {
    console.warn(
      "[startup] DATABASE_URL / NETLIFY_DATABASE_URL is not set — database features will be unavailable."
    );
  }

  if (ENV.isProduction) {
    // Fail-fast on missing critical secrets in production. A web process
    // running with no Stripe/PayPal/JWT credentials is a misconfigured
    // deployment, not a degraded one — refuse to start so the orchestrator
    // surfaces the rollout failure.
    const required: string[] = [];

    // Payments — webhook secrets are non-optional; without them, signature
    // verification can't happen and the handlers are unsafe.
    if (!process.env.STRIPE_SECRET_KEY) required.push("STRIPE_SECRET_KEY");
    if (!process.env.STRIPE_WEBHOOK_SECRET)
      required.push("STRIPE_WEBHOOK_SECRET");
    if (!process.env.PAYPAL_CLIENT_ID) required.push("PAYPAL_CLIENT_ID");
    if (!process.env.PAYPAL_CLIENT_SECRET)
      required.push("PAYPAL_CLIENT_SECRET");
    // PAYPAL_WEBHOOK_ID is required for webhook signature verification —
    // without it, verifyPayPalWebhookSignature fails closed and rejects all
    // webhook deliveries (correct behavior, but a misconfiguration in prod).
    if (!process.env.PAYPAL_WEBHOOK_ID) required.push("PAYPAL_WEBHOOK_ID");

    // Public URL is used for OAuth redirects, email links, and webhook
    // callback URLs — silently defaulting it leaks redirects to staging.
    if (!process.env.PUBLIC_APP_URL) required.push("PUBLIC_APP_URL");

    // Cookie domain must be explicit in production, otherwise the cookie
    // auto-scopes to the request host and leaks across deploy previews.
    if (!process.env.COOKIE_DOMAIN) required.push("COOKIE_DOMAIN");

    // Email delivery. Without RESEND_API_KEY, signUp() auto-marks new
    // accounts emailVerified=true (see customAuth.ts) — i.e. email
    // verification is silently disabled, which is a security regression in
    // production, not a degraded optional feature.
    if (!process.env.RESEND_API_KEY) required.push("RESEND_API_KEY");

    if (required.length > 0) {
      throw new Error(
        `[startup] Production environment is missing required vars: ${required.join(", ")}.`
      );
    }

    // Recommended-but-not-blocking. Log loudly so ops sees them but don't
    // refuse to boot — these gate optional features (Shopify integration,
    // OAuth login providers) and the Supabase credit-metering/billing layer
    // (see docs/DATABASE_ARCHITECTURE.md — without it, credit metering and
    // Stripe overage billing become no-ops).
    const recommended: string[] = [];
    if (!process.env.SHOPIFY_API_KEY) recommended.push("SHOPIFY_API_KEY");
    if (!process.env.SHOPIFY_API_SECRET) recommended.push("SHOPIFY_API_SECRET");
    if (!process.env.SUPABASE_URL) recommended.push("SUPABASE_URL");
    if (
      !process.env.SUPABASE_SECRET_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    )
      recommended.push("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
    if (!process.env.GOOGLE_OAUTH_CLIENT_ID)
      recommended.push("GOOGLE_OAUTH_CLIENT_ID");
    if (!process.env.GOOGLE_OAUTH_CLIENT_SECRET)
      recommended.push("GOOGLE_OAUTH_CLIENT_SECRET");
    if (!process.env.AUTH0_DOMAIN && !process.env.VITE_AUTH0_DOMAIN) {
      recommended.push("AUTH0_DOMAIN or VITE_AUTH0_DOMAIN");
    }
    if (!process.env.AUTH0_CLIENT_ID && !process.env.VITE_AUTH0_CLIENT_ID) {
      recommended.push("AUTH0_CLIENT_ID or VITE_AUTH0_CLIENT_ID");
    }

    if (recommended.length > 0) {
      logger.warn(
        `[startup] Production environment is missing optional vars: ${recommended.join(", ")}. ` +
          "Dependent features will be unavailable."
      );
    }

    // Serverless deployments need a distributed rate-limit store. The
    // in-memory fallback resets every cold start, so brute-force protection
    // on auth routes is effectively absent on Netlify Functions.
    if (
      process.env.NETLIFY === "true" &&
      (!process.env.UPSTASH_REDIS_REST_URL ||
        !process.env.UPSTASH_REDIS_REST_TOKEN)
    ) {
      throw new Error(
        "[startup] On Netlify, UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required " +
          "for cross-invocation rate limiting (auth brute-force protection)."
      );
    }
  }
}

/**
 * Build a strict CORS handler keyed on an explicit origin allow-list.
 *
 * Allow-list is sourced from CORS_ALLOWED_ORIGINS (comma-separated) and
 * augmented with PUBLIC_APP_URL. In development, localhost origins on common
 * ports are also accepted. Requests with no Origin header (server-to-server,
 * curl, same-origin browser navigations) pass through untouched.
 *
 * Credentials are allowed because the app uses cookie-based auth — which
 * means a wildcard origin is forbidden by the spec, hence the explicit list.
 */
function corsMiddleware(): express.RequestHandler {
  const fromEnv = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const appUrl = (process.env.PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const allowList = new Set<string>(fromEnv);
  if (appUrl) allowList.add(appUrl);
  if (!ENV.isProduction) {
    allowList.add("http://localhost:3000");
    allowList.add("http://localhost:5173");
    allowList.add("http://127.0.0.1:3000");
    allowList.add("http://127.0.0.1:5173");
  }

  return (req, res, next) => {
    const origin = req.headers.origin;
    // Allow the active ngrok tunnel as a CORS origin in dev. Resolved lazily
    // because the tunnel URL isn't known at middleware-construction time.
    const ngrokUrl = !ENV.isProduction ? getNgrokUrl() : null;
    if (ngrokUrl) allowList.add(ngrokUrl);
    if (typeof origin === "string" && allowList.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        req.headers["access-control-request-headers"]?.toString() ??
          "content-type, authorization, x-csrf-token, x-request-id"
      );
      res.setHeader("Access-Control-Max-Age", "600");
    } else if (typeof origin === "string") {
      // Origin present but not allow-listed → reject preflights, drop
      // credentials on actual requests. Don't echo arbitrary origins.
      if (req.method === "OPTIONS") {
        res.status(403).end();
        return;
      }
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateEnv();
  const app = express();
  const server = createServer(app);
  // Security headers on every response (before all route handlers)
  app.use(securityHeaders);
  // Strict CORS allow-list — must run before any route handler so preflights
  // short-circuit before tRPC / webhook handlers see them.
  app.use(corsMiddleware());
  // Docker health/readiness/metrics routes (no auth, no body parsing needed)
  registerDockerRoutes(app);
  // Dev-only: surface the active ngrok tunnel URL so the client (and Kai)
  // can display/copy it. Disabled in production to avoid leaking infra info.
  if (!ENV.isProduction) {
    app.get("/api/dev/ngrok", (_req, res) => {
      res.json({
        url: getNgrokUrl(),
        enabled: process.env.NGROK_ENABLED === "true",
      });
    });
  }
  // Register Stripe webhook BEFORE json middleware (requires raw body for signature verification)
  registerStripeRoutes(app);
  // Register PayPal REST API routes
  registerPayPalRoutes(app);
  // Register Shopify OAuth + webhook routes (webhook needs raw body BEFORE json middleware)
  registerShopifyRoutes(app);
  // Register Mastodon per-instance OAuth connect routes
  registerMastodonRoutes(app);
  // Register Square payment + webhook routes (webhook needs raw body for signature verification)
  registerSquareRoutes(app);
  // Register n8n inbound webhook (HMAC-verified) BEFORE json middleware
  registerN8nWebhookRoutes(app);

  // ── Per-route body size limits ─────────────────────────────────────────────
  // Auth endpoints get a tighter limit (64 KB) — they only accept JSON
  // credentials and tokens, never file bytes. This reduces the surface area
  // for DoS via oversized request bodies on login/signup/reset paths.
  //
  // ORDERING: these middleware registrations must come AFTER webhook routes
  // (which use raw body parsing and are registered above) and BEFORE the
  // default 4 MB json() registration below — Express matches middleware in
  // registration order so the first matching body parser wins.
  app.use("/api/auth", express.json({ limit: "64kb" }));
  app.use("/api/auth", express.urlencoded({ limit: "64kb", extended: false }));

  // Default limit for all other routes: 4 MB — sufficient for JSON API payloads.
  // File uploads must use presigned S3 URLs (storagePut) and never pass file
  // bytes through this server.
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ limit: "4mb", extended: true }));
  // Structured request/response logging (attaches X-Request-Id header)
  app.use(requestLogger);
  // CSRF protection on cookie-authenticated mutations. Mounted AFTER webhook
  // routes (which respond without calling next) so signed third-party
  // webhooks bypass it; webhook paths are also explicitly exempted as a
  // belt-and-suspenders measure.
  app.use(csrfProtection());
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  registerCustomAuthExpressRoutes(app);
  registerResourceDownloadRoutes(app);
  registerClipsToolkitRoutes(app);

  // SSE event stream — authenticated users connect here for real-time push.
  // Each connection is kept alive by a 30s heartbeat in sseManager.ts.
  // Netlify Functions can't hold open connections, so this endpoint only
  // works in the Express (local dev / Docker) deployment. The client
  // EventSource auto-reconnects; if the server is Netlify it will fail fast
  // and the UI falls back to tRPC polling naturally.
  app.get("/api/events", async (req, res) => {
    // Verify the session cookie without going through tRPC context
    const { parse: parseCookieHeader } = await import("cookie");
    const { COOKIE_NAME } = await import("../../shared/const");
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const session = await sdk.verifySession(cookies[COOKIE_NAME]);
    if (!session) {
      res.status(401).end();
      return;
    }
    // Look up numeric userId from openId
    const { getDb } = await import("../db");
    const { users } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) {
      res.status(503).end();
      return;
    }
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.openId, session.openId))
      .limit(1);
    if (!user) {
      res.status(401).end();
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
    res.flushHeaders();

    // Send initial connected event
    res.write(`event: connected\ndata: {"userId":${user.id}}\n\n`);

    const cleanup = registerSseClient(user.id, session.openId, res);
    req.on("close", cleanup);
    req.on("error", cleanup);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path, ctx }) => {
        logger.error(`[tRPC] ${path ?? "unknown"}: ${error.message}`);
        if (error.code === "INTERNAL_SERVER_ERROR") {
          Sentry.withScope(scope => {
            // Enrich with request-level context so errors are grouped
            // by tenant and user in the Sentry dashboard.
            if (ctx?.user) {
              scope.setUser({
                id: String(ctx.user.id),
                email: ctx.user.email ?? undefined,
              });
              scope.setTag("tenantId", String(ctx.user.tenantId ?? "none"));
              scope.setTag("userRole", ctx.user.role);
            }
            scope.setTag("trpc.path", path ?? "unknown");
            Sentry.captureException(error);
          });
        }
      },
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn("Preferred port busy, using alternate", {
      preferred: preferredPort,
      actual: port,
    });
  }

  server.listen(port, () => {
    logger.info("Server started", {
      port,
      env: process.env.NODE_ENV ?? "development",
      url: `http://localhost:${port}/`,
    });
    // Start the ngrok tunnel after the HTTP server is listening so the
    // forwarded address is immediately reachable. Failure is non-fatal —
    // the local server keeps running without a public URL.
    void startNgrokTunnel(port);
  });

  // Register WebSocket PTY relay for the in-website CLI (/api/cli/pty)
  registerCliWebSocket(server);

  // Graceful shutdown for Docker stop / SIGTERM
  registerGracefulShutdown(server);
}

startServer().catch(err => {
  logger.error("Fatal startup error", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
