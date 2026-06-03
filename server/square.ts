/**
 * server/square.ts
 *
 * Square Web Payments + Hosted Checkout integration.
 *
 * Production-grade: parallel of server/stripe.ts + server/paypal.ts.
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
 *
 * Tenant linking: create-checkout stamps tenant_id, user_id, internal_order_id
 * into the order metadata. The webhook + capture path use `resolveTenantForSquare`
 * (mirrors stripe.ts:resolveTenantForCheckout).
 */
import express, {
  type Express,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import { SquareClient, SquareEnvironment } from "square";
import crypto from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./_core/sdk";
import { logger } from "./_core/logger";
import { errMsg } from "./_core/errors";
import { getDb, getOrderById, getTenantById, getTenantsByOwner } from "./db";
import { orders, squareWebhookEvents, tenants, users } from "../drizzle/schema";

// ─── Auth helper (mirrors stripe.ts authedUserFromRequest) ─────────────────
async function authedUserFromRequest(input: {
  headers: Headers | Record<string, string | string[] | undefined>;
}): Promise<{ userId: number; tenantId: number | null; email: string } | null> {
  try {
    let cookieHeader = "";
    if (input.headers instanceof Headers) {
      cookieHeader = input.headers.get("cookie") || "";
    } else if (input.headers && typeof input.headers === "object") {
      const v = (input.headers as Record<string, unknown>)["cookie"];
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
    logger.warn("[Square] authedUserFromRequest failed", {
      error: errMsg(err),
    });
    return null;
  }
}

// ─── Lazy Square client (null until configured) ────────────────────────────
function getSquareClient(): SquareClient | null {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) return null;
  return new SquareClient({
    token,
    environment:
      process.env.SQUARE_ENVIRONMENT === "sandbox"
        ? SquareEnvironment.Sandbox
        : SquareEnvironment.Production,
  });
}

export function squareConfigured(): boolean {
  return !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

// ─── Tenant resolution from Square metadata ────────────────────────────────
export async function resolveTenantForSquare(input: {
  internalOrderId: number | null;
  tenantId: number | null;
  userId: number | null;
}): Promise<{ id: number } | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  if (input.internalOrderId) {
    const [row] = await db
      .select({ tenantId: orders.tenantId })
      .from(orders)
      .where(eq(orders.id, input.internalOrderId))
      .limit(1);
    if (row?.tenantId) return { id: row.tenantId };
  }
  if (input.tenantId) {
    const t = await getTenantById(input.tenantId);
    if (t) return { id: t.id };
  }
  if (input.userId) {
    const owned = await getTenantsByOwner(input.userId);
    if (owned[0]) return { id: owned[0].id };
  }
  return undefined;
}

// ─── Square checkout link creation ─────────────────────────────────────────
export interface CreateSquareCheckoutInput {
  amount: number;
  currency?: string;
  description?: string;
  internalOrderId?: number | string | null;
  tenantId?: number | null;
  userId?: number | null;
  imClickId?: string | null;
  redirectUrl: string;
}

export async function createSquareCheckout(
  input: CreateSquareCheckoutInput
): Promise<{
  checkoutUrl: string;
  paymentLinkId: string;
  squareOrderId: string;
}> {
  const client = getSquareClient();
  if (!client) throw new Error("Square not configured");
  if (!process.env.SQUARE_LOCATION_ID) {
    throw new Error("SQUARE_LOCATION_ID not configured");
  }

  const amountMoney = BigInt(Math.round(input.amount * 100));
  const idempotencyKey = crypto.randomUUID();

  const metadata: Record<string, string> = {};
  if (input.internalOrderId)
    metadata.internal_order_id = String(input.internalOrderId);
  if (input.tenantId) metadata.tenant_id = String(input.tenantId);
  if (input.userId) metadata.user_id = String(input.userId);
  if (input.imClickId) metadata.im_click_id = input.imClickId;

  const response = await client.checkout.paymentLinks.create({
    idempotencyKey,
    order: {
      locationId: process.env.SQUARE_LOCATION_ID,
      lineItems: [
        {
          name: input.description || "UnifyOne Order",
          quantity: "1",
          basePriceMoney: {
            amount: amountMoney,
            currency: (input.currency || "USD").toUpperCase() as
              | "USD"
              | "CAD"
              | "GBP"
              | "JPY"
              | "EUR"
              | "AUD",
          },
        },
      ],
      metadata: Object.keys(metadata).length ? metadata : undefined,
    },
    checkoutOptions: {
      redirectUrl: input.redirectUrl,
    },
  });

  const link = response.paymentLink;
  if (!link?.url) throw new Error("Square did not return a checkout URL");
  return {
    checkoutUrl: link.url,
    paymentLinkId: link.id ?? "",
    squareOrderId: link.orderId ?? "",
  };
}

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

// ─── Webhook persistence ───────────────────────────────────────────────────
type SquareWebhookEvent = {
  type?: string;
  event_id?: string;
  merchant_id?: string;
  created_at?: string;
  data?: {
    type?: string;
    id?: string;
    object?: {
      payment?: {
        id?: string;
        status?: string;
        order_id?: string;
        amount_money?: { amount?: number; currency?: string };
        receipt_email?: string;
      };
      order?: {
        id?: string;
        location_id?: string;
        metadata?: Record<string, string>;
      };
      subscription?: {
        id?: string;
        status?: string;
        location_id?: string;
        customer_id?: string;
        metadata?: Record<string, string>;
      };
    };
  };
};

async function recordSquareWebhookEvent(
  event: SquareWebhookEvent,
  status: "received" | "processed" | "failed",
  errorMessage?: string
): Promise<void> {
  if (!event?.event_id || !event.type) return;
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(squareWebhookEvents)
      .values({
        eventId: event.event_id,
        eventType: event.type,
        status,
        errorMessage: errorMessage ?? null,
        livemode: process.env.SQUARE_ENVIRONMENT !== "sandbox",
        payload: event as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: squareWebhookEvents.eventId,
        set: {
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        },
      });
  } catch (err: unknown) {
    logger.error("[Square Webhook] Failed to record event", {
      error: errMsg(err),
    });
  }
}

