/**
 * server/paypal.ts
 *
 * PayPal Smart Buttons + REST checkout integration.
 *
 * Production-grade: matches the shape of server/stripe.ts.
 *
 * Express routes (registerPayPalRoutes) are kept for local Express runs;
 * Netlify production runs the Fetch handler (registerPayPalFetchRoutes)
 * which is mounted from server/_core/nonTrpcRoutes.ts BEFORE tRPC.
 *
 * Endpoints
 *   POST /api/paypal/create-order      JWT-authed, persists tenant_id meta
 *   POST /api/paypal/capture-order     JWT-authed, idempotent capture
 *   GET  /api/paypal/order/:orderId    Fetches order status
 *   POST /api/paypal/webhook           Verifies via PayPal's verify API
 *   POST /api/paypal/admin/discover    x-admin-key gated read-only snapshot
 *
 * Webhook signature: PayPal does NOT use HMAC. We MUST call
 * /v1/notifications/verify-webhook-signature with the headers + raw body and
 * the configured PAYPAL_WEBHOOK_ID. Without that env var we fail closed.
 *
 * Tenant linking: createOrder stamps tenant_id + user_id into PayPal's
 * `custom_id` AND into the purchase_unit reference id; the capture step looks
 * up the tenant via that metadata when the internal order isn't supplied.
 * Same logic as resolveTenantForCheckout in stripe.ts.
 *
 * Impact.com: successful captures fire fireImpactConversion with a synthetic
 * stripeSessionId of `paypal_<orderId>` (key reuse — unique per provider).
 */
import express, {
  type Express,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import { eq, and, desc } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./_core/sdk";
import { logger } from "./_core/logger";
import { errMsg } from "./_core/errors";
import { getDb, getOrderById, getTenantById, getTenantsByOwner } from "./db";
import { orders, paypalWebhookEvents, tenants, users } from "../drizzle/schema";

const PAYPAL_BASE =
  process.env.PAYPAL_API_BASE_URL || "https://api-m.paypal.com";

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

// ─── PayPal REST helpers ───────────────────────────────────────────────────
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      `PayPal auth failed: ${data.error_description || data.error}`
    );
  }

  return data.access_token as string;
}

export interface CreatePayPalOrderInput {
  amount: number;
  currency?: string;
  description?: string;
  internalOrderId?: string | number | null;
  tenantId?: number | null;
  userId?: number | null;
  userEmail?: string | null;
  imClickId?: string | null;
  returnUrl: string;
  cancelUrl: string;
}

export async function createPayPalOrder(
  params: CreatePayPalOrderInput
): Promise<{
  id: string;
  approveUrl: string;
}> {
  const token = await getPayPalAccessToken();
  const currency = params.currency || "USD";
  const amountStr = params.amount.toFixed(2);

  // Pack tenant/user/im_click into custom_id so the webhook + capture step
  // can resolve the right tenant when the internal order row isn't known.
  // PayPal limits custom_id to 127 chars, so we encode compactly.
  const customParts: string[] = [];
  if (params.internalOrderId) customParts.push(`oid=${params.internalOrderId}`);
  if (params.tenantId) customParts.push(`tid=${params.tenantId}`);
  if (params.userId) customParts.push(`uid=${params.userId}`);
  if (params.imClickId) customParts.push(`imc=${params.imClickId}`);
  const customId = customParts.join(";").slice(0, 127);

  const body: Record<string, unknown> = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amountStr,
        },
        description: params.description || "UnifyOne Order",
        ...(customId && { custom_id: customId }),
        reference_id: params.internalOrderId
          ? `unifyone-${params.internalOrderId}`
          : `unifyone-${Date.now()}`,
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
          brand_name: "UnifyOne Commerce",
          locale: "en-US",
          landing_page: "LOGIN",
          user_action: "PAY_NOW",
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
        },
      },
    },
  };

  const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `unifyone-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    },
    body: JSON.stringify(body),
  });

  type PayPalOrderResponse = {
    id: string;
    links?: Array<{ rel: string; href: string }>;
  };
  const data = (await response.json()) as PayPalOrderResponse;

  if (!response.ok) {
    throw new Error(`PayPal create order failed: ${JSON.stringify(data)}`);
  }

  const approveLink = data.links?.find(
    l => l.rel === "payer-action" || l.rel === "approve"
  );

  return {
    id: data.id,
    approveUrl:
      approveLink?.href ||
      `https://www.paypal.com/checkoutnow?token=${data.id}`,
  };
}

export interface PayPalCaptureResult {
  status: string;
  captureId: string;
  amount: string;
  currency: string;
  payerEmail: string | null;
  customId: string | null;
}

