import Stripe from "stripe";
import { Express, Request, Response } from "express";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "./db";
import { tenants, plans, themeInstalls, themes } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { capi } from "./meta/capi";
import { getAppUrl } from "./_core/env";

// Supabase admin client for subscription/credit sync (service role — no RLS)
function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia" as any,
    })
  : null;

// Map Stripe subscription status → our enum
function mapSubStatus(
  stripeStatus: Stripe.Subscription.Status
): "active" | "past_due" | "cancelled" | "trialing" | "none" {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "paused":
      return "cancelled";
    default:
      return "none";
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
      p =>
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

  // Also sync to Supabase stripe_subscriptions table
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const customerId = sub.customer as string;
    // Look up user_id from metadata or tenant's owner
    const userId =
      sub.metadata?.user_id || sub.metadata?.tenant_id || customerId;
    await supabase.from("stripe_subscriptions").upsert([
      {
        id: sub.id,
        user_id: userId,
        stripe_customer_id: customerId,
        status: sub.status,
        metadata: sub.metadata,
        price_id: priceId || null,
        quantity: sub.items.data[0]?.quantity ?? 1,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_start: subAny.current_period_start
          ? new Date(subAny.current_period_start * 1000).toISOString()
          : new Date().toISOString(),
        current_period_end: periodEnd?.toISOString() || new Date().toISOString(),
        created: new Date(sub.created * 1000).toISOString(),
        ended_at: sub.ended_at
          ? new Date(sub.ended_at * 1000).toISOString()
          : null,
        cancel_at: sub.cancel_at
          ? new Date(sub.cancel_at * 1000).toISOString()
          : null,
        canceled_at: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null,
        trial_start: sub.trial_start
          ? new Date(sub.trial_start * 1000).toISOString()
          : null,
        trial_end: sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null,
      },
    ]);
  }

  console.log(
    `[Stripe] Subscription synced: ${sub.id} → status=${status}, periodEnd=${periodEnd?.toISOString()}`
  );
}

// Sync Stripe product to Supabase
async function syncProduct(product: Stripe.Product) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("stripe_products").upsert([
    {
      id: product.id,
      active: product.active,
      name: product.name,
      description: product.description,
      image: product.images?.[0] ?? null,
      metadata: product.metadata,
      updated_at: new Date().toISOString(),
    },
  ]);
  console.log(`[Stripe] Product synced: ${product.id} (${product.name})`);
}

// Sync Stripe price to Supabase
async function syncPrice(price: Stripe.Price) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("stripe_prices").upsert([
    {
      id: price.id,
      product_id: typeof price.product === "string" ? price.product : "",
      active: price.active,
      currency: price.currency,
      type: price.type,
      unit_amount: price.unit_amount,
      interval: price.recurring?.interval ?? null,
      interval_count: price.recurring?.interval_count ?? null,
      trial_period_days: price.recurring?.trial_period_days ?? 0,
      updated_at: new Date().toISOString(),
    },
  ]);
  console.log(`[Stripe] Price synced: ${price.id}`);
}

// Grant monthly credits on successful invoice payment
async function grantSubscriptionCredits(
  invoice: Stripe.Invoice,
  sub: Stripe.Subscription
) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !stripe) return;

  const priceId = sub.items.data[0]?.price.id;
  if (!priceId) return;

  // Look up tier credits from subscription_tiers table
  const { data: tier } = await supabase
    .from("subscription_tiers")
    .select("monthly_credits, name")
    .eq("stripe_price_id", priceId)
    .single();

  if (!tier) {
    console.log(
      `[Stripe] No subscription tier found for price ${priceId}, skipping credit grant`
    );
    return;
  }

  // Resolve user_id from subscription metadata or customer lookup
  const userId =
    sub.metadata?.user_id || sub.metadata?.tenant_id || "";
  if (!userId) {
    console.warn(
      `[Stripe] No user_id in subscription metadata for ${sub.id}, skipping credit grant`
    );
    return;
  }

  // Grant credits idempotently (keyed by invoice ID)
  const { data: newBalance, error } = await supabase.rpc(
    "grant_subscription_credits",
    {
      p_user_id: userId,
      p_amount: tier.monthly_credits,
      p_description: `Monthly ${tier.monthly_credits} credits (${tier.name})`,
      p_idempotency_key: `sub_grant_${invoice.id}`,
      p_metadata: { stripe_invoice_id: invoice.id, tier: tier.name },
    }
  );

  if (error) {
    console.error(`[Stripe] Credit grant failed:`, error.message);
  } else {
    console.log(
      `[Stripe] Granted ${tier.monthly_credits} credits to user ${userId}, new balance: ${newBalance}`
    );
  }
}

