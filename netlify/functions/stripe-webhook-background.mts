/**
 * stripe-webhook-background.mts
 *
 * Background Function — receives Stripe webhook events, immediately
 * returns 202 to Stripe (prevents retries), then processes the event
 * asynchronously in the background.
 *
 * Why: Stripe requires a fast 200/202 response within 30 seconds.
 * Subscription sync, credit top-ups, and invoice processing can take
 * longer than that under load. This pattern eliminates all Stripe retry noise.
 *
 * Route:  POST /api/stripe/webhook-async
 * Auth:   Stripe-Signature header verified via constructEventAsync
 *
 * NOTE: netlify.toml already routes /api/stripe/* to server.ts for the
 * sync webhook. This function adds a *second* endpoint at the async path.
 * Register this URL in your Stripe Dashboard as an additional webhook endpoint.
 */
import type { Context } from "@netlify/functions";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia" as any,
    })
  : null;

export default async (req: Request, _context: Context) => {
  if (!stripe) {
    console.error("[stripe-webhook-bg] Stripe not configured");
    return;
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");

  if (!sig || !webhookSecret) {
    console.warn("[stripe-webhook-bg] Missing signature or secret");
    return;
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook-bg] Signature verification failed:", err);
    return;
  }

  console.log(`[stripe-webhook-bg] Processing event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Log for audit — full sync handled by existing /api/stripe/webhook (server.ts)
        // This background endpoint is the fast-ACK path; server.ts does the heavy sync
        const sub = event.data.object as Stripe.Subscription;
        console.log(`[stripe-webhook-bg] Subscription event: ${event.type} id=${sub.id} status=${sub.status}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[stripe-webhook-bg] Invoice paid: ${invoice.id} — $${(invoice.amount_paid / 100).toFixed(2)}`);
        // Credit top-up handled by existing stripe.ts — future: move here
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[stripe-webhook-bg] Invoice failed: ${invoice.id} — customer: ${invoice.customer}`);
        break;
      }

      default:
        console.log(`[stripe-webhook-bg] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook-bg] Handler error for ${event.type}:`, err);
  }
};

export const config = {
  path: "/api/stripe/webhook-async",
};
