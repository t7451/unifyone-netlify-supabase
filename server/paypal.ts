import express, { type Express, type Request, type Response } from "express";
import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { errMsg } from "./_core/errors";

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

  const data = (await response.json()) as any;

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

  const data = (await response.json()) as any;

  if (!response.ok) {
    throw new Error(`PayPal capture failed: ${JSON.stringify(data)}`);
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: data.status,
    captureId: capture?.id || "",
    amount: capture?.amount?.value || "0",
    currency: capture?.amount?.currency_code || "USD",
  };
}

export function registerPayPalRoutes(app: Express) {
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
            await db
              .update(orders)
              .set({
                paymentStatus: "paid",
                paymentMethod: "paypal",
                paypalOrderId: paypalOrderId,
              })
              .where(eq(orders.id, parseInt(internalOrderId)));
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
