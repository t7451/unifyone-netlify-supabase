/**
 * server/billing.ts — Credit Top-Up Billing
 * Stripe credit-package checkout, webhook fulfillment,
 * and balance/history APIs backed by Supabase Cathy.
 *
 * Routes:
 *   GET  /api/billing/packages
 *   POST /api/billing/checkout
 *   POST /api/billing/webhook   ← register as separate Stripe webhook endpoint
 *   GET  /api/billing/credits
 */
import type Stripe from "stripe";
import express, { Express, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { errMsg } from "./_core/errors";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";
import { parse as parseCookieHeader } from "cookie";
import { getStripe } from "./_core/stripeClient";
import { getAppUrl } from "./_core/env";

// Mirror the stripe.ts pattern: fail gracefully when the key is absent.
const stripe = getStripe();

function getBillingDb() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export const CREDIT_PACKAGES = [
  {
    id: "credits_10",
    label: "Starter",
    priceUsd: 1000,
    credits: 10,
    bonus: 0,
    popular: false,
  },
  {
    id: "credits_25",
    label: "Basic",
    priceUsd: 2500,
    credits: 25,
    bonus: 2,
    popular: false,
  },
  {
    id: "credits_50",
    label: "Popular",
    priceUsd: 5000,
    credits: 50,
    bonus: 7,
    popular: true,
  },
  {
    id: "credits_100",
    label: "Pro",
    priceUsd: 10000,
    credits: 100,
    bonus: 20,
    popular: false,
  },
  {
    id: "credits_250",
    label: "Agency",
    priceUsd: 25000,
    credits: 250,
    bonus: 75,
    popular: false,
  },
] as const;

type PackageId = (typeof CREDIT_PACKAGES)[number]["id"];

function findPackage(id: string) {
  return CREDIT_PACKAGES.find(p => p.id === id);
}

/** Verify the session cookie and return the session's openId, or null. */
async function getSessionOpenId(req: Request): Promise<string | null> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const cookieValue = cookies[COOKIE_NAME];
  const session = await sdk.verifySession(cookieValue);
  return session?.openId ?? null;
}

export function registerBillingRoutes(app: Express) {
  // GET /api/billing/packages
  app.get("/api/billing/packages", (_req: Request, res: Response) => {
    res.json({ packages: CREDIT_PACKAGES });
  });

  // POST /api/billing/checkout
  app.post(
    "/api/billing/checkout",
    express.json(),
    async (req: Request, res: Response) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      if (!getBillingDb()) {
        return res
          .status(503)
          .json({ error: "Billing service not configured" });
      }
      try {
        const { packageId, userEmail, userId, origin } = req.body as {
          packageId: PackageId;
          userEmail?: string;
          userId?: string;
          origin?: string;
        };
        const pkg = findPackage(packageId);
        if (!pkg) return res.status(400).json({ error: "Invalid packageId" });

        // Security: Validate origin against allowlist to prevent redirect attacks.
        // getAppUrl() honors PUBLIC_APP_URL, APP_URL, URL, DEPLOY_PRIME_URL so
        // Netlify preview/staging deploys work without falling back to prod.
        const canonicalUrl = getAppUrl();
        const allowedOrigins = [
          canonicalUrl,
          "https://1commerce.online",
          "https://unifyone.netlify.app",
        ].filter(Boolean);

        const baseUrl =
          origin && allowedOrigins.includes(origin) ? origin : canonicalUrl;

        const totalCredits = pkg.credits + pkg.bonus;

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: userEmail,
          allow_promotion_codes: true,
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: pkg.priceUsd,
                product_data: {
                  name: `${totalCredits} Credits — ${pkg.label}`,
                  description:
                    pkg.bonus > 0
                      ? `${pkg.credits} base + ${pkg.bonus} bonus`
                      : `${pkg.credits} credits`,
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            purchase_type: "credits",
            package_id: pkg.id,
            credits: String(pkg.credits),
            bonus: String(pkg.bonus),
            user_id: userId || "",
          },
          success_url: `${baseUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
        });
        return res.json({ url: session.url, sessionId: session.id });
      } catch (err: unknown) {
        console.error("[Billing] checkout error:", errMsg(err));
        return res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // POST /api/billing/webhook — credit fulfillment (register separately in Stripe Dashboard)
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }
      const sig = req.headers["stripe-signature"] as string;
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET || ""
        );
      } catch (err: unknown) {
        console.error("[Billing Webhook] Sig failed:", errMsg(err));
        return res.status(400).json({ error: errMsg(err) });
      }

      if (event.type !== "checkout.session.completed")
        return res.json({ received: true, skipped: true });
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.purchase_type !== "credits")
        return res.json({ received: true, skipped: "not credits" });

      try {
        const db = getBillingDb();
        if (!db) {
          console.error("[Billing Webhook] Billing service not configured");
          return res
            .status(503)
            .json({ error: "Billing service not configured" });
        }

        const userId = session.metadata?.user_id;
        const credits = parseFloat(session.metadata?.credits || "0");
        const bonus = parseFloat(session.metadata?.bonus || "0");
        const totalCredits = credits + bonus;
        const amountUsd = (session.amount_total || 0) / 100;

        const { data: existing } = await db
          .from("stripe_events")
          .select("id")
          .eq("id", event.id)
          .maybeSingle();
        if (existing) return res.json({ received: true, duplicate: true });

        await db.from("stripe_events").insert({
          id: event.id,
          type: event.type,
          user_id: userId || null,
          payload: session,
        });

        if (userId && totalCredits > 0) {
          await db.rpc("add_credits", {
            p_user_id: userId,
            p_amount: totalCredits,
            p_type: "credit",
            p_description: `Credit purchase — ${session.metadata?.package_id}`,
            p_reference_type: "stripe_checkout",
            p_reference_id: session.id,
          });
        }

        if (userId) {
          await db.from("billing_invoices").insert({
            user_id: userId,
            stripe_session_id: session.id,
            stripe_payment_intent_id:
              (session.payment_intent as string) || null,
            stripe_customer_id: (session.customer as string) || null,
            amount_usd: amountUsd,
            credits_purchased: credits,
            credits_bonus: bonus,
            package_id: session.metadata?.package_id,
            status: "paid",
            paid_at: new Date().toISOString(),
          });
        }
        console.log(
          `[Billing] Credited ${totalCredits} credits → user ${userId}`
        );
        return res.json({ received: true, credited: totalCredits });
      } catch (err: unknown) {
        console.error("[Billing Webhook] Fulfillment error:", errMsg(err));
        return res.status(500).json({ error: "Fulfillment failed" });
      }
    }
  );

  // GET /api/billing/credits — balance or history
  app.get("/api/billing/credits", async (req: Request, res: Response) => {
    const userId = await getSessionOpenId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const db = getBillingDb();
    if (!db) {
      return res.status(503).json({ error: "Billing service not configured" });
    }

    if (req.query.view === "history") {
      const limit = Math.min(
        parseInt((req.query.limit as string) || "50"),
        100
      );
      const { data, error } = await db
        .from("credit_transactions")
        .select(
          "id, amount, balance_after, type, description, reference_type, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ transactions: data });
    }
    const { data, error } = await db
      .from("credit_wallets")
      .select("balance, lifetime_credits, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({
      balance: data?.balance ?? 0,
      lifetime_credits: data?.lifetime_credits ?? 0,
      updated_at: data?.updated_at ?? null,
    });
  });
} // end registerBillingRoutes

// Fetch-based route handler stub (for Netlify serverless; not yet implemented)
export const registerBillingFetchRoutes: null = null;
