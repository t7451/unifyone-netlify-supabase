/**
 * Netlify Functions — Express server wrapper
 * Wraps the UnifyOne Express app with serverless-http so it runs
 * as a Netlify Function. All /api/* traffic is routed here via netlify.toml.
 */
import "dotenv/config";
import express from "express";
import serverless from "serverless-http";

let _handler: ReturnType<typeof serverless> | null = null;

async function buildApp() {
  if (_handler) return _handler;
  
  try {
    const app = express();

    // Dynamic imports to catch module-level crashes
    const { createExpressMiddleware } = await import("@trpc/server/adapters/express");
    const { registerOAuthRoutes } = await import("../../server/_core/oauth");
    const { registerStripeRoutes } = await import("../../server/stripe");
    const { registerPayPalRoutes } = await import("../../server/paypal");
    const { registerSquareRoutes } = await import("../../server/square");
    const { registerBillingRoutes } = await import("../../server/billing");
    const { appRouter } = await import("../../server/routers");
    const { createContext } = await import("../../server/_core/context");

    // Raw-body routes MUST be registered before express.json()
    registerStripeRoutes(app);
    registerBillingRoutes(app);
    registerPayPalRoutes(app);
    registerSquareRoutes(app);

    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));
    registerOAuthRoutes(app);

    app.use(
      "/api/trpc",
      createExpressMiddleware({ router: appRouter, createContext })
    );

    app.get("/api/health", (_req, res) => {
      res.json({ status: "ok", version: "1.9.1", env: process.env.NODE_ENV });
    });

    _handler = serverless(app);
    return _handler;
  } catch (err: any) {
    console.error("[server] App build failed:", err?.message ?? err);
    throw err;
  }
}

export const handler = async (event: any, context: any) => {
  try {
    const h = await buildApp();
    return h(event, context);
  } catch (err: any) {
    console.error("[server] Handler error:", err?.message ?? err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server initialization failed", message: err?.message }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
