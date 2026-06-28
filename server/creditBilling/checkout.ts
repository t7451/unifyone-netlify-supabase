/**
 * server/creditBilling/checkout.ts — Credit top-up checkout & fulfillment
 * business logic.
 *
 * Holds the credit-package catalog, Stripe Checkout session creation, and
 * the webhook fulfillment pipeline (idempotency, add_credits RPC, invoice
 * record, real-time push). Transport-agnostic — the Express and Fetch route
 * handlers in routes.ts call into this layer so the side-effect order stays
 * identical across both.
 */
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "../_core/env";
import { logger } from "../_core/logger";
import { broadcastToOpenId } from "../_core/sseManager";
import {
  findStripeEvent,
  insertStripeEvent,
  addCredits,
  insertBillingInvoice,
  fetchCreditTransactions,
  fetchCreditWallet,
} from "./repo";

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

export type PackageId = (typeof CREDIT_PACKAGES)[number]["id"];

export type CreditPackage = (typeof CREDIT_PACKAGES)[number];

export function findPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(p => p.id === id);
}

/**
 * Resolve the Stripe Checkout base URL: honor a client-supplied origin only
 * when it is on the allowlist, else fall back to the canonical app URL. This
 * prevents open-redirect attacks via the success/cancel URLs.
 */
export function resolveCheckoutBaseUrl(origin?: string): string {
  // getAppUrl() honors PUBLIC_APP_URL, APP_URL, URL, DEPLOY_PRIME_URL so
  // Netlify preview/staging deploys work without falling back to prod.
  const canonicalUrl = getAppUrl();
  const allowedOrigins = [
    canonicalUrl,
    "https://1commerce.online",
    "https://unifyone.netlify.app",
  ].filter(Boolean);

  return origin && allowedOrigins.includes(origin) ? origin : canonicalUrl;
}

/**
 * Create a Stripe Checkout session for a credit package. `openId` is the
 * verified session identity used as the crediting user — never a client-
 * supplied userId.
 */
export function createCreditCheckoutSession(
  stripe: Stripe,
  params: {
    pkg: CreditPackage;
    openId: string;
    userEmail?: string;
    baseUrl: string;
  }
) {
  const { pkg, openId, userEmail, baseUrl } = params;
  const totalCredits = pkg.credits + pkg.bonus;

  return stripe.checkout.sessions.create({
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
      user_id: openId,
    },
    success_url: `${baseUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
  });
}

/**
 * Constructs and verifies the Stripe webhook event from a credit-billing
 * webhook payload. Returns the verified event or throws on failure.
 */
export function constructBillingWebhookEvent(
  stripe: Stripe,
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_BILLING_WEBHOOK_SECRET ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      ""
  );
}

/** Outcome of fulfilling a credit-purchase checkout session. */
export type FulfillmentOutcome =
  | { kind: "duplicate" }
  | { kind: "record_failed"; error: string }
  | { kind: "credited"; totalCredits: number };

/**
 * Fulfill a paid credit-purchase checkout session: idempotency check,
 * record the event, apply credits via add_credits RPC (with real-time push),
 * and record the billing invoice. The `recordEventStrict` flag mirrors the
 * Fetch handler's behavior of surfacing a stripe_events insert error as a
 * hard failure (the Express handler ignores that insert error).
 */
export async function fulfillCreditCheckout(
  db: SupabaseClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  opts: { recordEventStrict: boolean }
): Promise<FulfillmentOutcome> {
  const userId = session.metadata?.user_id;
  const credits = parseFloat(session.metadata?.credits || "0");
  const bonus = parseFloat(session.metadata?.bonus || "0");
  const totalCredits = credits + bonus;
  const amountUsd = (session.amount_total || 0) / 100;

  const { data: existing } = await findStripeEvent(db, event.id);
  if (existing) return { kind: "duplicate" };

  const { error: insertErr } = await insertStripeEvent(db, {
    id: event.id,
    type: event.type,
    user_id: userId || null,
    payload: session,
  });
  if (opts.recordEventStrict && insertErr) {
    logger.error("[Billing Webhook] Failed to record stripe_events", {
      stripeEventId: event.id,
      error: insertErr.message,
    });
    return { kind: "record_failed", error: insertErr.message };
  }

  if (userId && totalCredits > 0) {
    const { error: creditError } = await addCredits(db, {
      userId,
      amount: totalCredits,
      type: "credit",
      description: `Credit purchase — ${session.metadata?.package_id}`,
      referenceType: "stripe_checkout",
      referenceId: session.id,
    });
    if (creditError) {
      logger.error("[Billing Webhook] add_credits RPC failed", {
        error: creditError.message,
        userId,
        totalCredits,
        stripeEventId: event.id,
      });
    } else {
      // Push credit_balance event so BillingSuccess stops polling
      broadcastToOpenId(userId, "credit_balance", {
        added: totalCredits,
        packageId: session.metadata?.package_id,
      });
    }
  } else if (!userId) {
    logger.warn(
      "[Billing Webhook] user_id missing from session metadata — credits not applied",
      {
        stripeEventId: event.id,
        stripeSessionId: session.id,
      }
    );
  }

  if (userId) {
    await insertBillingInvoice(db, {
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: (session.payment_intent as string) || null,
      stripe_customer_id: (session.customer as string) || null,
      amount_usd: amountUsd,
      credits_purchased: credits,
      credits_bonus: bonus,
      package_id: session.metadata?.package_id,
      status: "paid",
      paid_at: new Date().toISOString(),
    });
  }
  logger.info("[Billing] Credits applied", {
    userId,
    totalCredits,
    stripeEventId: event.id,
    packageId: session.metadata?.package_id,
  });
  return { kind: "credited", totalCredits };
}

/** Fetch recent credit transactions (history view). */
export function getCreditHistory(
  db: SupabaseClient,
  userId: string,
  limit: number
) {
  return fetchCreditTransactions(db, userId, limit);
}

/** Fetch the user's credit wallet balance summary. */
export function getCreditBalance(db: SupabaseClient, userId: string) {
  return fetchCreditWallet(db, userId);
}
