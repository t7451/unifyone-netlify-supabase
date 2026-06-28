/**
 * server/payments/paypal/webhooks.ts
 *
 * Transport layer for the PayPal integration: HTTP request auth, webhook
 * signature verification (via PayPal's verify API), event dedup/dispatch, and
 * the Express + Fetch route adapters. Business logic lives in ./sync; DB
 * access lives in ./repo. Relocated verbatim from server/paypal.ts — identical
 * verification, identical route behavior and side-effect order.
 */
import express, {
  type Express,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "../../_core/sdk";
import { logger } from "../../_core/logger";
import { errMsg } from "../../_core/errors";
import { PAYPAL_BASE, getPayPalAccessToken, paypalConfigured } from "./client";
import {
  eq,
  desc,
  getDb,
  getOrderById,
  users,
  orders,
  paypalWebhookEvents,
  and,
  recordPayPalWebhookEvent,
} from "./repo";
import {
  createPayPalOrder,
  capturePayPalOrder,
  parseCustomId,
  applyPayPalEvent,
} from "./sync";

// ─── Auth helper (mirrors stripe.ts authedUserFromRequest) ─────────────────
async function authedUserFromRequest(req: {
  headers: Headers | Record<string, string | string[] | undefined>;
}): Promise<{ userId: number; tenantId: number | null; email: string } | null> {
  try {
    let cookieHeader = "";
    const rawHeaders = (req as { headers: unknown }).headers;
    if (rawHeaders instanceof Headers) {
      cookieHeader = rawHeaders.get("cookie") || "";
    } else if (rawHeaders && typeof rawHeaders === "object") {
      const v = (rawHeaders as Record<string, unknown>)["cookie"];
      cookieHeader = Array.isArray(v) ? v.join("; ") : (v as string) || "";
    }
    const m = cookieHeader.match(
      new RegExp("(?:^|;\\s*)" + COOKIE_NAME + "=([^;]+)")
    );
    if (!m) return null;
    const token = decodeURIComponent(m[1]);
    const session = await sdk.verifySession(token);
    if (!session) return null;
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.openId, session.openId))
      .limit(1);
    const u = rows[0];
    if (!u) return null;
    return {
      userId: u.id,
      tenantId: u.tenantId ?? null,
      email: u.email ?? session.email ?? "",
    };
  } catch (err: unknown) {
    logger.warn("[PayPal] authedUserFromRequest failed", {
      error: errMsg(err),
    });
    return null;
  }
}

/**
 * Verify a PayPal webhook by calling PayPal's
 * /v1/notifications/verify-webhook-signature endpoint.
 *
 * Returns true iff PayPal confirms the signature is valid AND the webhook
 * matches the configured PAYPAL_WEBHOOK_ID. NEVER trust webhook payloads
 * without calling this function first.
 *
 * Required env: PAYPAL_WEBHOOK_ID.
 */
