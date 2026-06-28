/**
 * server/payments/square/webhooks.ts
 *
 * Transport layer for the Square integration: HMAC-SHA256 signature
 * verification, notification-URL derivation, and the Express + Fetch route
 * adapters (create-checkout, capture-payment, payment lookup, webhook,
 * admin/discover). Relocated verbatim from server/square.ts (no behavior
 * change). Webhook verification and side-effect order are preserved.
 *
 * Express routes (registerSquareRoutes) are kept for local Express runs;
 * Netlify production runs the Fetch handler (registerSquareFetchRoutes)
 * which is mounted from server/_core/nonTrpcRoutes.ts.
 *
 * Endpoints (Fetch + Express, both shapes):
 *   POST /api/square/create-checkout    JWT-authed; creates a hosted payment link
 *   POST /api/square/capture-payment    JWT-authed; idempotent state sync
 *   GET  /api/square/payment/:paymentId Fetches payment status
 *   POST /api/square/webhook            HMAC-SHA256 signature verification
 *   POST /api/square/admin/discover     x-admin-key gated read-only snapshot
 *
 * Webhook signature: Square HMAC-SHA256 over (notification_url + raw body).
 * The notification URL we sign against must be the URL Square POSTs to. We
 * derive it from SQUARE_WEBHOOK_NOTIFICATION_URL (preferred) or fall back to
 * `https://${host}/api/square/webhook` from the request — but operators
 * MUST set the env var to defend against host-header injection.
 */
import express, {
  type Express,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import crypto from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "../../_core/logger";
import { errMsg } from "../../_core/errors";
import { getDb, getOrderById } from "../../db";
import { orders, squareWebhookEvents } from "../../../drizzle/schema";
import { getSquareClient, squareConfigured } from "./client";
import {
  authedUserFromRequest,
  recordSquareWebhookEvent,
  type SquareWebhookEvent,
} from "./repo";
import { applySquareEvent, createSquareCheckout } from "./sync";

// ─── Square HMAC verification ──────────────────────────────────────────────
export function expectedSquareSignature(
  notificationUrl: string,
  rawBody: string,
  signatureKey: string
): string {
  return crypto
    .createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody)
    .digest("base64");
}

