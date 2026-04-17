/**
 * golf-order.mts — Create a golf studio order and Stripe PaymentIntent.
 *
 * Route: POST /api/golf/order   body: { configId, impactClickId? }
 *
 * Security: pricing is computed server-side. The client is display-only.
 * Order rows are inserted with the service-role client — there is no
 * user INSERT policy on golf_orders by design.
 */
import type { Config, Context } from "@netlify/functions";
import Stripe from "stripe";
import { requireUser, serviceClient } from "./_lib/supabase.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia" as any,
    })
  : null;

// Server-side pricing. Mirror on frontend for display; enforce here.
const PRICING = {
  base: 24900, // $249 base club
  leather: {
    standard: 0,
    premium: 4000,
    exotic: 9000,
  } as Record<string, number>,
  engraving: 1500,
  logo: 2500,
} as const;

function priceOrder(cfg: any): { items: any[]; subtotal: number } {
  const items: any[] = [
    { sku: "club-base", label: "Custom Club", cents: PRICING.base },
  ];
  const leather = PRICING.leather[cfg.leather_finish] ?? 0;
  if (leather) {
    items.push({
      sku: `leather-${cfg.leather_finish}`,
      label: `${cfg.leather_finish} leather`,
      cents: leather,
    });
  }
  if (cfg.engraving_text) {
    items.push({
      sku: "engraving",
      label: `Engraving: "${cfg.engraving_text}"`,
      cents: PRICING.engraving,
    });
  }
  if (cfg.logo_path) {
    items.push({ sku: "logo-badge", label: "Logo badge", cents: PRICING.logo });
  }
  const subtotal = items.reduce((s, i) => s + i.cents, 0);
  return { items, subtotal };
}

export default async (req: Request, _ctx: Context) => {
  if (req.method !== "POST")
    return new Response("method not allowed", { status: 405 });
  if (!stripe) {
    console.error("[golf-order] Stripe not configured");
    return new Response("payments unavailable", { status: 503 });
  }

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;
  const { user, sb } = auth;

  const { configId, impactClickId } = await req.json();
  if (!configId) return new Response("configId required", { status: 400 });

  const { data: cfg, error: cfgErr } = await sb
    .from("golf_configs")
    .select("*")
    .eq("id", configId)
    .single();
  if (cfgErr || !cfg) return new Response("config not found", { status: 404 });

  const { items, subtotal } = priceOrder(cfg);
  const total = subtotal; // Stripe Tax deferred to phase 2

  const svc = serviceClient();
  const { data: order, error: orderErr } = await svc
    .from("golf_orders")
    .insert({
      user_id: user.id,
      config_id: configId,
      line_items: items,
      subtotal_cents: subtotal,
      total_cents: total,
      status: "pending",
      impact_click_id: impactClickId ?? null,
    })
    .select("id")
    .single();
  if (orderErr) return new Response(orderErr.message, { status: 500 });

  const pi = await stripe.paymentIntents.create({
    amount: total,
    currency: "usd",
    metadata: { order_id: order.id, user_id: user.id, source: "golf-studio" },
    automatic_payment_methods: { enabled: true },
  });

  await svc
    .from("golf_orders")
    .update({ stripe_payment_intent_id: pi.id })
    .eq("id", order.id);

  return Response.json({
    orderId: order.id,
    clientSecret: pi.client_secret,
    total,
    items,
  });
};

export const config: Config = { path: "/api/golf/order" };
