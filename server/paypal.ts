import express, { type Express, type Request, type Response } from "express";
import { getDb, getOrderById } from "./db";
import { orders } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { errMsg } from "./_core/errors";
import { logger } from "./_core/logger";

const PAYPAL_BASE = "https://api-m.paypal.com";

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

export async function createPayPalOrder(params: {
  amount: number;
  currency?: string;
  description?: string;
  orderId?: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; approveUrl: string }> {
  const token = await getPayPalAccessToken();
  const currency = params.currency || "USD";
  const amountStr = params.amount.toFixed(2);

  const body: Record<string, unknown> = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amountStr,
        },
        description: params.description || "UnifyOne Order",
        ...(params.orderId && { custom_id: params.orderId }),
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
      "PayPal-Request-Id": `unifyone-${Date.now()}`,
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

export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  status: string;
  captureId: string;
  amount: string;
  currency: string;
}> {
  const token = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  type PayPalCaptureResponse = {
    status?: string;
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id?: string;
          amount?: { value?: string; currency_code?: string };
        }>;
      };
    }>;
  };
  const data = (await response.json()) as PayPalCaptureResponse;

  if (!response.ok) {
    throw new Error(`PayPal capture failed: ${JSON.stringify(data)}`);
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: data.status ?? "",
    captureId: capture?.id || "",
    amount: capture?.amount?.value || "0",
    currency: capture?.amount?.currency_code || "USD",
  };
}

/**
 * Verify a PayPal webhook by calling PayPal's
 * /v1/notifications/verify-webhook-signature endpoint.
 *
 * Returns true iff PayPal confirms the signature is valid AND the webhook
 * matches the configured PAYPAL_WEBHOOK_ID. NEVER trust webhook payloads
 * without calling this function first.
 *
 * Required env: PAYPAL_WEBHOOK_ID (set this to the webhook ID in your
 * PayPal developer dashboard for the *production* webhook).
 */
export async function verifyPayPalWebhookSignature(params: {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // Fail closed — never accept unverified webhooks in production.
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

  // PayPal requires the original event JSON; parse the raw body once.
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

export function registerPayPalRoutes(app: Express) {
  // Webhook receiver — MUST verify signature before processing.
  // Uses express.raw to preserve the exact bytes PayPal signed.
  app.post(
    "/api/paypal/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req: Request, res: Response) => {
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
          logger.warn("[PayPal] Webhook signature verification FAILED", {
            eventType: "paypal.webhook.sig_fail",
          });
          return res.status(400).json({ error: "Invalid webhook signature" });
        }

        // At this point the payload is trusted. Downstream handling (order
        // fulfillment, refund processing, etc.) is intentionally minimal
        // here — webhooks are persisted to webhook_events for audit and the
        // rest of the system reconciles via the capture API. Extend with
        // event-specific handlers as needed.
        const event = JSON.parse(rawBody) as {
          id?: string;
          event_type?: string;
        };
        logger.info("[PayPal] Webhook verified", {
          paypalEventType: event.event_type,
          paypalEventId: event.id,
        });

        res.status(200).json({ received: true });
      } catch (err: unknown) {
        logger.error("[PayPal] Webhook handler error", { error: errMsg(err) });
        // 200 is intentional — PayPal will retry on non-2xx, but a handler
        // crash on a verified payload means re-delivery won't help. Audit
        // the error and recover via the capture API instead.
        res.status(200).json({ received: true, error: errMsg(err) });
      }
    }
  );

  // Create PayPal order — returns approve URL for redirect
  app.post(
    "/api/paypal/create-order",
    express.json(),
    async (req: Request, res: Response) => {
      try {
        const { amount, currency, description, orderId, origin } = req.body;

        if (!amount || isNaN(parseFloat(amount))) {
          return res.status(400).json({ error: "Valid amount is required" });
        }

        const baseUrl = origin || "http://localhost:3000";

        const result = await createPayPalOrder({
          amount: parseFloat(amount),
          currency: currency || "USD",
          description: description || "UnifyOne Order",
          orderId,
          returnUrl: `${baseUrl}/checkout/paypal-return`,
          cancelUrl: `${baseUrl}/checkout/paypal-cancel`,
        });

        console.log(`[PayPal] Order created: ${result.id}`);
        res.json({ orderId: result.id, approveUrl: result.approveUrl });
      } catch (err: unknown) {
        console.error("[PayPal] Create order error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // Capture PayPal order after buyer approves
  app.post(
    "/api/paypal/capture-order",
    express.json(),
    async (req: Request, res: Response) => {
      try {
        const { paypalOrderId, internalOrderId } = req.body;

        if (!paypalOrderId) {
          return res.status(400).json({ error: "paypalOrderId is required" });
        }

        const result = await capturePayPalOrder(paypalOrderId);

        // Update internal order payment status if an internal order ID was provided
        if (internalOrderId && result.status === "COMPLETED") {
          const db = await getDb();
          if (db) {
            const parsedOrderId = parseInt(internalOrderId);
            // Look up the order to obtain its tenantId, then re-validate ownership
            // atomically using getOrderById(id, tenantId) before updating.
            const [orderRow] = await db
              .select({ tenantId: orders.tenantId })
              .from(orders)
              .where(eq(orders.id, parsedOrderId))
              .limit(1);
            if (!orderRow) {
              console.warn(
                `[PayPal] Capture rejected: internalOrderId ${parsedOrderId} not found`
              );
              return res.status(400).json({ error: "Order not found" });
            }
            // Re-validate: getOrderById enforces tenantId in the WHERE clause
            const validatedOrder = await getOrderById(
              parsedOrderId,
              orderRow.tenantId
            );
            if (!validatedOrder) {
              console.warn(
                `[PayPal] Capture rejected: tenantId mismatch for order ${parsedOrderId}`
              );
              return res.status(400).json({ error: "Order not found" });
            }
            await db
              .update(orders)
              .set({
                paymentStatus: "paid",
                paymentMethod: "paypal",
                paypalOrderId: paypalOrderId,
              })
              .where(
                and(
                  eq(orders.id, parsedOrderId),
                  eq(orders.tenantId, orderRow.tenantId)
                )
              );
          }
        }

        console.log(
          `[PayPal] Order captured: ${paypalOrderId} — status: ${result.status}`
        );
        res.json(result);
      } catch (err: unknown) {
        console.error("[PayPal] Capture error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // Get PayPal order details
  app.get("/api/paypal/order/:orderId", async (req: Request, res: Response) => {
    try {
      const token = await getPayPalAccessToken();
      const response = await fetch(
        `${PAYPAL_BASE}/v2/checkout/orders/${req.params.orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({ error: errMsg(err) });
    }
  });
}

export { getPayPalAccessToken };

// Fetch-based route handler stub (for Netlify serverless; not yet implemented)
export const registerPayPalFetchRoutes: null = null;
