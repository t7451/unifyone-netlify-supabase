/**
 * server/creditBilling/routes.ts — Credit Top-Up Billing transport layer.
 *
 * Stripe credit-package checkout, webhook fulfillment, and balance/history
 * APIs. Two parallel transports share the checkout.ts business logic:
 *   - registerBillingRoutes:      Express (Node server)
 *   - registerBillingFetchRoutes: Web Fetch API (Netlify Functions)
 *
 * Routes:
 *   GET  /api/billing/packages
 *   POST /api/billing/checkout
 *   POST /api/billing/webhook   ← register as separate Stripe webhook endpoint
 *   GET  /api/billing/credits
 */
import express, { type Express, type Request, type Response } from "express";
import { errMsg } from "../_core/errors";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME } from "../../shared/const";
import { parse as parseCookieHeader } from "cookie";
import { getStripe } from "../_core/stripeClient";
import { logger } from "../_core/logger";
import { getBillingDb } from "./repo";
import {
  CREDIT_PACKAGES,
  type PackageId,
  findPackage,
  resolveCheckoutBaseUrl,
  createCreditCheckoutSession,
  constructBillingWebhookEvent,
  fulfillCreditCheckout,
  getCreditHistory,
  getCreditBalance,
} from "./checkout";

// Mirror the stripe.ts pattern: fail gracefully when the key is absent.
const stripe = getStripe();

/** Verify the session cookie and return the session's openId, or null. */
async function getSessionOpenId(req: Request): Promise<string | null> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const cookieValue = cookies[COOKIE_NAME];
  const session = await sdk.verifySession(cookieValue);
  return session?.openId ?? null;
}

export function registerBillingRoutes(app: Express) {
  // GET /api/billing/packages
  app.get("/api/billing/packages", (_req: Request, res: Response) => {
    res.json({ packages: CREDIT_PACKAGES });
  });

  // POST /api/billing/checkout
  app.post(
    "/api/billing/checkout",
    express.json(),
    async (req: Request, res: Response) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      if (!getBillingDb()) {
        return res
          .status(503)
          .json({ error: "Billing service not configured" });
      }
      try {
        const { packageId, userEmail, origin } = req.body as {
          packageId: PackageId;
          userEmail?: string;
          origin?: string;
        };
        // Derive the crediting identity from the verified session — never trust
        // a client-supplied userId, which would let a payer credit any account.
        const openId = await getSessionOpenId(req);
        if (!openId) return res.status(401).json({ error: "Unauthorized" });
        const pkg = findPackage(packageId);
        if (!pkg) return res.status(400).json({ error: "Invalid packageId" });

        // Security: Validate origin against allowlist to prevent redirect attacks.
        const baseUrl = resolveCheckoutBaseUrl(origin);

        const session = await createCreditCheckoutSession(stripe, {
          pkg,
          openId,
          userEmail,
          baseUrl,
        });
        return res.json({ url: session.url, sessionId: session.id });
      } catch (err: unknown) {
        logger.error("[Billing] checkout error", { error: errMsg(err) });
        return res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // POST /api/billing/webhook — credit fulfillment (register separately in Stripe Dashboard)
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }
      const sig = req.headers["stripe-signature"] as string;
      let event;
      try {
        event = constructBillingWebhookEvent(stripe, req.body, sig);
      } catch (err: unknown) {
        logger.error("[Billing Webhook] Stripe signature verification failed", {
          error: errMsg(err),
          eventType: "stripe.webhook.sig_fail",
        });
        return res.status(400).json({ error: errMsg(err) });
      }

      if (event.type !== "checkout.session.completed")
        return res.json({ received: true, skipped: true });
      const session = event.data
        .object as import("stripe").Stripe.Checkout.Session;
      if (session.metadata?.purchase_type !== "credits")
        return res.json({ received: true, skipped: "not credits" });

      if (
        session.payment_status !== "paid" ||
        (session.amount_total ?? 0) <= 0
      ) {
        logger.warn("[Billing Webhook] Skipping unpaid/zero-amount session", {
          stripeEventId: event.id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
        });
        return res.json({ received: true, skipped: "unpaid" });
      }

      try {
        const db = getBillingDb();
        if (!db) {
          logger.error("[Billing Webhook] Billing service not configured", {
            stripeEventId: event.id,
          });
          return res
            .status(503)
            .json({ error: "Billing service not configured" });
        }

        const outcome = await fulfillCreditCheckout(db, event, session, {
          recordEventStrict: false,
        });
        if (outcome.kind === "credited")
          return res.json({ received: true, credited: outcome.totalCredits });
        // With recordEventStrict:false the only remaining outcome is duplicate;
        // record_failed is never produced, so behavior matches the original
        // Express handler (which ignored the stripe_events insert error).
        return res.json({ received: true, duplicate: true });
      } catch (err: unknown) {
        // CRITICAL: fulfillment failure on a verified Stripe webhook means
        // we charged the customer but didn't credit them. Sentry's tRPC
        // integration doesn't see this path — log + capture explicitly.
        logger.error("[Billing Webhook] Fulfillment error", {
          error: errMsg(err),
          stripeEventId: event.id,
          stripeSessionId: session.id,
          userId: session.metadata?.user_id,
        });
        return res.status(500).json({ error: "Fulfillment failed" });
      }
    }
  );

  // GET /api/billing/credits — balance or history
  app.get("/api/billing/credits", async (req: Request, res: Response) => {
    const userId = await getSessionOpenId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getBillingDb();
    if (!db) {
      return res.status(503).json({ error: "Billing service not configured" });
    }

    if (req.query.view === "history") {
      const limit = Math.min(
        parseInt((req.query.limit as string) || "50"),
        100
      );
      const { data, error } = await getCreditHistory(db, userId, limit);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ transactions: data });
    }
    const { data, error } = await getCreditBalance(db, userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({
      balance: data?.balance ?? 0,
      lifetime_credits: data?.lifetime_credits ?? 0,
      updated_at: data?.updated_at ?? null,
    });
  });
} // end registerBillingRoutes

