import express, { Express } from "express";
import Stripe from "stripe";
import { createOrder, getOrderByPaymentIntentId, updateOrder } from "../db";
import { notifyOwner } from "./notification";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export function registerStripeWebhook(app: Express) {
  // Webhook endpoint - must use raw body parser
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error("[Webhook] Signature verification failed:", err);
        return res.status(400).send(`Webhook Error: ${err}`);
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      try {
        switch (event.type) {
          case "payment_intent.succeeded": {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log(
              `[Webhook] Payment succeeded for intent: ${paymentIntent.id}`
            );

            // Check if order already exists
            let order = await getOrderByPaymentIntentId(paymentIntent.id);

            if (!order) {
              // Create new order
              const metadata = paymentIntent.metadata || {};
              const userId = metadata.user_id ? parseInt(metadata.user_id) : 0;
              const email = metadata.customer_email || paymentIntent.receipt_email || "";

              const result = await createOrder({
                userId,
                stripePaymentIntentId: paymentIntent.id,
                stripeCustomerId: paymentIntent.customer as string | undefined,
                email,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: "completed",
                downloadUrl: "/manus-storage/1Commerce_GenAI_Research_Toolkit_9ec36d75.zip",
                downloadUrlExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              });
              order = await getOrderByPaymentIntentId(paymentIntent.id);
            } else if (order.status !== "completed") {
              // Update existing order to completed
              await updateOrder(order.id, {
                status: "completed",
                downloadUrl: "/manus-storage/1Commerce_GenAI_Research_Toolkit_9ec36d75.zip",
                downloadUrlExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              });
            }

            // Send owner notification
            if (order) {
              try {
                await notifyOwner({
                  title: "New Purchase: 1Commerce Gen AI Research Toolkit",
                  content: `New order received!\n\nCustomer Email: ${order.email}\nAmount: $${(order.amount / 100).toFixed(2)}\nOrder ID: ${order.id}\nPayment Intent: ${paymentIntent.id}`,
                });
              } catch (notifyErr) {
                console.error("[Webhook] Failed to send owner notification:", notifyErr);
              }
            }

            break;
          }

          case "payment_intent.payment_failed": {
            const failedIntent = event.data.object as Stripe.PaymentIntent;
            console.log(
              `[Webhook] Payment failed for intent: ${failedIntent.id}`
            );

            const order = await getOrderByPaymentIntentId(failedIntent.id);
            if (order && order.status !== "failed") {
              await updateOrder(order.id, { status: "failed" });
            }

            break;
          }

          default:
            console.log(`[Webhook] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (error) {
        console.error("[Webhook] Error processing event:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}