export async function verifyPayPalWebhookSignature(params: {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    logger.error(
      "[PayPal] PAYPAL_WEBHOOK_ID is not set; rejecting webhook delivery",
      { eventType: "paypal.webhook.misconfigured" }
    );
    return false;
  }

  const h = (name: string): string | undefined => {
    const v = params.headers[name] ?? params.headers[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };

  const transmissionId = h("paypal-transmission-id");
  const transmissionTime = h("paypal-transmission-time");
  const transmissionSig = h("paypal-transmission-sig");
  const certUrl = h("paypal-cert-url");
  const authAlgo = h("paypal-auth-algo");

  if (
    !transmissionId ||
    !transmissionTime ||
    !transmissionSig ||
    !certUrl ||
    !authAlgo
  ) {
    return false;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(params.rawBody);
  } catch {
    return false;
  }

  const token = await getPayPalAccessToken();
  const verifyResp = await fetch(
    `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    }
  );

  if (!verifyResp.ok) {
    logger.error("[PayPal] Webhook verification call failed", {
      httpStatus: verifyResp.status,
      eventType: "paypal.webhook.verify_call_fail",
    });
    return false;
  }

  const data = (await verifyResp.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}

// ─── Webhook event shape ───────────────────────────────────────────────────
export type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource_type?: string;
  create_time?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    status?: string;
    amount?: { value?: string; currency_code?: string };
    payer?: { email_address?: string };
    invoice_id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
};

// ─── Express adapter (kept for local Express runs) ─────────────────────────
export function registerPayPalRoutes(app: Express) {
  app.post(
    "/api/paypal/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const rawBody =
          req.body instanceof Buffer
            ? req.body.toString("utf8")
            : typeof req.body === "string"
              ? req.body
              : JSON.stringify(req.body);
        const verified = await verifyPayPalWebhookSignature({
          headers: req.headers as Record<string, string | string[] | undefined>,
          rawBody,
        });
        if (!verified) {
          return res.status(400).json({ error: "Invalid webhook signature" });
        }
        const event = JSON.parse(rawBody) as PayPalWebhookEvent;
        await recordPayPalWebhookEvent(event, "received");
        // Dedup: skip events we already successfully processed.
        const dedupDb = await getDb();
        if (dedupDb && event.id) {
          const existing = await dedupDb
            .select({ status: paypalWebhookEvents.status })
            .from(paypalWebhookEvents)
            .where(eq(paypalWebhookEvents.eventId, event.id))
            .limit(1);
          if (existing[0]?.status === "processed") {
            return res.status(200).json({ received: true, duplicate: true });
          }
        }
        try {
          await applyPayPalEvent(event);
          await recordPayPalWebhookEvent(event, "processed");
        } catch (err: unknown) {
          await recordPayPalWebhookEvent(event, "failed", errMsg(err));
        }
        res.status(200).json({ received: true });
      } catch (err: unknown) {
        logger.error("[PayPal] Webhook handler error", { error: errMsg(err) });
        res.status(200).json({ received: true, error: errMsg(err) });
      }
    }
  );

  app.post(
    "/api/paypal/create-order",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const { amount, currency, description, internalOrderId, origin } =
          req.body;
        if (!amount || isNaN(parseFloat(amount))) {
          return res.status(400).json({ error: "Valid amount is required" });
        }
        const authed = await authedUserFromRequest({
          headers: req.headers as Record<string, string | string[] | undefined>,
        });
        const baseUrl = origin || "http://localhost:3000";
        const result = await createPayPalOrder({
          amount: parseFloat(amount),
          currency: currency || "USD",
          description: description || "UnifyOne Order",
          internalOrderId: internalOrderId ?? null,
          tenantId: authed?.tenantId ?? null,
          userId: authed?.userId ?? null,
          userEmail: authed?.email ?? null,
          imClickId: null,
          returnUrl: `${baseUrl}/checkout?paypal_return=1`,
          cancelUrl: `${baseUrl}/checkout?paypal_cancel=1`,
        });
        res.json({ orderId: result.id, approveUrl: result.approveUrl });
      } catch (err: unknown) {
        logger.error("[PayPal] Create order error", { error: errMsg(err) });
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  app.post(
    "/api/paypal/capture-order",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const { paypalOrderId, internalOrderId } = req.body;
        if (!paypalOrderId) {
          return res.status(400).json({ error: "paypalOrderId is required" });
        }
        const result = await capturePayPalOrder(paypalOrderId);
        const meta = parseCustomId(result.customId);
        const effectiveOrderId =
          (internalOrderId && parseInt(String(internalOrderId), 10)) ||
          meta.internalOrderId ||
          null;

        if (effectiveOrderId && result.status === "COMPLETED") {
          const db = await getDb();
          if (db) {
            const [orderRow] = await db
              .select({ tenantId: orders.tenantId })
              .from(orders)
              .where(eq(orders.id, effectiveOrderId))
              .limit(1);
            if (orderRow) {
              const validatedOrder = await getOrderById(
                effectiveOrderId,
                orderRow.tenantId
              );
              if (validatedOrder) {
                await db
                  .update(orders)
                  .set({
                    paymentStatus: "paid",
                    paymentMethod: "paypal",
                    paypalOrderId,
                  })
                  .where(
                    and(
                      eq(orders.id, effectiveOrderId),
                      eq(orders.tenantId, orderRow.tenantId)
                    )
                  );
              }
            }
          }
        }
        res.json(result);
      } catch (err: unknown) {
        logger.error("[PayPal] Capture error", { error: errMsg(err) });
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  app.get(
    "/api/paypal/order/:orderId",
    async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const token = await getPayPalAccessToken();
        const response = await fetch(
          `${PAYPAL_BASE}/v2/checkout/orders/${req.params.orderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        res.json(data);
      } catch (err: unknown) {
        res.status(500).json({ error: errMsg(err) });
      }
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

async function handlePayPalWebhook(req: Request): Promise<Response> {
  if (!paypalConfigured()) {
    return Response.json({ error: "PayPal not configured" }, { status: 503 });
  }
  const rawBody = await req.text();
  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headersObj[k] = v;
  });
  const verified = await verifyPayPalWebhookSignature({
    headers: headersObj,
    rawBody,
  });
  if (!verified) {
    logger.warn("[PayPal Webhook] Signature verification FAILED", {
      eventType: "paypal.webhook.sig_fail",
    });
    return Response.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }
  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  logger.info("[PayPal Webhook] Verified", {
    eventType: event.event_type,
    eventId: event.id,
  });
  await recordPayPalWebhookEvent(event, "received");
  // Dedup: skip events we already successfully processed.
  const dedupDb = await getDb();
  if (dedupDb && event.id) {
    const existing = await dedupDb
      .select({ status: paypalWebhookEvents.status })
      .from(paypalWebhookEvents)
      .where(eq(paypalWebhookEvents.eventId, event.id))
      .limit(1);
    if (existing[0]?.status === "processed") {
      return Response.json({ received: true, duplicate: true });
    }
  }
  try {
    await applyPayPalEvent(event);
    await recordPayPalWebhookEvent(event, "processed");
  } catch (err: unknown) {
    await recordPayPalWebhookEvent(event, "failed", errMsg(err));
    logger.error("[PayPal Webhook] Apply event failed", {
      error: errMsg(err),
      eventType: event.event_type,
    });
  }
  return Response.json({ received: true });
}

export async function registerPayPalFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  if (path === "/api/paypal/webhook" && method === "POST") {
    return handlePayPalWebhook(req);
  }

  if (path.startsWith("/api/paypal/") && !paypalConfigured()) {
    return Response.json({ error: "PayPal not configured" }, { status: 503 });
  }

  if (path === "/api/paypal/create-order" && method === "POST") {
    try {
      const authed = await authedUserFromRequest({
        headers: req.headers,
      });
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
        internalOrderId?: number | string;
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
      const imClickId = readImClickCookie(req);
      const result = await createPayPalOrder({
        amount,
        currency: body.currency || "USD",
        description: body.description || "UnifyOne Order",
        internalOrderId: body.internalOrderId ?? null,
        tenantId: authed.tenantId,
        userId: authed.userId,
        userEmail: authed.email,
        imClickId,
        returnUrl: `${baseUrl}/checkout?paypal_return=1`,
        cancelUrl: `${baseUrl}/checkout?paypal_cancel=1`,
      });
      return Response.json({
        orderId: result.id,
        approveUrl: result.approveUrl,
      });
    } catch (err: unknown) {
      logger.error("[PayPal] Create order error", { error: errMsg(err) });
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  if (path === "/api/paypal/capture-order" && method === "POST") {
    try {
      const authed = await authedUserFromRequest({ headers: req.headers });
      if (!authed) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      const body = await safeJson<{
        paypalOrderId?: string;
        internalOrderId?: number | string;
      }>(req);
      if (!body.paypalOrderId) {
        return Response.json(
          { error: "paypalOrderId is required" },
          { status: 400 }
        );
      }
      const result = await capturePayPalOrder(body.paypalOrderId);
      const meta = parseCustomId(result.customId);
      const effectiveOrderId =
        (body.internalOrderId
          ? parseInt(String(body.internalOrderId), 10)
          : NaN) ||
        meta.internalOrderId ||
        null;

      if (effectiveOrderId && result.status === "COMPLETED") {
        const db = await getDb();
        if (db) {
          // Tenant guardrail: enforce that the captured order belongs to the
          // authenticated tenant before mutating it.
          const [orderRow] = await db
            .select({ tenantId: orders.tenantId })
            .from(orders)
            .where(eq(orders.id, effectiveOrderId))
            .limit(1);
          if (orderRow && orderRow.tenantId === authed.tenantId) {
            await db
              .update(orders)
              .set({
                paymentStatus: "paid",
                paymentMethod: "paypal",
                paypalOrderId: body.paypalOrderId,
              })
              .where(
                and(
                  eq(orders.id, effectiveOrderId),
                  eq(orders.tenantId, orderRow.tenantId)
                )
              );
          } else {
            logger.warn("[PayPal] capture tenant mismatch, refusing update", {
              effectiveOrderId,
              actor: authed.userId,
            });
          }
        }
      }

      // Fire Impact conversion on direct capture path (in addition to webhook)
      // so single-page checkout flows attribute even if the webhook lags.
      // Idempotent on stripeSessionId = "paypal_<captureId>".
      if (result.status === "COMPLETED" && result.captureId) {
        try {
          const db = await getDb();
          if (db) {
            const { fireImpactConversion } = await import("../../_core/impact");
            const amountCents = Math.round(parseFloat(result.amount) * 100);
            if (amountCents > 0) {
              await fireImpactConversion(db, {
                stripeSessionId: `paypal_${result.captureId}`,
                amountCents,
                currency: result.currency.toUpperCase(),
                clickId: meta.imClickId || readImClickCookie(req),
                userId: meta.userId ?? authed.userId,
              });
            }
          }
        } catch (err: unknown) {
          logger.warn("[PayPal] Impact conversion fire failed (non-fatal)", {
            error: errMsg(err),
          });
        }
      }

      return Response.json(result);
    } catch (err: unknown) {
      logger.error("[PayPal] Capture error", { error: errMsg(err) });
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  if (path.startsWith("/api/paypal/order/") && method === "GET") {
    try {
      const orderId = decodeURIComponent(
        path.slice("/api/paypal/order/".length)
      );
      if (!orderId) {
        return Response.json({ error: "orderId required" }, { status: 400 });
      }
      const token = await getPayPalAccessToken();
      const resp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      return Response.json(data, { status: resp.status });
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // Admin: read-only triage snapshot (recent webhook events + balance report).
  if (path === "/api/paypal/admin/discover" && method === "POST") {
    const adminKey = req.headers.get("x-admin-key") || "";
    if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const db = await getDb();
      const events = db
        ? await db
            .select()
            .from(paypalWebhookEvents)
            .orderBy(desc(paypalWebhookEvents.createdAt))
            .limit(50)
        : [];

      // Pull the live PayPal balance / current fees report — best-effort.
      let balance: unknown = null;
      try {
        const token = await getPayPalAccessToken();
        const balResp = await fetch(
          `${PAYPAL_BASE}/v1/reporting/balances?currency_code=USD`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (balResp.ok) balance = await balResp.json();
      } catch {
        balance = null;
      }

      return Response.json({
        configured: paypalConfigured(),
        webhookConfigured: !!process.env.PAYPAL_WEBHOOK_ID,
        apiBase: PAYPAL_BASE,
        livemode: !PAYPAL_BASE.includes("sandbox"),
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
        balance,
      });
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  return null;
}
