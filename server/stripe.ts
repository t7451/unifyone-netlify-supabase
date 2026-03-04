import Stripe from "stripe";
import { Express, Request, Response } from "express";
import express from "express";
import { getDb } from "./db";
import { tenants } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export function registerStripeRoutes(app: Express) {
  // Stripe webhook — must use raw body BEFORE json middleware
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // Handle test events for webhook verification
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const tenantId = session.metadata?.tenant_id;
            if (tenantId) {
              const db = await getDb();
              if (db) {
                await db
                  .update(tenants)
                  .set({ stripeCustomerId: session.customer as string })
                  .where(eq(tenants.id, parseInt(tenantId)));
              }
            }
            console.log(`[Stripe] Checkout completed for tenant ${tenantId}, customer: ${session.customer}`);
            break;
          }

          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const db = await getDb();
            if (db) {
              await db
                .update(tenants)
                .set({
                  stripeSubscriptionId: sub.id,
                })
                .where(eq(tenants.stripeCustomerId, sub.customer as string));
            }
            console.log(`[Stripe] Subscription ${event.type}: ${sub.id}`);
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const db = await getDb();
            if (db) {
              await db
                .update(tenants)
                .set({ stripeSubscriptionId: null })
                .where(eq(tenants.stripeCustomerId, sub.customer as string));
            }
            console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
            break;
          }

          case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log(`[Stripe] Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid}`);
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            console.error(`[Stripe] Invoice payment failed: ${invoice.id}`);
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err) {
        console.error("[Stripe Webhook] Error processing event:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      res.json({ received: true });
    }
  );

  // Create checkout session for subscription upgrade
  app.post("/api/stripe/create-checkout", express.json(), async (req: Request, res: Response) => {
    try {
      const { priceId, tenantId, userId, userEmail, userName, origin } = req.body;

      if (!priceId || !tenantId) {
        return res.status(400).json({ error: "priceId and tenantId are required" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: userEmail,
        allow_promotion_codes: true,
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: userId?.toString(),
        metadata: {
          tenant_id: tenantId?.toString(),
          user_id: userId?.toString(),
          customer_email: userEmail || "",
          customer_name: userName || "",
        },
        success_url: `${origin || "http://localhost:3000"}/dashboard?stripe=success`,
        cancel_url: `${origin || "http://localhost:3000"}/dashboard/settings?stripe=cancelled`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Create checkout error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Create customer portal session for billing management
  app.post("/api/stripe/customer-portal", express.json(), async (req: Request, res: Response) => {
    try {
      const { customerId, origin } = req.body;

      if (!customerId) {
        return res.status(400).json({ error: "customerId is required" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin || "http://localhost:3000"}/dashboard/settings`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Customer portal error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
}

export { stripe };