export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<PayPalCaptureResult> {
  const token = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `unifyone-cap-${paypalOrderId}`,
      },
    }
  );

  type PayPalCaptureResponse = {
    status?: string;
    payer?: { email_address?: string };
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id?: string;
          amount?: { value?: string; currency_code?: string };
          custom_id?: string;
        }>;
      };
    }>;
  };
  const data = (await response.json()) as PayPalCaptureResponse;

  // PayPal returns 422 ORDER_ALREADY_CAPTURED on a re-capture — surface this
  // as an idempotent success so callers don't need to special-case it.
  if (!response.ok) {
    const dataStr = JSON.stringify(data);
    if (dataStr.includes("ORDER_ALREADY_CAPTURED")) {
      // Refetch the order to learn what the prior capture actually was.
      const getResp = await fetch(
        `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const getData = (await getResp.json()) as PayPalCaptureResponse;
      const cap = getData.purchase_units?.[0]?.payments?.captures?.[0];
      return {
        status: getData.status ?? "COMPLETED",
        captureId: cap?.id || "",
        amount: cap?.amount?.value || "0",
        currency: cap?.amount?.currency_code || "USD",
        payerEmail: getData.payer?.email_address || null,
        customId: cap?.custom_id || null,
      };
    }
    throw new Error(`PayPal capture failed: ${dataStr}`);
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: data.status ?? "",
    captureId: capture?.id || "",
    amount: capture?.amount?.value || "0",
    currency: capture?.amount?.currency_code || "USD",
    payerEmail: data.payer?.email_address || null,
    customId: capture?.custom_id || null,
  };
}

/**
 * Parse the encoded custom_id we stamped at create time:
 *   "oid=42;tid=7;uid=99;imc=abc"
 * Unknown / missing keys are returned as null.
 */
export function parseCustomId(customId: string | null | undefined): {
  internalOrderId: number | null;
  tenantId: number | null;
  userId: number | null;
  imClickId: string | null;
} {
  if (!customId) {
    return {
      internalOrderId: null,
      tenantId: null,
      userId: null,
      imClickId: null,
    };
  }
  const parts = customId.split(";");
  const get = (key: string): string | null => {
    for (const p of parts) {
      const eq = p.indexOf("=");
      if (eq > 0 && p.slice(0, eq) === key) return p.slice(eq + 1);
    }
    return null;
  };
  const num = (s: string | null): number | null => {
    if (s == null) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    internalOrderId: num(get("oid")),
    tenantId: num(get("tid")),
    userId: num(get("uid")),
    imClickId: get("imc"),
  };
}

/** Resolve the tenant that owns this PayPal capture using:
 *   1. internalOrderId → orders.tenantId
 *   2. customId.tid    → tenants by id
 *   3. customId.uid    → tenants by owner
 * Mirrors stripe.ts:resolveTenantForCheckout.
 */
export async function resolveTenantForPayPal(input: {
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

// ─── Webhook event persistence ─────────────────────────────────────────────
type PayPalWebhookEvent = {
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

async function recordPayPalWebhookEvent(
  event: PayPalWebhookEvent,
  status: "received" | "processed" | "failed",
  errorMessage?: string
): Promise<void> {
  if (!event?.id || !event.event_type) return;
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(paypalWebhookEvents)
      .values({
        eventId: event.id,
        eventType: event.event_type,
        status,
        errorMessage: errorMessage ?? null,
        livemode: !PAYPAL_BASE.includes("sandbox"),
        payload: event as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: paypalWebhookEvents.eventId,
        set: {
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        },
      });
  } catch (err: unknown) {
    logger.error("[PayPal Webhook] Failed to record event", {
      error: errMsg(err),
    });
  }
}

// ─── Apply a verified webhook event to our state ───────────────────────────
async function applyPayPalEvent(event: PayPalWebhookEvent): Promise<void> {
  const t = event.event_type || "";
  const resource = event.resource || {};
  const db = await getDb();
  if (!db) return;

  if (t === "PAYMENT.CAPTURE.COMPLETED" || t === "PAYMENT.CAPTURE.DENIED") {
    const meta = parseCustomId(resource.custom_id);
    const tenant = await resolveTenantForPayPal(meta);
    const captureId = resource.id || "";
    const paypalOrderId =
      resource.supplementary_data?.related_ids?.order_id || "";

    if (meta.internalOrderId) {
      await db
        .update(orders)
        .set({
          paymentStatus: t === "PAYMENT.CAPTURE.COMPLETED" ? "paid" : "failed",
          paymentMethod: "paypal",
          ...(paypalOrderId && { paypalOrderId }),
        })
        .where(
          tenant
            ? and(
                eq(orders.id, meta.internalOrderId),
                eq(orders.tenantId, tenant.id)
              )
            : eq(orders.id, meta.internalOrderId)
        );
    }

    if (t === "PAYMENT.CAPTURE.COMPLETED" && tenant) {
      // Fire Impact.com conversion (idempotent on stripeSessionId =
      // "paypal_<captureId>"). Non-fatal if the helper isn't configured.
      try {
        const { fireImpactConversion } = await import("./_core/impact");
        const amountStr = resource.amount?.value || "0";
        const amountCents = Math.round(parseFloat(amountStr) * 100);
        if (amountCents > 0) {
          await fireImpactConversion(db, {
            stripeSessionId: `paypal_${captureId || event.id || Date.now()}`,
            amountCents,
            currency: (resource.amount?.currency_code || "USD").toUpperCase(),
            clickId: meta.imClickId,
            userId: meta.userId,
          });
        }
      } catch (err: unknown) {
        logger.warn("[PayPal] Impact conversion fire failed", {
          error: errMsg(err),
        });
      }
    }
  } else if (
    t === "BILLING.SUBSCRIPTION.ACTIVATED" ||
    t === "BILLING.SUBSCRIPTION.UPDATED"
  ) {
    const meta = parseCustomId(resource.custom_id);
    const tenant = await resolveTenantForPayPal(meta);
    if (tenant && resource.id) {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "active" })
        .where(eq(tenants.id, tenant.id));
    }
  } else if (
    t === "BILLING.SUBSCRIPTION.CANCELLED" ||
    t === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    t === "BILLING.SUBSCRIPTION.EXPIRED"
  ) {
    const meta = parseCustomId(resource.custom_id);
    const tenant = await resolveTenantForPayPal(meta);
    if (tenant) {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "cancelled" })
        .where(eq(tenants.id, tenant.id));
    }
  }
}

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

export { getPayPalAccessToken };

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

function paypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
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
            const { fireImpactConversion } = await import("./_core/impact");
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

// Export key internals for tests.
export const __internal__ = {
  parseCustomId,
  applyPayPalEvent,
  recordPayPalWebhookEvent,
  resolveTenantForPayPal,
  paypalConfigured,
};
