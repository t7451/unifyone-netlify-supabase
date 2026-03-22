import { SquareClient, SquareEnvironment } from "square";
import type { Express, Request, Response } from "express";
import express from "express";
import { getDb } from "./db";
import { orders } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import crypto from "crypto";

// Lazy client — null if not configured
function getSquareClient() {
  if (!ENV.squareAccessToken) return null;
  return new SquareClient({
    token: ENV.squareAccessToken,
    environment:
      ENV.squareEnvironment === "sandbox"
        ? SquareEnvironment.Sandbox
        : SquareEnvironment.Production,
  });
}

export function registerSquareRoutes(app: Express) {
  // POST /api/square/create-checkout
  // Creates a Square hosted payment link (buyer redirected to Square)
  app.post(
    "/api/square/create-checkout",
    express.json(),
    async (req: Request, res: Response) => {
      const client = getSquareClient();
      if (!client)
        return res.status(503).json({ error: "Square not configured" });

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
        if (!ENV.squareLocationId) {
          return res
            .status(503)
            .json({ error: "SQUARE_LOCATION_ID not configured" });
        }

        const amountMoney = BigInt(Math.round(parseFloat(amount) * 100));
        const idempotencyKey = crypto.randomUUID();
        const baseUrl = origin || "https://unifyone.netlify.app";

        const response = await client.checkout.paymentLinks.create({
          idempotencyKey,
          order: {
            locationId: ENV.squareLocationId,
            lineItems: [
              {
                name: description || "UnifyOne Order",
                quantity: "1",
                basePriceMoney: {
                  amount: amountMoney,
                  currency: currency.toUpperCase(),
                },
              },
            ],
            metadata: orderId
              ? { internal_order_id: String(orderId) }
              : undefined,
          },
          checkoutOptions: {
            redirectUrl: `${baseUrl}/dashboard?square=success`,
          },
        });

        const link = response.paymentLink;
        if (!link?.url) throw new Error("Square did not return a checkout URL");

        res.json({ checkoutUrl: link.url, squareOrderId: link.orderId });
      } catch (err: any) {
        console.error("[Square] Create checkout error:", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // POST /api/square/capture-payment
  // Retrieve a Square payment and mark the internal order as paid
  app.post(
    "/api/square/capture-payment",
    express.json(),
    async (req: Request, res: Response) => {
      const client = getSquareClient();
      if (!client)
        return res.status(503).json({ error: "Square not configured" });

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
          const db = await getDb();
          if (db) {
            await db
              .update(orders)
              .set({
                paymentStatus: "paid",
                paymentMethod: "square",
                squarePaymentId: payment.id ?? null,
                squareOrderId: payment.orderId ?? null,
              })
              .where(eq(orders.id, parseInt(internalOrderId)));
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
      } catch (err: any) {
        console.error("[Square] Capture payment error:", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // GET /api/square/payment/:paymentId
  app.get(
    "/api/square/payment/:paymentId",
    async (req: Request, res: Response) => {
      const client = getSquareClient();
      if (!client)
        return res.status(503).json({ error: "Square not configured" });
      try {
        const response = await client.payments.get({
          paymentId: req.params.paymentId,
        });
        res.json(response.payment);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  // POST /api/square/webhook
  // Verify Square webhook signature and process payment.completed events
  app.post(
    "/api/square/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      if (!ENV.squareWebhookSignatureKey) {
        console.warn(
          "[Square Webhook] No signature key configured, skipping verification"
        );
      } else {
        // Square signature: HMAC-SHA256 of (url + body) with signature key
        const squareSignature = req.headers[
          "x-square-hmacsha256-signature"
        ] as string;
        const webhookUrl = `https://${req.headers.host}/api/square/webhook`;
        const bodyString = req.body.toString("utf8");
        const hmac = crypto.createHmac("sha256", ENV.squareWebhookSignatureKey);
        hmac.update(webhookUrl + bodyString);
        const expectedSignature = hmac.digest("base64");

        if (squareSignature !== expectedSignature) {
          console.error("[Square Webhook] Signature verification failed");
          return res.status(400).json({ error: "Invalid signature" });
        }
      }

      let event: any;
      try {
        event = JSON.parse(req.body.toString("utf8"));
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }

      console.log(`[Square Webhook] Event: ${event.type} (${event.event_id})`);

      try {
        if (
          event.type === "payment.completed" ||
          event.type === "payment.updated"
        ) {
          const payment = event.data?.object?.payment;
          if (payment?.status === "COMPLETED" && payment.id) {
            const db = await getDb();
            if (db) {
              const internalOrderId = payment.metadata?.internal_order_id;

              if (internalOrderId) {
                await db
                  .update(orders)
                  .set({
                    paymentStatus: "paid",
                    paymentMethod: "square",
                    squarePaymentId: payment.id,
                    squareOrderId: payment.order_id ?? null,
                  })
                  .where(eq(orders.id, parseInt(internalOrderId)));
                console.log(
                  `[Square] Order ${internalOrderId} marked as paid via webhook`
                );
              }
            }
          }
        }
      } catch (err) {
        console.error("[Square Webhook] Processing error:", err);
      }

      res.json({ received: true });
    }
  );
}