// ─── Fetch order metadata from Square (for tenant linking) ─────────────────
async function fetchSquareOrderMetadata(
  orderId: string
): Promise<Record<string, string> | null> {
  const client = getSquareClient();
  if (!client) return null;
  try {
    const resp = await client.orders.get({ orderId });
    const meta = resp.order?.metadata;
    if (!meta) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch (err: unknown) {
    logger.warn("[Square] fetchSquareOrderMetadata failed", {
      error: errMsg(err),
      orderId,
    });
    return null;
  }
}

// ─── Apply a verified webhook event to our state ───────────────────────────
async function applySquareEvent(event: SquareWebhookEvent): Promise<void> {
  const t = event.type || "";
  const db = await getDb();
  if (!db) return;

  if (t === "payment.created" || t === "payment.updated") {
    const payment = event.data?.object?.payment;
    if (!payment?.id || !payment.status) return;

    // Square doesn't put metadata directly on the payment in webhooks; pull
    // the order to resolve the tenant.
    let metadata: Record<string, string> | null = null;
    if (payment.order_id) {
      metadata = await fetchSquareOrderMetadata(payment.order_id);
    }
    const internalOrderId = metadata?.internal_order_id
      ? parseInt(metadata.internal_order_id, 10)
      : null;
    const tenantIdMeta = metadata?.tenant_id
      ? parseInt(metadata.tenant_id, 10)
      : null;
    const userIdMeta = metadata?.user_id
      ? parseInt(metadata.user_id, 10)
      : null;
    const imClickId = metadata?.im_click_id ?? null;

    const tenant = await resolveTenantForSquare({
      internalOrderId,
      tenantId: tenantIdMeta,
      userId: userIdMeta,
    });

    if (payment.status === "COMPLETED" && internalOrderId && tenant) {
      await db
        .update(orders)
        .set({
          paymentStatus: "paid",
          paymentMethod: "square",
          squarePaymentId: payment.id,
          squareOrderId: payment.order_id ?? null,
        })
        .where(
          and(eq(orders.id, internalOrderId), eq(orders.tenantId, tenant.id))
        );

      // Fire Impact conversion. Idempotent on stripeSessionId =
      // "square_<paymentId>".
      try {
        const { fireImpactConversion } = await import("./_core/impact");
        const cents = payment.amount_money?.amount ?? 0;
        if (cents > 0) {
          await fireImpactConversion(db, {
            stripeSessionId: `square_${payment.id}`,
            amountCents: cents,
            currency: (payment.amount_money?.currency || "USD").toUpperCase(),
            clickId: imClickId,
            userId: userIdMeta ?? null,
          });
        }
      } catch (err: unknown) {
        logger.warn("[Square] Impact conversion fire failed", {
          error: errMsg(err),
        });
      }
    } else if (payment.status === "FAILED" && internalOrderId && tenant) {
      await db
        .update(orders)
        .set({
          paymentStatus: "failed",
          paymentMethod: "square",
          squarePaymentId: payment.id,
        })
        .where(
          and(eq(orders.id, internalOrderId), eq(orders.tenantId, tenant.id))
        );
    }
  } else if (t === "subscription.created" || t === "subscription.updated") {
    const sub = event.data?.object?.subscription;
    if (!sub) return;
    const meta = sub.metadata ?? {};
    const tenant = await resolveTenantForSquare({
      internalOrderId: null,
      tenantId: meta.tenant_id ? parseInt(meta.tenant_id, 10) : null,
      userId: meta.user_id ? parseInt(meta.user_id, 10) : null,
    });
    if (!tenant) return;
    const status = sub.status ?? "";
    if (status === "ACTIVE") {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "active" })
        .where(eq(tenants.id, tenant.id));
    } else if (status === "CANCELED" || status === "DEACTIVATED") {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "cancelled" })
        .where(eq(tenants.id, tenant.id));
    } else if (status === "PAUSED" || status === "PAST_DUE") {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "past_due" })
        .where(eq(tenants.id, tenant.id));
    }
  }
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
            const { fireImpactConversion } = await import("./_core/impact");
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

// Export internals for tests.
export const __internal__ = {
  expectedSquareSignature,
  verifySquareSignature,
  resolveTenantForSquare,
  applySquareEvent,
  recordSquareWebhookEvent,
  squareConfigured,
};