export function registerStripeRoutes(app: Express) {
  // Stripe webhook — must use raw body BEFORE json middleware
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      if (!stripe) {
        console.error("[Stripe Webhook] STRIPE_SECRET_KEY not configured");
        return res.status(503).json({ error: "Stripe not configured" });
      }

      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error(
          "[Stripe Webhook] Signature verification failed:",
          err.message
        );
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // Handle test events for webhook verification
      if (event.id.startsWith("evt_test_")) {
        console.log(
          "[Stripe Webhook] Test event detected, returning verification response"
        );
        return res.json({ verified: true });
      }

      console.log(
        `[Stripe Webhook] Received event: ${event.type} (${event.id})`
      );

      try {
        switch (event.type) {
          // ── Product & Price sync to Supabase ────────────────────────────
          case "product.created":
          case "product.updated": {
            const product = event.data.object as Stripe.Product;
            await syncProduct(product);
            break;
          }
          case "price.created":
          case "price.updated": {
            const price = event.data.object as Stripe.Price;
            await syncPrice(price);
            break;
          }

          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const tenantId = session.metadata?.tenant_id;
            const customerId = session.customer as string;

            // ── Theme purchase fulfillment ─────────────────────────────────
            if (
              session.metadata?.purchase_type === "theme" &&
              session.metadata?.theme_id &&
              session.metadata?.user_id
            ) {
              const themeId = parseInt(session.metadata.theme_id);
              const userId = parseInt(session.metadata.user_id);
              const amountPaid = session.amount_total
                ? (session.amount_total / 100).toFixed(2)
                : "0.00";
              const db = await getDb();
              if (db) {
                const existing = await db
                  .select()
                  .from(themeInstalls)
                  .where(
                    and(
                      eq(themeInstalls.themeId, themeId),
                      eq(themeInstalls.userId, userId)
                    )
                  )
                  .limit(1);
                if (!existing.length) {
                  await db.insert(themeInstalls).values({
                    themeId,
                    userId,
                    amountPaid,
                    stripePaymentIntentId:
                      (session.payment_intent as string) ?? null,
                  });
                  await db
                    .update(themes)
                    .set({ installCount: sql`${themes.installCount} + 1` })
                    .where(eq(themes.id, themeId));
                  console.log(
                    `[Stripe] Theme ${themeId} purchased by user ${userId}, amount: $${amountPaid}`
                  );

                  // Fire CAPI Purchase event for theme purchase
                  const themeEmail =
                    session.customer_details?.email ||
                    session.metadata?.customer_email ||
                    "";
                  capi
                    .purchase(
                      `stripe_theme_${session.id}`,
                      { email: themeEmail },
                      `${getAppUrl()}/checkout`,
                      parseFloat(amountPaid),
                      (session.currency || "USD").toUpperCase()
                    )
                    .catch((err: Error) =>
                      console.error(
                        "[CAPI] Purchase event failed:",
                        err.message
                      )
                    );
                }
              }
              break;
            }

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

            // Fire CAPI Purchase event for subscription checkout
            const sessionAmount = session.amount_total
              ? session.amount_total / 100
              : 0;
            const sessionEmail =
              session.customer_details?.email ||
              session.metadata?.customer_email ||
              "";
            if (sessionAmount > 0 && sessionEmail) {
              capi
                .purchase(
                  `stripe_sub_${session.id}`,
                  { email: sessionEmail },
                  `${getAppUrl()}/checkout`,
                  sessionAmount,
                  (session.currency || "USD").toUpperCase()
                )
                .catch((err: Error) =>
                  console.error("[CAPI] Purchase event failed:", err.message)
                );
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
            // Also update Supabase subscription record
            const supabase = getSupabaseAdmin();
            if (supabase) {
              await supabase
                .from("stripe_subscriptions")
                .update({
                  status: "canceled",
                  ended_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", sub.id);
            }
            console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
            break;
          }

          case "invoice.payment_succeeded":
          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            // Re-sync subscription to refresh period end and grant credits
            const subId = (invoice as any).subscription as string | undefined;
            if (subId) {
              const sub = await stripe.subscriptions.retrieve(subId);
              await syncSubscription(sub);
              // Grant monthly credits for the subscription tier
              await grantSubscriptionCredits(invoice, sub);
            }
            console.log(
              `[Stripe] Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid}`
            );
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const db = await getDb();
            if (db && invoice.customer) {
              await db
                .update(tenants)
                .set({ subscriptionStatus: "past_due" })
                .where(
                  eq(tenants.stripeCustomerId, invoice.customer as string)
                );
            }
            console.error(`[Stripe] Invoice payment failed: ${invoice.id}`);
            break;
          }

          case "customer.subscription.trial_will_end": {
            const sub = event.data.object as Stripe.Subscription;
            console.log(
              `[Stripe] Trial ending soon for subscription: ${sub.id}`
            );
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
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const {
          priceId,
          tenantId,
          userId,
          userEmail,
          userName,
          origin,
          amount,
          description,
        } = req.body;

        const baseUrl = origin || "http://localhost:3000";

        // If a specific priceId is provided, use subscription mode
        if (priceId) {
          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            customer_email: userEmail,
            allow_promotion_codes: true,
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
              metadata: {
                tenant_id: tenantId?.toString() || "",
                user_id: userId?.toString() || "",
              },
            },
            client_reference_id: userId?.toString(),
            metadata: {
              tenant_id: tenantId?.toString() || "",
              user_id: userId?.toString() || "",
              customer_email: userEmail || "",
              customer_name: userName || "",
            },
            automatic_tax: { enabled: true },
            success_url: `${baseUrl}/dashboard?stripe=success`,
            cancel_url: `${baseUrl}/checkout?stripe=cancelled`,
          });
          return res.json({ url: session.url });
        }

        // Otherwise, create a one-time payment session
        if (!amount || isNaN(parseFloat(amount))) {
          return res
            .status(400)
            .json({ error: "Either priceId or amount is required" });
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

  // Create embedded checkout session (returns clientSecret for iframe checkout)
  app.post(
    "/api/stripe/create-embedded-checkout",
    express.json(),
    async (req: Request, res: Response) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const { priceId, userEmail, userId, tenantId } = req.body;
        if (!priceId) {
          return res.status(400).json({ error: "priceId is required" });
        }
        const origin =
          req.headers.origin || getAppUrl() || "http://localhost:3000";
        const session = await stripe.checkout.sessions.create({
          ui_mode: "embedded",
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          subscription_data: {
            metadata: {
              tenant_id: tenantId?.toString() || "",
              user_id: userId?.toString() || "",
            },
          },
          customer_email: userEmail,
          automatic_tax: { enabled: true },
          allow_promotion_codes: true,
          return_url: `${origin}/dashboard?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
        });
        res.json({ clientSecret: session.client_secret });
      } catch (err: any) {
        console.error(
          "[Stripe] Create embedded checkout error:",
          err.message
        );
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Create customer portal session for billing management
  app.post(
    "/api/stripe/customer-portal",
    express.json(),
    async (req: Request, res: Response) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
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
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const sub = await stripe.subscriptions.retrieve(
          req.params.subscriptionId,
          {
            expand: ["latest_invoice", "items.data.price.product"],
          }
        );
        res.json(sub);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Change subscription plan (upgrade/downgrade with proration)
  app.post(
    "/api/stripe/change-plan",
    express.json(),
    async (req: Request, res: Response) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const { subscriptionId, newPriceId } = req.body;
        if (!subscriptionId || !newPriceId) {
          return res
            .status(400)
            .json({ error: "subscriptionId and newPriceId are required" });
        }
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const updated = await stripe.subscriptions.update(subscriptionId, {
          items: [{ id: sub.items.data[0].id, price: newPriceId }],
          proration_behavior: "create_prorations",
        });
        res.json(updated);
      } catch (err: any) {
        console.error("[Stripe] Change plan error:", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // Cancel subscription at period end
  app.post(
    "/api/stripe/cancel-subscription",
    express.json(),
    async (req: Request, res: Response) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const { subscriptionId } = req.body;
        if (!subscriptionId) {
          return res
            .status(400)
            .json({ error: "subscriptionId is required" });
        }
        const updated = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        res.json(updated);
      } catch (err: any) {
        console.error("[Stripe] Cancel subscription error:", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // List invoices for a Stripe customer
  app.get(
    "/api/stripe/invoices/:customerId",
    async (req: Request, res: Response) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
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
