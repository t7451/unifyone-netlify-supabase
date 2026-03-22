/**
 * Netlify Functions — Express server wrapper
 * Wraps the UnifyOne Express app with serverless-http so it runs
 * as a Netlify Function. All /api/* traffic is routed here via netlify.toml.
 */
import "dotenv/config";
import express from "express";
import serverless from "serverless-http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../../server/_core/oauth";
import { registerStripeRoutes } from "../../server/stripe";
import { registerPayPalRoutes } from "../../server/paypal";
import { registerSquareRoutes } from "../../server/square";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

const app = express();

// Stripe webhook MUST be before json middleware (needs raw body for sig verification)
registerStripeRoutes(app);

// PayPal REST routes
registerPayPalRoutes(app);

// Square payment routes (webhook needs raw body — register before json middleware)
registerSquareRoutes(app);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// OAuth callback
registerOAuthRoutes(app);

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "1.9.0", env: process.env.NODE_ENV });
});

export const handler = serverless(app);
