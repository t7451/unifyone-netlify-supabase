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
import { registerSquareRoutes } from "../square";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerDockerRoutes, registerGracefulShutdown } from "./docker";
import { ENV } from "./env";
import { logger, requestLogger } from "./logger";
import { securityHeaders } from "./securityHeaders";
import { Sentry } from "./sentry";

/** Validate critical environment variables before the server accepts traffic. */
function validateEnv() {
  if (!ENV.cookieSecret || ENV.cookieSecret.length < 32) {
    throw new Error(
      "[startup] JWT_SECRET (or SUPABASE_JWT_SECRET) must be set and at least 32 characters long. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  if (!ENV.databaseUrl) {
    console.warn(
      "[startup] DATABASE_URL is not set — database features will be unavailable."
    );
  }

  // Production-only validation: warn about missing payment/OAuth keys
  if (ENV.isProduction) {
    const warnings: string[] = [];

    if (!process.env.STRIPE_SECRET_KEY) {
      warnings.push("STRIPE_SECRET_KEY is not set — Stripe payments will be unavailable");
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      warnings.push("STRIPE_WEBHOOK_SECRET is not set — Stripe webhooks will fail verification");
    }
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      warnings.push("PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET not set — PayPal payments unavailable");
    }
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      warnings.push("SHOPIFY_API_KEY/SHOPIFY_API_SECRET not set — Shopify integration unavailable");
    }

    // OAuth validation (if these are set in env.ts, check them)
    const oauthVars = [
      'OAUTH_CLIENT_ID',
      'OAUTH_CLIENT_SECRET', 
      'OAUTH_AUTHORIZE_URL',
      'OAUTH_TOKEN_URL',
      'OAUTH_USERINFO_URL'
    ];
    const missingOAuth = oauthVars.filter(v => !process.env[v]);
    if (missingOAuth.length > 0) {
      warnings.push(`OAuth not configured (missing: ${missingOAuth.join(', ')}) — custom OAuth login unavailable`);
    }

    if (warnings.length > 0) {
      logger.warn("[startup] Production environment warnings:", { warnings });
    }
  }
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
  // Docker health/readiness/metrics routes (no auth, no body parsing needed)
  registerDockerRoutes(app);
  // Register Stripe webhook BEFORE json middleware (requires raw body for signature verification)
  registerStripeRoutes(app);
  // Register PayPal REST API routes
  registerPayPalRoutes(app);
  // Register Shopify OAuth + webhook routes (webhook needs raw body BEFORE json middleware)
  registerShopifyRoutes(app);
  // Register Square payment + webhook routes (webhook needs raw body for signature verification)
  registerSquareRoutes(app);
  // Configure body parser with size limit (4MB for API calls; use presigned S3 URLs for large uploads)
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ limit: "4mb", extended: true }));
  // Structured request/response logging (attaches X-Request-Id header)
  app.use(requestLogger);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        logger.error(`[tRPC] ${path ?? "unknown"}: ${error.message}`);
        if (error.code === "INTERNAL_SERVER_ERROR") {
          Sentry.captureException(error);
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
  });

  // Graceful shutdown for Docker stop / SIGTERM
  registerGracefulShutdown(server);
}

startServer().catch(err => {
  logger.error("Fatal startup error", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
