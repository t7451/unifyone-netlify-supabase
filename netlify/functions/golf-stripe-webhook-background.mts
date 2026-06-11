/**
 * golf-stripe-webhook-background.mts
 *
 * Background Function — separate Stripe webhook endpoint for the golf
 * studio, so its failures don't cross-contaminate the platform webhook.
 *
 * Route:  POST /api/golf/stripe-webhook
 * Auth:   Stripe-Signature verified via constructEventAsync
 * Secret: STRIPE_GOLF_WEBHOOK_SECRET  (distinct from the platform one)
 */
import type { Config, Context } from "@netlify/functions";
import Stripe from "stripe";
import { serviceClient } from "./_lib/supabase.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover" as any,
    })
  : null;

export default async (req: Request, _ctx: Context) => {
  if (!stripe) {
    console.error("[golf-webhook-bg] Stripe not configured");
    return new Response("stripe not configured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      process.env.STRIPE_GOLF_WEBHOOK_SECRET!
    );
  } catch (e: any) {
    console.error("[golf-webhook-bg] bad signature:", e.message);
    return new Response(`bad sig: ${e.message}`, { status: 400 });
  }

  const svc = serviceClient();

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    if (pi.metadata?.source !== "golf-studio")
      return new Response("ignored", { status: 200 });
    const { error } = await svc
      .from("golf_orders")
      .update({ status: "paid" })
      .eq("stripe_payment_intent_id", pi.id);
    if (error) console.error("[golf-webhook-bg] update failed:", error.message);
    // TODO(phase-2): enqueue GLB generation on GPU worker
    // TODO(phase-2): forward conversion to Impact.com if impact_click_id present
    return new Response("ok", { status: 200 });
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    if (pi.metadata?.source !== "golf-studio")
      return new Response("ignored", { status: 200 });
    await svc
      .from("golf_orders")
      .update({ status: "failed" })
      .eq("stripe_payment_intent_id", pi.id);
    return new Response("ok", { status: 200 });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const piId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (piId) {
      await svc
        .from("golf_orders")
        .update({ status: "refunded" })
        .eq("stripe_payment_intent_id", piId);
    }
    return new Response("ok", { status: 200 });
  }

  return new Response("ok", { status: 200 });
};

export const config: Config = { path: "/api/golf/stripe-webhook" };