/** Verify the session cookie from a Fetch API Request and return the openId. */
async function getSessionOpenIdFromFetch(
  req: globalThis.Request
): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = parseCookieHeader(cookieHeader);
  const session = await sdk.verifySession(cookies[COOKIE_NAME]);
  return session?.openId ?? null;
}

async function safeBillingJson<T>(req: globalThis.Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch-API billing route handler for Netlify Functions.
 * Mirrors registerBillingRoutes but uses the Web Fetch API.
 */
export async function registerBillingFetchRoutes(
  req: globalThis.Request
): Promise<globalThis.Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  // GET /api/billing/packages
  if (path === "/api/billing/packages" && method === "GET") {
    return Response.json({ packages: CREDIT_PACKAGES });
  }

  // POST /api/billing/checkout
  if (path === "/api/billing/checkout" && method === "POST") {
    if (!stripe)
      return Response.json({ error: "Stripe not configured" }, { status: 503 });
    if (!getBillingDb())
      return Response.json(
        { error: "Billing service not configured" },
        { status: 503 }
      );
    try {
      const body = await safeBillingJson<{
        packageId: PackageId;
        userEmail?: string;
        userId?: string;
        origin?: string;
      }>(req);
      if (!body)
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
      const { packageId, userEmail, origin } = body;
      // Derive the crediting identity from the verified session — never trust a
      // client-supplied userId, which would let a payer credit any account.
      const openId = await getSessionOpenIdFromFetch(req);
      if (!openId)
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      const pkg = findPackage(packageId);
      if (!pkg)
        return Response.json({ error: "Invalid packageId" }, { status: 400 });

      const baseUrl = resolveCheckoutBaseUrl(origin);

      const session = await createCreditCheckoutSession(stripe, {
        pkg,
        openId,
        userEmail,
        baseUrl,
      });
      return Response.json({ url: session.url, sessionId: session.id });
    } catch (err: unknown) {
      logger.error("[Billing] checkout error", { error: errMsg(err) });
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // POST /api/billing/webhook — Stripe credit fulfillment
  if (path === "/api/billing/webhook" && method === "POST") {
    if (!stripe)
      return Response.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      );
    const sig = req.headers.get("stripe-signature") ?? "";
    const rawBody = await req.text();
    let event;
    try {
      event = constructBillingWebhookEvent(stripe, rawBody, sig);
    } catch (err: unknown) {
      logger.error("[Billing Webhook] Stripe signature verification failed", {
        error: errMsg(err),
      });
      return Response.json({ error: errMsg(err) }, { status: 400 });
    }

    if (event.type !== "checkout.session.completed")
      return Response.json({ received: true, skipped: true });
    const session = event.data
      .object as import("stripe").Stripe.Checkout.Session;
    if (session.metadata?.purchase_type !== "credits")
      return Response.json({ received: true, skipped: "not credits" });

    try {
      const db = getBillingDb();
      if (!db) {
        logger.error("[Billing Webhook] Billing service not configured", {
          stripeEventId: event.id,
        });
        return Response.json(
          { error: "Billing service not configured" },
          { status: 503 }
        );
      }

      // Only fulfill genuinely-paid sessions. Guards against a 100%-off
      // promotion code (amount_total === 0) granting full credits for free.
      // Partial discounts (amount_total > 0) still fulfill normally.
      if (
        session.payment_status !== "paid" ||
        (session.amount_total ?? 0) <= 0
      ) {
        logger.warn("[Billing Webhook] Skipping unpaid/zero-amount session", {
          stripeEventId: event.id,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
        });
        return Response.json({ received: true, skipped: "unpaid" });
      }

      const outcome = await fulfillCreditCheckout(db, event, session, {
        recordEventStrict: true,
      });
      if (outcome.kind === "duplicate")
        return Response.json({ received: true, duplicate: true });
      if (outcome.kind === "record_failed")
        return Response.json(
          { error: "Failed to record event" },
          { status: 500 }
        );
      return Response.json({ received: true, credited: outcome.totalCredits });
    } catch (err: unknown) {
      logger.error("[Billing Webhook] Fulfillment error", {
        error: errMsg(err),
        stripeEventId: event.id,
        stripeSessionId: session?.id,
        userId: session?.metadata?.user_id,
      });
      return Response.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  }

  // GET /api/billing/credits
  if (path === "/api/billing/credits" && method === "GET") {
    const userId = await getSessionOpenIdFromFetch(req);
    if (!userId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const db = getBillingDb();
    if (!db)
      return Response.json(
        { error: "Billing service not configured" },
        { status: 503 }
      );

    if (url.searchParams.get("view") === "history") {
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "50"),
        100
      );
      const { data, error } = await getCreditHistory(db, userId, limit);
      if (error)
        return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ transactions: data ?? [] });
    }

    const { data, error } = await getCreditBalance(db, userId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({
      balance: data?.balance ?? 0,
      lifetime_credits: data?.lifetime_credits ?? 0,
      updated_at: data?.updated_at ?? null,
    });
  }

  return null;
}
