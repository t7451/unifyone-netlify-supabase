import Stripe from "stripe";
import { Express, Request, Response } from "express";
import express from "express";
import { getDb } from "./db";
import { tenants, plans } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

// Map Stripe subscription status → our enum
function mapSubStatus(
  stripeStatus: Stripe.Subscription.Status
): "active" | "past_due" | "cancelled" | "trialing" | "none" {
  switch (stripeStatus) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due": return "past_due";
    case "canceled":
    case "unpaid":
    case "paused":
      return "cancelled";
    default: return "none";
  }
}

// Sync subscription data to tenant row
async function syncSubscription(sub: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  const status = mapSubStatus(sub.status);
  const subAny = sub as any;
  const periodEnd = subAny.current_period_end
    ? new Date(subAny.current_period_end * 1000)
    : null;

  // Try to find matching plan by Stripe price ID
  const priceId = sub.items.data[0]?.price?.id;
  let planId: number | undefined;
  if (priceId) {
    const allPlans = await db.select().from(plans);
    const matched = allPlans.find(
      (p) =>
        (p.stripePriceIdMonthly && p.stripePriceIdMonthly === priceId) ||
        (p.stripePriceIdYearly && p.stripePriceIdYearly === priceId)
    );
    if (matched) planId = matched.id;
  }

  await db
    .update(tenants)
    .set({
      stripeSubscriptionId: sub.id,
      subscriptionStatus: status,
      subscriptionCurrentPeriodEnd: periodEnd,
      ...(planId ? { planId } : {}),
    })
    .where(eq(tenants.stripeCustomerId, sub.customer as string));

  console.log(
    `[Stripe] Subscription synced: ${sub.id} → status=${status}, periodEnd=${periodEnd?.toISOString()}`
  );
}

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
            const customerId = session.customer as string;

            if (tenantId && customerId) {
              const db = await getDb();
              if (db) {
                await db
                  .update(tenants)
                  .set({
                    stripeCustomerId: customerId,
                    subscriptionStatus: "active",
                  })
                  .where(eq(tenants.id, parseInt(tenantId)));
              }
            }

            // If subscription was created, sync it
            if (session.subscription) {
              const sub = await stripe.subscriptions.retrieve(
                session.subscription as string
              );
              await syncSubscription(sub);
            }

            console.log(
              `[Stripe] Checkout completed for tenant ${tenantId}, customer: ${customerId}`
            );
            break;
          }

          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            await syncSubscription(sub);
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const db = await getDb();
            if (db) {
              await db
                .update(tenants)
                .set({
                  stripeSubscriptionId: null,
                  subscriptionStatus: "cancelled",
                  subscriptionCurrentPeriodEnd: null,
                })
                .where(eq(tenants.stripeCustomerId, sub.customer as string));
            }
            console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
            break;
          }

          case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            // Re-sync subscription to refresh period end
            const subId = (invoice as any).subscription as string | undefined;
            if (subId) {
              const sub = await stripe.subscriptions.retrieve(subId);
              await syncSubscription(sub);
            }
            console.log(`[Stripe] Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid}`);
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const db = await getDb();
            if (db && invoice.customer) {
              await db
                .update(tenants)
                .set({ subscriptionStatus: "past_due" })
                .where(eq(tenants.stripeCustomerId, invoice.customer as string));
            }
            console.error(`[Stripe] Invoice payment failed: ${invoice.id}`);
            break;
          }

          case "customer.subscription.trial_will_end": {
            const sub = event.data.object as Stripe.Subscription;
            console.log(`[Stripe] Trial ending soon for subscription: ${sub.id}`);
            // Could trigger owner notification here
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
  app.post(
    "/api/stripe/create-checkout",
    express.json(),
    async (req: Request, res: Response) => {
      try {
        const { priceId, tenantId, userId, userEmail, userName, origin, amount, description } =
          req.body;

        const baseUrl = origin || "http://localhost:3000";

        // If a specific priceId is provided, use subscription mode
        if (priceId) {
          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            customer_email: userEmail,
            allow_promotion_codes: true,
            line_items: [{ price: priceId, quantity: 1 }],
            client_reference_id: userId?.toString(),
            metadata: {
              tenant_id: tenantId?.toString() || "",
              user_id: userId?.toString() || "",
              customer_email: userEmail || "",
              customer_name: userName || "",
            },
            success_url: `${baseUrl}/dashboard?stripe=success`,
            cancel_url: `${baseUrl}/checkout?stripe=cancelled`,
          });
          return res.json({ url: session.url });
        }

        // Otherwise, create a one-time payment session
        if (!amount || isNaN(parseFloat(amount))) {
          return res.status(400).json({ error: "Either priceId or amount is required" });
        }

        const amountCents = Math.round(parseFloat(amount) * 100);
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: userEmail,
          allow_promotion_codes: true,
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: amountCents,
                product_data: {
                  name: description || "UnifyOne Order",
                  description: "UnifyOne Commerce Platform",
                },
              },
              quantity: 1,
            },
          ],
          client_reference_id: userId?.toString(),
          metadata: {
            tenant_id: tenantId?.toString() || "",
            user_id: userId?.toString() || "",
            customer_email: userEmail || "",
            customer_name: userName || "",
          },
          success_url: `${baseUrl}/dashboard?stripe=success`,
          cancel_url: `${baseUrl}/checkout?stripe=cancelled`,
        });

        res.json({ url: session.url });
      } catch (err: any) {
        console.error("[Stripe] Create checkout error:", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Create customer portal session for billing management
  app.post(
    "/api/stripe/customer-portal",
    express.json(),
    async (req: Request, res: Response) => {
      try {
        const { customerId, origin } = req.body;

        if (!customerId) {
          return res.status(400).json({ error: "customerId is required" });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${origin || "http://localhost:3000"}/settings`,
        });

        res.json({ url: session.url });
      } catch (err: any) {
        console.error("[Stripe] Customer portal error:", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Get subscription details for a tenant
  app.get(
    "/api/stripe/subscription/:subscriptionId",
    async (req: Request, res: Response) => {
      try {
        const sub = await stripe.subscriptions.retrieve(req.params.subscriptionId, {
          expand: ["latest_invoice", "items.data.price.product"],
        });
        res.json(sub);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  // List invoices for a Stripe customer
  app.get(
    "/api/stripe/invoices/:customerId",
    async (req: Request, res: Response) => {
      try {
        const invoices = await stripe.invoices.list({
          customer: req.params.customerId,
          limit: 20,
        });
        res.json(invoices.data);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    }
  );
}

export { stripe };
