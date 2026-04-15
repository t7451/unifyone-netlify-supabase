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

  if (ENV.isProduction) {
    const missing: string[] = [];

    if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
    if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
    if (!process.env.PAYPAL_CLIENT_ID) missing.push("PAYPAL_CLIENT_ID");
    if (!process.env.PAYPAL_CLIENT_SECRET) missing.push("PAYPAL_CLIENT_SECRET");
    if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL)
      missing.push("SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
      missing.push("SUPABASE_SERVICE_ROLE_KEY");

    if (missing.length > 0) {
      console.warn(
        `[startup] Production environment is missing recommended vars: ${missing.join(", ")}. ` +
          "Some features may be unavailable."
      );
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
  // 4 MB body limit — sufficient for JSON API payloads. File uploads should
  // use presigned S3 URLs (storagePut) and never pass file bytes through this server.
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