export function verifySquareSignature(input: {
  notificationUrl: string;
  rawBody: string;
  signatureHeader: string;
  signatureKey: string;
}): boolean {
  if (!input.signatureKey || !input.signatureHeader) return false;
  const expected = expectedSquareSignature(
    input.notificationUrl,
    input.rawBody,
    input.signatureKey
  );
  // Constant-time compare to avoid timing side channels.
  const a = Buffer.from(expected);
  const b = Buffer.from(input.signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ─── Compute the URL Square signed against ─────────────────────────────────
function getSquareNotificationUrl(
  req: ExpressRequest | { headers: Headers; url: string }
): string {
  const explicit = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  if (explicit) return explicit;
  // Best-effort fallback — operators SHOULD set the env var to prevent
  // host-header injection from forging signatures.
  if ("headers" in req && req.headers instanceof Headers) {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}/api/square/webhook`;
  }
  const eReq = req as ExpressRequest;
  const headers = eReq.headers as Record<string, string | string[] | undefined>;
  const fwd = headers["x-forwarded-host"];
  const hst = headers["host"];
  const host =
    (Array.isArray(fwd) ? fwd[0] : fwd) ||
    (Array.isArray(hst) ? hst[0] : hst) ||
    "";
  return `https://${host}/api/square/webhook`;
}

// ─── Express adapter (kept for local Express runs) ─────────────────────────
export function registerSquareRoutes(app: Express) {
  app.post(
    "/api/square/create-checkout",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
      if (!squareConfigured()) {
        return res.status(503).json({ error: "Square not configured" });
      }
      try {
        const {
          amount,
          currency = "USD",
          description,
          orderId,
          origin,
        } = req.body;
        if (!amount || isNaN(parseFloat(amount))) {
          return res.status(400).json({ error: "amount is required" });
        }
        const authed = await authedUserFromRequest({
          headers: req.headers as Record<string, string | string[] | undefined>,
        });
        const baseUrl = origin || "https://1commerce.online";
        const result = await createSquareCheckout({
          amount: parseFloat(amount),
          currency,
          description: description || "UnifyOne Order",
          internalOrderId: orderId ?? null,
          tenantId: authed?.tenantId ?? null,
          userId: authed?.userId ?? null,
          imClickId: null,
          redirectUrl: `${baseUrl}/dashboard?square=success`,
        });
        res.json({
          checkoutUrl: result.checkoutUrl,
          squareOrderId: result.squareOrderId,
        });
      } catch (err: unknown) {
        logger.error("[Square] Create checkout error", { error: errMsg(err) });
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  app.post(
    "/api/square/capture-payment",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
      if (!squareConfigured()) {
        return res.status(503).json({ error: "Square not configured" });
      }
      const client = getSquareClient();
      if (!client) {
        return res.status(503).json({ error: "Square not configured" });
      }
      try {
        const { squarePaymentId, internalOrderId } = req.body;
        if (!squarePaymentId)
          return res.status(400).json({ error: "squarePaymentId is required" });
        const response = await client.payments.get({
          paymentId: squarePaymentId,
        });
        const payment = response.payment;
        if (!payment) throw new Error("Payment not found");

        if (internalOrderId) {
          const id = parseInt(String(internalOrderId), 10);
          if (Number.isFinite(id)) {
            const db = await getDb();
            if (db) {
              const [orderRow] = await db
                .select({ tenantId: orders.tenantId })
                .from(orders)
                .where(eq(orders.id, id))
                .limit(1);
              if (orderRow) {
                const validated = await getOrderById(id, orderRow.tenantId);
                if (validated) {
                  await db
                    .update(orders)
                    .set({
                      paymentStatus:
                        payment.status === "COMPLETED" ? "paid" : "pending",
                      paymentMethod: "square",
                      squarePaymentId: payment.id ?? null,
                      squareOrderId: payment.orderId ?? null,
                    })
                    .where(
                      and(
                        eq(orders.id, id),
                        eq(orders.tenantId, orderRow.tenantId)
                      )
                    );
                }
              }
            }
          }
        }

        const amountMoney = payment.amountMoney;
        res.json({
          status: payment.status,
          squarePaymentId: payment.id,
          amount: amountMoney
            ? (Number(amountMoney.amount) / 100).toFixed(2)
            : "0.00",
          currency: amountMoney?.currency ?? "USD",
        });
      } catch (err: unknown) {
        logger.error("[Square] Capture payment error", { error: errMsg(err) });
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  app.get(
    "/api/square/payment/:paymentId",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const client = getSquareClient();
      if (!client) {
        return res.status(503).json({ error: "Square not configured" });
      }
      try {
        const response = await client.payments.get({
          paymentId: req.params.paymentId,
        });
        res.json(response.payment);
      } catch (err: unknown) {
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  app.post(
    "/api/square/webhook",
    express.raw({ type: "application/json" }),
    async (req: ExpressRequest, res: ExpressResponse) => {
      if (!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
        logger.error(
          "[Square Webhook] SQUARE_WEBHOOK_SIGNATURE_KEY not configured; rejecting"
        );
        return res.status(503).json({ error: "Webhook not configured" });
      }

      const sig =
        (req.headers["x-square-hmacsha256-signature"] as string) || "";
      const notificationUrl = getSquareNotificationUrl(req);
      const rawBody =
        req.body instanceof Buffer
          ? req.body.toString("utf8")
          : typeof req.body === "string"
            ? req.body
            : JSON.stringify(req.body);

      if (
        !verifySquareSignature({
          notificationUrl,
          rawBody,
          signatureHeader: sig,
          signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
        })
      ) {
        logger.error("[Square Webhook] Signature verification FAILED", {
          notificationUrl,
        });
        return res.status(400).json({ error: "Invalid signature" });
      }

      let event: SquareWebhookEvent;
      try {
        event = JSON.parse(rawBody) as SquareWebhookEvent;
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }

      await recordSquareWebhookEvent(event, "received");
      // Dedup: skip events we already successfully processed.
      if (event.event_id) {
        const dedupDb = await getDb();
        if (dedupDb) {
          const existing = await dedupDb
            .select({ status: squareWebhookEvents.status })
            .from(squareWebhookEvents)
            .where(eq(squareWebhookEvents.eventId, event.event_id))
            .limit(1);
          if (existing[0]?.status === "processed") {
            return res.json({ received: true, duplicate: true });
          }
        }
      }
      try {
        await applySquareEvent(event);
        await recordSquareWebhookEvent(event, "processed");
      } catch (err: unknown) {
        await recordSquareWebhookEvent(event, "failed", errMsg(err));
        logger.error("[Square Webhook] Apply event failed", {
          error: errMsg(err),
          eventType: event.type,
        });
      }
      res.json({ received: true });
    }
  );
}

// ─── Fetch handler (Netlify production path) ───────────────────────────────
async function safeJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

function readImClickCookie(req: Request): string | null {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === "im_ref") {
      try {
        return decodeURIComponent(rest.join("=")) || null;
      } catch {
        return rest.join("=") || null;
      }
    }
  }
  return null;
}

async function handleSquareWebhook(req: Request): Promise<Response> {
  if (!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
    logger.error(
      "[Square Webhook] SQUARE_WEBHOOK_SIGNATURE_KEY not configured"
    );
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }
  const sig = req.headers.get("x-square-hmacsha256-signature") || "";
  const rawBody = await req.text();
  const notificationUrl = getSquareNotificationUrl(req);
  if (
    !verifySquareSignature({
      notificationUrl,
      rawBody,
      signatureHeader: sig,
      signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    })
  ) {
    logger.error("[Square Webhook] Signature verification FAILED", {
      notificationUrl,
    });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  let event: SquareWebhookEvent;
  try {
    event = JSON.parse(rawBody) as SquareWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  logger.info("[Square Webhook] Verified", {
    eventType: event.type,
    eventId: event.event_id,
  });
  await recordSquareWebhookEvent(event, "received");
  // Dedup: skip events we already successfully processed.
  if (event.event_id) {
    const dedupDb = await getDb();
    if (dedupDb) {
      const existing = await dedupDb
        .select({ status: squareWebhookEvents.status })
        .from(squareWebhookEvents)
        .where(eq(squareWebhookEvents.eventId, event.event_id))
        .limit(1);
      if (existing[0]?.status === "processed") {
        return Response.json({ received: true, duplicate: true });
      }
    }
  }
  try {
    await applySquareEvent(event);
    await recordSquareWebhookEvent(event, "processed");
  } catch (err: unknown) {
    await recordSquareWebhookEvent(event, "failed", errMsg(err));
    logger.error("[Square Webhook] Apply event failed", {
      error: errMsg(err),
      eventType: event.type,
    });
  }
  return Response.json({ received: true });
}

export async function registerSquareFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  if (path === "/api/square/webhook" && method === "POST") {
    return handleSquareWebhook(req);
  }

  // For non-webhook routes, refuse early if not configured.
  if (path.startsWith("/api/square/") && !squareConfigured()) {
    return Response.json({ error: "Square not configured" }, { status: 503 });
  }

  if (path === "/api/square/create-checkout" && method === "POST") {
    try {
      const authed = await authedUserFromRequest({ headers: req.headers });
      if (!authed) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      const body = await safeJson<{
        amount?: number | string;
        currency?: string;
        description?: string;
        orderId?: number | string;
        origin?: string;
      }>(req);
      const amount = parseFloat(String(body.amount ?? ""));
      if (!Number.isFinite(amount) || amount <= 0) {
        return Response.json(
          { error: "Valid amount is required" },
          { status: 400 }
        );
      }
      const baseUrl =
        body.origin || req.headers.get("origin") || "https://1commerce.online";
      const result = await createSquareCheckout({
        amount,
        currency: (body.currency || "USD").toUpperCase(),
        description: body.description || "UnifyOne Order",
        internalOrderId: body.orderId ?? null,
        tenantId: authed.tenantId,
        userId: authed.userId,
        imClickId: readImClickCookie(req),
        redirectUrl: `${baseUrl}/dashboard?square=success`,
      });
      return Response.json({
        checkoutUrl: result.checkoutUrl,
        squareOrderId: result.squareOrderId,
      });
    } catch (err: unknown) {
      logger.error("[Square] Create checkout error", { error: errMsg(err) });
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  if (path === "/api/square/capture-payment" && method === "POST") {
    try {
      const authed = await authedUserFromRequest({ headers: req.headers });
      if (!authed) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      const body = await safeJson<{
        squarePaymentId?: string;
        internalOrderId?: number | string;
      }>(req);
      if (!body.squarePaymentId) {
        return Response.json(
          { error: "squarePaymentId is required" },
          { status: 400 }
        );
      }
      const client = getSquareClient();
      if (!client) {
        return Response.json(
          { error: "Square not configured" },
          { status: 503 }
        );
      }
      const response = await client.payments.get({
        paymentId: body.squarePaymentId,
      });
      const payment = response.payment;
      if (!payment) {
        return Response.json({ error: "Payment not found" }, { status: 404 });
      }

      if (body.internalOrderId) {
        const id = parseInt(String(body.internalOrderId), 10);
        if (Number.isFinite(id)) {
          const db = await getDb();
          if (db) {
            const [orderRow] = await db
              .select({ tenantId: orders.tenantId })
              .from(orders)
              .where(eq(orders.id, id))
              .limit(1);
            if (orderRow && orderRow.tenantId === authed.tenantId) {
              await db
                .update(orders)
                .set({
                  paymentStatus:
                    payment.status === "COMPLETED" ? "paid" : "pending",
                  paymentMethod: "square",
                  squarePaymentId: payment.id ?? null,
                  squareOrderId: payment.orderId ?? null,
                })
                .where(
                  and(eq(orders.id, id), eq(orders.tenantId, authed.tenantId!))
                );
            } else {
              logger.warn("[Square] capture tenant mismatch, refusing update", {
                internalOrderId: id,
                actor: authed.userId,
              });
            }
          }
        }
      }

      // Fire Impact conversion (idempotent on stripeSessionId =
      // "square_<paymentId>") — covers the redirect-back path.
      if (payment.status === "COMPLETED" && payment.id) {
        try {
          const db = await getDb();
          if (db) {
            const { fireImpactConversion } = await import("../../_core/impact");
            const cents = Number(payment.amountMoney?.amount ?? 0);
            if (cents > 0) {
              await fireImpactConversion(db, {
                stripeSessionId: `square_${payment.id}`,
                amountCents: cents,
                currency: (
                  payment.amountMoney?.currency || "USD"
                ).toUpperCase(),
                clickId: readImClickCookie(req),
                userId: authed.userId,
              });
            }
          }
        } catch (err: unknown) {
          logger.warn("[Square] Impact conversion fire failed (non-fatal)", {
            error: errMsg(err),
          });
        }
      }

      return Response.json({
        status: payment.status,
        squarePaymentId: payment.id,
        amount: payment.amountMoney
          ? (Number(payment.amountMoney.amount) / 100).toFixed(2)
          : "0.00",
        currency: payment.amountMoney?.currency ?? "USD",
      });
    } catch (err: unknown) {
      logger.error("[Square] Capture payment error", { error: errMsg(err) });
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  if (path.startsWith("/api/square/payment/") && method === "GET") {
    try {
      const paymentId = decodeURIComponent(
        path.slice("/api/square/payment/".length)
      );
      if (!paymentId) {
        return Response.json({ error: "paymentId required" }, { status: 400 });
      }
      const client = getSquareClient();
      if (!client) {
        return Response.json(
          { error: "Square not configured" },
          { status: 503 }
        );
      }
      const response = await client.payments.get({ paymentId });
      return Response.json(response.payment);
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  if (path === "/api/square/admin/discover" && method === "POST") {
    const adminKey = req.headers.get("x-admin-key") || "";
    if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const db = await getDb();
      const events = db
        ? await db
            .select()
            .from(squareWebhookEvents)
            .orderBy(desc(squareWebhookEvents.createdAt))
            .limit(50)
        : [];

      let location: unknown = null;
      let recentPayments: unknown[] = [];
      const client = getSquareClient();
      if (client && process.env.SQUARE_LOCATION_ID) {
        try {
          const locResp = await client.locations.get({
            locationId: process.env.SQUARE_LOCATION_ID,
          });
          location = locResp.location ?? null;
        } catch {
          location = null;
        }
        try {
          const payResp = await client.payments.list({
            locationId: process.env.SQUARE_LOCATION_ID,
            limit: 20,
          });
          recentPayments = (payResp as { payments?: unknown[] }).payments ?? [];
        } catch {
          recentPayments = [];
        }
      }

      return Response.json({
        configured: squareConfigured(),
        webhookConfigured: !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
        environment: process.env.SQUARE_ENVIRONMENT,
        notificationUrl: process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? null,
        recentEvents: events,
        eventTotals: {
          received: events.filter(
            (e: { status: string }) => e.status === "received"
          ).length,
          processed: events.filter(
            (e: { status: string }) => e.status === "processed"
          ).length,
          failed: events.filter(
            (e: { status: string }) => e.status === "failed"
          ).length,
        },
        location,
        recentPayments,
      });
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  return null;
}
