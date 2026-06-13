import Stripe from "stripe";
import type {
  Express,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import express from "express";
import {
  getDb,
  getTenantByStripeCustomerId,
  getTenantById,
  getTenantsByOwner,
} from "./db";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";
import {
  tenants,
  plans,
  themeInstalls,
  themes,
  stripeWebhookEvents,
  users,
  kaiCreditPurchases,
  kaiCreditLedger,
} from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { capi } from "./meta/capi";
import { getAppUrl } from "./_core/env";
import { flushAllOverages, flushUserOverages } from "./creditMeter";
import { errMsg } from "./_core/errors";
import { getStripe } from "./_core/stripeClient";
import { PLAN_CATALOG, PLAN_CATALOG_BY_SLUG } from "../shared/pricing";
import {
  buildKaiCreditFulfillmentPlan,
  parseKaiCreditCheckoutMetadata,
} from "./lib/kaiCredits";
import { normalizeCheckoutOrigin } from "./paymentFallback";
import { fireAutomations } from "./lib/automationDispatch";
// Supabase admin client for subscription/credit sync (secret key — no RLS).
// Supabase is the billing/credit layer only; core data lives on Neon.
import { getSupabaseAdmin } from "./_core/supabaseAdmin";

const stripe = getStripe();

// PATCHED:LINK_TENANT_FROM_METADATA
// ─────────────────────────────────────────────────────────────────────────────
// Webhook tenant-linking helper.
//
// Background: when a brand-new subscriber completes Stripe Checkout, the
// returned customer_id has never been seen before — no tenant row has it on
// `stripeCustomerId`. The pre-existing path called `syncSubscription()`
// directly, which UPDATEs WHERE stripeCustomerId = ... and silently affects
// zero rows. Result: paid users got no entitlements.
//
// Fix: when no tenant matches by customer_id, fall back to the tenant_id we
// stamped into the Checkout Session's metadata at create time, write the
// stripeCustomerId onto that tenant, then return it so syncSubscription has
// something to update.
//
// Security: we accept session.metadata.tenant_id only because the
// /api/stripe/create-checkout endpoint is now authenticated and overrides
// any client-supplied tenant_id with the JWT's tenant_id. Don't relax this
// without keeping the server-side override.
async function resolveTenantForCheckout(
  session: Stripe.Checkout.Session
): Promise<{ id: number } | undefined> {
  const customerId = (session.customer as string) || "";
  if (customerId) {
    const byCustomer = await getTenantByStripeCustomerId(customerId);
    if (byCustomer) return byCustomer;
  }
  const tenantIdRaw = session.metadata?.tenant_id;
  const tenantId = tenantIdRaw ? parseInt(tenantIdRaw, 10) : NaN;
  if (!Number.isFinite(tenantId)) return undefined;
  const t = await getTenantById(tenantId);
  if (!t) return undefined;
  if (customerId && t.stripeCustomerId !== customerId) {
    const db = await getDb();
    if (db) {
      await db
        .update(tenants)
        .set({ stripeCustomerId: customerId })
        .where(eq(tenants.id, t.id));
      console.log(
        `[Stripe] Linked tenant ${t.id} → customer ${customerId} via metadata.tenant_id`
      );
    }
  }
  return { id: t.id };
}

// Same idea for subscription events — `customer.subscription.created` may
// arrive before checkout.session.completed in rare orderings, or be replayed.
async function resolveTenantForSubscription(
  sub: Stripe.Subscription
): Promise<{ id: number } | undefined> {
  const customerId = (sub.customer as string) || "";
  if (customerId) {
    const byCustomer = await getTenantByStripeCustomerId(customerId);
    if (byCustomer) return byCustomer;
  }
  const tenantIdRaw = sub.metadata?.tenant_id;
  const tenantId = tenantIdRaw ? parseInt(tenantIdRaw, 10) : NaN;
  if (Number.isFinite(tenantId)) {
    const t = await getTenantById(tenantId);
    if (t) {
      if (customerId && t.stripeCustomerId !== customerId) {
        const db = await getDb();
        if (db) {
          await db
            .update(tenants)
            .set({ stripeCustomerId: customerId })
            .where(eq(tenants.id, t.id));
        }
      }
      return { id: t.id };
    }
  }
  // Last resort: user_id metadata → tenant via owner
  const userIdRaw = sub.metadata?.user_id;
  const userId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
  if (Number.isFinite(userId)) {
    const owned = await getTenantsByOwner(userId);
    const t = owned[0];
    if (t) {
      if (customerId && t.stripeCustomerId !== customerId) {
        const db = await getDb();
        if (db) {
          await db
            .update(tenants)
            .set({ stripeCustomerId: customerId })
            .where(eq(tenants.id, t.id));
        }
      }
      return { id: t.id };
    }
  }
  return undefined;
}

// JWT cookie extractor for the Fetch handler — mirrors the tRPC ctx logic.
// Reads the `app_session_id` cookie, verifies via sdk.verifySession (jose
// HS256), and looks up the user by openId. Returns numeric userId/tenantId
// for stamping into Stripe Checkout Session metadata so the webhook can
// resolve the right tenant later.
function cookieHeaderFromRequestLike(
  req:
    | Request
    | { headers: Headers | Record<string, string | string[] | undefined> }
): string {
  const rawHeaders = req.headers;
  if (rawHeaders instanceof Headers) return rawHeaders.get("cookie") || "";
  const cookieHeader = rawHeaders.cookie;
  return Array.isArray(cookieHeader)
    ? cookieHeader.join("; ")
    : cookieHeader || "";
}

async function authedUserFromRequest(
  req:
    | Request
    | { headers: Headers | Record<string, string | string[] | undefined> }
): Promise<{ userId: number; tenantId: number | null; email: string } | null> {
  try {
    const cookieHeader = cookieHeaderFromRequestLike(req);
    const m = cookieHeader.match(
      new RegExp("(?:^|;\\s*)" + COOKIE_NAME + "=([^;]+)")
    );
    if (!m) return null;
    const token = decodeURIComponent(m[1]);
    const session = await sdk.verifySession(token);
    if (!session) return null;
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.openId, session.openId))
      .limit(1);
    const u = rows[0];
    if (!u) return null;
    return {
      userId: u.id,
      tenantId: u.tenantId ?? null,
      email: u.email ?? session.email ?? "",
    };
  } catch (err: unknown) {
    console.error("[Stripe] authedUserFromRequest:", errMsg(err));
    return null;
  }
}

async function ensureCustomerBelongsToAuthenticatedTenant(
  customerId: string,
  authed: { userId: number; tenantId: number | null; email: string }
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!authed.tenantId) {
    return { ok: false, status: 403, error: "No active tenant" };
  }
  const tenant = await getTenantById(authed.tenantId);
  if (!tenant?.stripeCustomerId || tenant.stripeCustomerId !== customerId) {
    return { ok: false, status: 403, error: "Stripe customer mismatch" };
  }
  return { ok: true };
}

// Persist a webhook event for forensic + idempotency.
async function recordWebhookEvent(
  event: Stripe.Event,
  status: "received" | "processed" | "failed",
  errorMessage?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(stripeWebhookEvents)
      .values({
        eventId: event.id,
        eventType: event.type,
        status,
        errorMessage: errorMessage ?? null,
        livemode: event.livemode,
        payload: event as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: stripeWebhookEvents.eventId,
        set: {
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        },
      });
  } catch (err: unknown) {
    console.error("[Stripe Webhook] Failed to record event:", errMsg(err));
  }
}

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

// Fire `subscription.activated` / `subscription.cancelled` automation events.
// Best-effort: never blocks a webhook ack. Looks up the tenant by Stripe
// customer id so the dispatcher can scope to that tenant's n8n/Zapier hooks.
async function fireSubscriptionAutomation(
  sub: Stripe.Subscription,
  event: "subscription.activated" | "subscription.cancelled"
): Promise<void> {
  try {
    const tenant = await getTenantByStripeCustomerId(sub.customer as string);
    if (!tenant) return;
    await fireAutomations(tenant.id, event, {
      subscriptionId: sub.id,
      stripeCustomerId: sub.customer as string,
      status: sub.status,
      priceId: sub.items.data[0]?.price?.id ?? null,
    });
  } catch (err) {
    console.warn(
      `[Stripe] fireSubscriptionAutomation(${event}) failed:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

// Sync subscription data to tenant row
async function syncSubscription(sub: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  const status = mapSubStatus(sub.status);
  // current_period_end exists on the subscription object at runtime but
  // may not be in the type definition for all API versions — cast via unknown.
  const subRecord = sub as unknown as Record<string, unknown>;
  const periodEnd =
    typeof subRecord.current_period_end === "number"
      ? new Date(subRecord.current_period_end * 1000)
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

  const updated = await db
    .update(tenants)
    .set({
      stripeSubscriptionId: sub.id,
      subscriptionStatus: status,
      subscriptionCurrentPeriodEnd: periodEnd,
      ...(planId ? { planId } : {}),
    })
    .where(eq(tenants.stripeCustomerId, sub.customer as string))
    .returning({ id: tenants.id });

  // If no tenant was matched by stripeCustomerId (new subscriber whose checkout
  // event was missed or arrived out of order), try to link via metadata.
  if (updated.length === 0) {
    try {
      const tenant = await resolveTenantForSubscription(sub);
      if (tenant) {
        await db
          .update(tenants)
          .set({
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            subscriptionStatus: status,
            subscriptionCurrentPeriodEnd: periodEnd,
            ...(planId ? { planId } : {}),
          })
          .where(eq(tenants.id, tenant.id));
        console.log(
          `[Stripe] syncSubscription: linked tenant ${tenant.id} via metadata for customer ${sub.customer}`
        );
      }
    } catch (err) {
      console.warn(
        `[Stripe] syncSubscription: resolveTenantForSubscription failed:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

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
        current_period_start:
          typeof subRecord.current_period_start === "number"
            ? new Date(subRecord.current_period_start * 1000).toISOString()
            : new Date().toISOString(),
        current_period_end:
          periodEnd?.toISOString() || new Date().toISOString(),
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
  const userId = sub.metadata?.user_id || sub.metadata?.tenant_id || "";
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

async function fulfillKaiCreditCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.type !== "kai_credits") return false;

  const db = await getDb();
  if (!db) throw new Error("Database unavailable for Kai credit fulfillment");

  const metadata = parseKaiCreditCheckoutMetadata(session.metadata);
  if (!metadata) return false;

  const [purchase] = await db
    .select()
    .from(kaiCreditPurchases)
    .where(
      and(
        eq(kaiCreditPurchases.id, metadata.purchaseId),
        eq(kaiCreditPurchases.tenantId, metadata.tenantId),
        eq(kaiCreditPurchases.userId, metadata.userId)
      )
    )
    .limit(1);

  if (!purchase) {
    throw new Error(`Kai credit purchase not found: ${metadata.purchaseId}`);
  }

  let plan: ReturnType<typeof buildKaiCreditFulfillmentPlan>;
  try {
    plan = buildKaiCreditFulfillmentPlan(session, purchase);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Kai credit amount mismatch")
    ) {
      await db
        .update(kaiCreditPurchases)
        .set({ status: "failed", updatedAt: new Date() })
        .where(
          and(
            eq(kaiCreditPurchases.id, purchase.id),
            eq(kaiCreditPurchases.tenantId, purchase.tenantId),
            eq(kaiCreditPurchases.userId, purchase.userId)
          )
        );
    }
    throw error;
  }
  if (!plan) return false;

  await db
    .insert(kaiCreditLedger)
    .values(plan.ledgerInsert)
    .onConflictDoNothing({ target: kaiCreditLedger.idempotencyKey });

  await db
    .update(kaiCreditPurchases)
    .set(plan.purchaseUpdate)
    .where(
      and(
        eq(kaiCreditPurchases.id, purchase.id),
        eq(kaiCreditPurchases.tenantId, purchase.tenantId),
        eq(kaiCreditPurchases.userId, purchase.userId)
      )
    );

  console.log(
    `[Stripe] Fulfilled Kai credit purchase ${purchase.id}: +${purchase.credits} credits for tenant ${purchase.tenantId}, user ${purchase.userId}`
  );
  return true;
}

/** Parse an im_ref cookie value out of a raw HTTP Cookie header. */
function parseImRefFromCookieHeader(header: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === "im_ref") {
      try {
        return decodeURIComponent(rest.join("=")) || null;
      } catch {
        return rest.join("=") || null;
      }
    }
  }
  return null;
}

export function registerStripeRoutes(app: Express) {
  // Stripe webhook — must use raw body BEFORE json middleware
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: ExpressRequest, res: ExpressResponse) => {
      if (!stripe) {
        console.error("[Stripe Webhook] STRIPE_SECRET_KEY not configured");
        return res.status(503).json({ error: "Stripe not configured" });
      }

      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
      if (!webhookSecret) {
        console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
        return res.status(503).json({ error: "Webhook secret not configured" });
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        console.error(
          "[Stripe Webhook] Signature verification failed:",
          errMsg(err)
        );
        return res.status(400).json({ error: `Webhook Error: ${errMsg(err)}` });
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
            if (await fulfillKaiCreditCheckout(session)) {
              break;
            }

            const customerId = session.customer as string;
            // PATCHED: resolve via metadata.tenant_id when no prior link.
            // Safe because /api/stripe/create-checkout overrides client-supplied
            // metadata with JWT-derived tenant_id (see authedUserFromRequest).
            const checkoutTenant = await resolveTenantForCheckout(session);

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
                        errMsg(err)
                      )
                    );
                }
              }
              break;
            }

            if (checkoutTenant && customerId) {
              // Tenant is already verified via stripeCustomerId lookup above.
              // Update subscription status — WHERE clause keys on the verified tenant ID.
              const db = await getDb();
              if (db) {
                await db
                  .update(tenants)
                  .set({
                    stripeCustomerId: customerId,
                    subscriptionStatus: "active",
                  })
                  .where(eq(tenants.id, checkoutTenant.id));
              }
            } else if (!checkoutTenant && customerId) {
              // New customer completing checkout for the first time — no existing tenant row
              // tied to this stripeCustomerId yet. The tenant link will be established via
              // customer.subscription.created → syncSubscription, which looks up by stripeCustomerId.
              console.log(
                `[Stripe] checkout.session.completed: no tenant found for customer ${customerId}; subscription sync will handle the link.`
              );
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
                  console.error("[CAPI] Purchase event failed:", errMsg(err))
                );
            }

            console.log(
              `[Stripe] Checkout completed for tenant ${checkoutTenant?.id ?? "unknown"}, customer: ${customerId}`
            );

            void import("./auditLogger").then(({ logAudit }) =>
              logAudit({
                action: "stripe.purchase",
                resource: "subscription",
                resourceId: customerId,
                severity: "medium",
                tenantId: checkoutTenant?.id,
                metadata: {
                  amount: sessionAmount,
                  currency: (session.currency || "USD").toUpperCase(),
                  sessionId: session.id,
                },
              }).catch(() => {})
            );

            // ── Impact.com S2S affiliate conversion (Express path) ───
            try {
              const sessionAmountCents = session.amount_total ?? 0;
              if (sessionAmountCents > 0) {
                const { fireImpactConversion } = await import("./_core/impact");
                const stripeMetaClickId =
                  session.metadata?.im_click_id ||
                  session.metadata?.imClickId ||
                  null;
                const userIdFromMeta = session.metadata?.user_id
                  ? Number(session.metadata.user_id)
                  : null;
                const db = await getDb();
                if (db) {
                  await fireImpactConversion(db, {
                    stripeSessionId: session.id,
                    amountCents: sessionAmountCents,
                    currency: (session.currency || "USD").toUpperCase(),
                    clickId: stripeMetaClickId,
                    userId: userIdFromMeta,
                  });
                }
              }
            } catch (impactErr: unknown) {
              console.error(
                "[Impact] Conversion firing failed (non-fatal):",
                errMsg(impactErr)
              );
            }
            break;
          }

          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            await syncSubscription(sub);
            if (
              event.type === "customer.subscription.created" &&
              (sub.status === "active" || sub.status === "trialing")
            ) {
              await fireSubscriptionAutomation(sub, "subscription.activated");
            }
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
            await fireSubscriptionAutomation(sub, "subscription.cancelled");
            console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
            break;
          }

          // Flush pending credit overages BEFORE the invoice finalizes,
          // so they appear as line items on the current period's invoice.
          case "invoice.created":
          case "invoice.upcoming": {
            const invoice = event.data.object as Stripe.Invoice;
            const supabase = getSupabaseAdmin();
            if (supabase && invoice.customer) {
              const { data: sub } = await supabase
                .from("stripe_subscriptions")
                .select("user_id")
                .eq("stripe_customer_id", invoice.customer as string)
                .in("status", ["trialing", "active"])
                .maybeSingle();
              if (sub?.user_id) {
                await flushUserOverages(sub.user_id);
              }
            }
            console.log(
              `[Stripe] Invoice ${event.type}: ${invoice.id}, flushed overages`
            );
            break;
          }

          case "invoice.payment_succeeded":
          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            // Re-sync subscription to refresh period end and grant credits
            const subId = (
              invoice as Stripe.Invoice & { subscription?: string }
            ).subscription;
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
    async (req: ExpressRequest, res: ExpressResponse) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const { priceId, userEmail, userName, origin, amount, description } =
          req.body;
        const authed = await authedUserFromRequest({
          headers: req.headers as Record<string, string | string[] | undefined>,
        });
        if (!authed) {
          return res.status(401).json({ error: "Authentication required" });
        }

        let baseUrl: string;
        try {
          baseUrl = normalizeCheckoutOrigin(origin || "http://localhost:3000");
        } catch (error) {
          return res.status(400).json({
            error:
              error instanceof Error
                ? error.message
                : "Invalid checkout origin",
          });
        }
        const tenantId = authed.tenantId;
        const userId = authed.userId;
        const effectiveUserEmail = authed.email || userEmail;

        // Capture im_ref click ID from buyer's cookie so we can attribute
        // the eventual checkout.session.completed back to the affiliate
        // who sourced this user. We persist into both metadata bags.
        const imClickId = parseImRefFromCookieHeader(
          (req.headers["cookie"] as string | undefined) || ""
        );

        // If a specific priceId is provided, use subscription mode
        if (priceId) {
          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            customer_email: effectiveUserEmail,
            allow_promotion_codes: true,
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
              metadata: {
                tenant_id: tenantId?.toString() || "",
                user_id: userId?.toString() || "",
                im_click_id: imClickId || "",
              },
            },
            client_reference_id: userId?.toString(),
            metadata: {
              tenant_id: tenantId?.toString() || "",
              user_id: userId?.toString() || "",
              customer_email: effectiveUserEmail || "",
              customer_name: userName || "",
              im_click_id: imClickId || "",
            },
            automatic_tax: { enabled: true },
            success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/pricing?stripe=cancelled`,
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
          customer_email: effectiveUserEmail,
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
            customer_email: effectiveUserEmail || "",
            customer_name: userName || "",
          },
          success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/pricing?stripe=cancelled`,
        });

        res.json({ url: session.url });
      } catch (err: unknown) {
        console.error("[Stripe] Create checkout error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // Create embedded checkout session (returns clientSecret for iframe checkout)
  app.post(
    "/api/stripe/create-embedded-checkout",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const { priceId, userEmail } = req.body;
        const authed = await authedUserFromRequest({
          headers: req.headers as Record<string, string | string[] | undefined>,
        });
        if (!authed) {
          return res.status(401).json({ error: "Authentication required" });
        }
        if (!priceId) {
          return res.status(400).json({ error: "priceId is required" });
        }
        const userId = authed.userId;
        const tenantId = authed.tenantId;
        const effectiveUserEmail = authed.email || userEmail;
        let origin: string;
        try {
          origin = normalizeCheckoutOrigin(
            req.headers.origin || getAppUrl() || "http://localhost:3000"
          );
        } catch (error) {
          return res.status(400).json({
            error:
              error instanceof Error
                ? error.message
                : "Invalid checkout origin",
          });
        }
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
          customer_email: effectiveUserEmail,
          automatic_tax: { enabled: true },
          allow_promotion_codes: true,
          return_url: `${origin}/dashboard?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
        });
        res.json({ clientSecret: session.client_secret });
      } catch (err: unknown) {
        console.error("[Stripe] Create embedded checkout error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // Create customer portal session for billing management
  app.post(
    "/api/stripe/customer-portal",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const { customerId, origin } = req.body;

        if (!customerId) {
          return res.status(400).json({ error: "customerId is required" });
        }
        const authed = await authedUserFromRequest({
          headers: req.headers as Record<string, string | string[] | undefined>,
        });
        if (!authed) {
          return res.status(401).json({ error: "Authentication required" });
        }
        const ownership = await ensureCustomerBelongsToAuthenticatedTenant(
          customerId,
          authed
        );
        if (!ownership.ok) {
          return res.status(ownership.status).json({ error: ownership.error });
        }

        let baseUrl: string;
        try {
          baseUrl = normalizeCheckoutOrigin(origin || "http://localhost:3000");
        } catch (error) {
          return res.status(400).json({
            error:
              error instanceof Error
                ? error.message
                : "Invalid checkout origin",
          });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${baseUrl}/settings`,
        });

        res.json({ url: session.url });
      } catch (err: unknown) {
        console.error("[Stripe] Customer portal error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // Get subscription details for a tenant
  app.get(
    "/api/stripe/subscription/:subscriptionId",
    async (req: ExpressRequest, res: ExpressResponse) => {
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
      } catch (err: unknown) {
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // Change subscription plan (upgrade/downgrade with proration)
  app.post(
    "/api/stripe/change-plan",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
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
      } catch (err: unknown) {
        console.error("[Stripe] Change plan error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // Cancel subscription at period end
  app.post(
    "/api/stripe/cancel-subscription",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const { subscriptionId } = req.body;
        if (!subscriptionId) {
          return res.status(400).json({ error: "subscriptionId is required" });
        }
        const updated = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        res.json(updated);
      } catch (err: unknown) {
        console.error("[Stripe] Cancel subscription error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // Flush all pending credit overages to Stripe as invoice items
  // (intended for scheduled cron / admin trigger).
  app.post(
    "/api/stripe/flush-overages",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
      const adminKey = req.headers["x-admin-key"] as string | undefined;
      if (process.env.ADMIN_API_KEY && adminKey !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      try {
        const result = await flushAllOverages();
        res.json(result);
      } catch (err: unknown) {
        console.error("[Stripe] Flush overages error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // Flush pending credit overages for a specific user
  app.post(
    "/api/stripe/flush-overages/:userId",
    express.json(),
    async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const result = await flushUserOverages(req.params.userId);
        res.json(result);
      } catch (err: unknown) {
        console.error("[Stripe] Flush user overages error:", errMsg(err));
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );

  // List invoices for a Stripe customer
  app.get(
    "/api/stripe/invoices/:customerId",
    async (req: ExpressRequest, res: ExpressResponse) => {
      if (!stripe)
        return res.status(503).json({ error: "Stripe not configured" });
      try {
        const authed = await authedUserFromRequest({
          headers: req.headers as Record<string, string | string[] | undefined>,
        });
        if (!authed) {
          return res.status(401).json({ error: "Authentication required" });
        }
        const ownership = await ensureCustomerBelongsToAuthenticatedTenant(
          req.params.customerId,
          authed
        );
        if (!ownership.ok) {
          return res.status(ownership.status).json({ error: ownership.error });
        }
        const invoices = await stripe.invoices.list({
          customer: req.params.customerId,
          limit: 20,
        });
        res.json(invoices.data);
      } catch (err: unknown) {
        res.status(500).json({ error: errMsg(err) });
      }
    }
  );
}

export { stripe };

/* ─────────────────────────────────────────────────────────────────────────
 * registerStripeFetchRoutes — Netlify Functions Fetch API handler.
 *
 * The Express routes above (registerStripeRoutes) only run under the
 * Express adapter (local/Docker). On Netlify the server function is a
 * Fetch handler (tRPC fetchRequestHandler) with NO Express, so those
 * routes never mounted and every /api/stripe/* request fell through to
 * tRPC and 404'd. This implementation mirrors the Express routes 1:1.
 *
 * IMPORTANT: webhook signature verification REQUIRES the raw body via
 * req.text() — never req.json(), which mutates whitespace and breaks the
 * HMAC. The /api/webhooks exclusion in middleware is preserved upstream
 * (this file is mounted before tRPC in nonTrpcRoutes.ts).
 * ───────────────────────────────────────────────────────────────────── */
async function handleStripeWebhook(req: Request): Promise<Response> {
  if (!stripe) {
    console.error("[Stripe Webhook] STRIPE_SECRET_KEY not configured");
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!sig) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return Response.json(
      { error: "Webhook secret not configured" },
      { status: 503 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    // constructEventAsync uses Web Crypto API — required in serverless edge/fetch contexts
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      webhookSecret
    );
  } catch (err: unknown) {
    console.error(
      "[Stripe Webhook] Signature verification failed:",
      errMsg(err)
    );
    return Response.json(
      { error: `Webhook Error: ${errMsg(err)}` },
      { status: 400 }
    );
  }

  // Test events (sent by the Stripe Dashboard "Send test webhook" button)
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event verified:", event.type);
    return Response.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);
  // PATCHED: persist for forensic + idempotency.
  await recordWebhookEvent(event, "received");

  // Dedup: skip events we already successfully processed (Stripe retries).
  try {
    const db = await getDb();
    if (db) {
      const existing = await db
        .select({ status: stripeWebhookEvents.status })
        .from(stripeWebhookEvents)
        .where(eq(stripeWebhookEvents.eventId, event.id))
        .limit(1);
      if (existing[0]?.status === "processed") {
        console.log(`[Stripe Webhook] Duplicate event skipped: ${event.id}`);
        return Response.json({ received: true, duplicate: true });
      }
    }
  } catch {
    // Non-fatal: if dedup check fails, continue processing.
  }

  try {
    switch (event.type) {
      case "product.created":
      case "product.updated": {
        await syncProduct(event.data.object as Stripe.Product);
        break;
      }
      case "price.created":
      case "price.updated": {
        await syncPrice(event.data.object as Stripe.Price);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (await fulfillKaiCreditCheckout(session)) {
          break;
        }

        const customerId = session.customer as string;
        // PATCHED: resolve via metadata.tenant_id if customer not yet linked.
        const checkoutTenant = await resolveTenantForCheckout(session);

        // Theme purchase fulfillment
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
                  console.error("[CAPI] Purchase event failed:", errMsg(err))
                );
            }
          }
          break;
        }

        if (checkoutTenant && customerId) {
          const db = await getDb();
          if (db) {
            await db
              .update(tenants)
              .set({
                stripeCustomerId: customerId,
                subscriptionStatus: "active",
              })
              .where(eq(tenants.id, checkoutTenant.id));
          }
        } else if (!checkoutTenant && customerId) {
          console.log(
            `[Stripe] checkout.session.completed: no tenant found for customer ${customerId}; subscription sync will handle the link.`
          );
        }

        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await syncSubscription(sub);
        }

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
              console.error("[CAPI] Purchase event failed:", errMsg(err))
            );
        }

        console.log(
          `[Stripe] Checkout completed for tenant ${checkoutTenant?.id ?? "unknown"}, customer: ${customerId}`
        );

        void import("./auditLogger").then(({ logAudit }) =>
          logAudit({
            action: "stripe.purchase",
            resource: "subscription",
            resourceId: customerId,
            severity: "medium",
            tenantId: checkoutTenant?.id,
            metadata: {
              amount: sessionAmount,
              currency: (session.currency || "USD").toUpperCase(),
              sessionId: session.id,
            },
          }).catch(() => {})
        );

        // ── Impact.com S2S affiliate conversion ─────────────────────
        // Idempotent on session.id (UNIQUE constraint on
        // impact_conversions.stripe_session_id). Stripe's webhook request
        // does NOT carry the buyer's im_ref cookie, so we resolve the
        // click via:
        //   1. session.metadata.im_click_id (set at create-checkout time)
        //   2. fallback: most-recent unconverted click for this user_id
        // No-op when IMPACT_* env vars are unset, never blocks the
        // Stripe webhook handler on affiliate-network failure.
        try {
          const sessionAmountCents = session.amount_total ?? 0;
          if (sessionAmountCents > 0) {
            const { fireImpactConversion } = await import("./_core/impact");
            const stripeMetaClickId =
              session.metadata?.im_click_id ||
              session.metadata?.imClickId ||
              null;
            const userIdFromMeta = session.metadata?.user_id
              ? Number(session.metadata.user_id)
              : null;
            const db = await getDb();
            if (db) {
              await fireImpactConversion(db, {
                stripeSessionId: session.id,
                amountCents: sessionAmountCents,
                currency: (session.currency || "USD").toUpperCase(),
                clickId: stripeMetaClickId,
                userId: userIdFromMeta,
              });
            }
          }
        } catch (impactErr: unknown) {
          console.error(
            "[Impact] Conversion firing failed (non-fatal):",
            errMsg(impactErr)
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        if (
          event.type === "customer.subscription.created" &&
          (sub.status === "active" || sub.status === "trialing")
        ) {
          await fireSubscriptionAutomation(sub, "subscription.activated");
        }
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
        await fireSubscriptionAutomation(sub, "subscription.cancelled");
        console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
        break;
      }

      case "invoice.created":
      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        const supabase = getSupabaseAdmin();
        if (supabase && invoice.customer) {
          const { data: sub } = await supabase
            .from("stripe_subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", invoice.customer as string)
            .in("status", ["trialing", "active"])
            .maybeSingle();
          if (sub?.user_id) {
            await flushUserOverages(sub.user_id);
          }
        }
        console.log(
          `[Stripe] Invoice ${event.type}: ${invoice.id}, flushed overages`
        );
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as Stripe.Invoice & { subscription?: string })
          .subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
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
            .where(eq(tenants.stripeCustomerId, invoice.customer as string));
        }
        console.error(`[Stripe] Invoice payment failed: ${invoice.id}`);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`[Stripe] Trial ending soon for subscription: ${sub.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    // PATCHED: forensic — record the failure for later debugging.
    await recordWebhookEvent(event, "failed", errMsg(err));
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  // PATCHED: mark processed so we have an audit trail.
  await recordWebhookEvent(event, "processed");
  return Response.json({ received: true });
}

async function safeJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function registerStripeFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  // ── /api/stripe/webhook (+ /webhook-async alias) ────────────────────
  // The "-async" path exists as a separate background function
  // (stripe-webhook-background.mts), but background functions don't reliably
  // auto-route via config.path, so requests fall through to this /api/* server
  // function. Handle the alias here so any Stripe Dashboard endpoint pointed at
  // /api/stripe/webhook-async is processed (signature-verified) instead of 404ing.
  if (
    (path === "/api/stripe/webhook" || path === "/api/stripe/webhook-async") &&
    method === "POST"
  ) {
    return handleStripeWebhook(req);
  }

  // All remaining routes need a Stripe instance
  if (path.startsWith("/api/stripe/") && !stripe) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  // ── /api/stripe/create-checkout ─────────────────────────────────────
  if (path === "/api/stripe/create-checkout" && method === "POST") {
    try {
      // PATCHED: require auth and trust JWT, not request body, for tenant/user.
      const authed = await authedUserFromRequest(req);
      if (!authed) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      const body = await safeJson<{
        priceId?: string;
        userName?: string;
        origin?: string;
        amount?: string | number;
        description?: string;
      }>(req);
      const priceId = body.priceId;
      const userName = body.userName;
      const origin = body.origin;
      const amount = body.amount;
      const description = body.description;
      // Override any body-supplied tenant/user IDs with authenticated values.
      const tenantId = authed.tenantId;
      const userId = authed.userId;
      const userEmail = authed.email;

      let baseUrl: string;
      try {
        baseUrl = normalizeCheckoutOrigin(origin || "http://localhost:3000");
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Invalid checkout origin",
          },
          { status: 400 }
        );
      }

      // Read im_ref click cookie so we can attribute the eventual conversion
      // back to the affiliate that sourced this user.
      const imClickId = (() => {
        const header = req.headers.get("cookie") || "";
        for (const part of header.split(";")) {
          const [k, ...rest] = part.trim().split("=");
          if (k === "im_ref") {
            try {
              return decodeURIComponent(rest.join("=")) || null;
            } catch {
              return rest.join("=") || null;
            }
          }
        }
        return null;
      })();

      if (priceId) {
        const session = await stripe!.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          customer_email: userEmail,
          allow_promotion_codes: true,
          line_items: [{ price: priceId, quantity: 1 }],
          subscription_data: {
            metadata: {
              tenant_id: tenantId?.toString() || "",
              user_id: userId?.toString() || "",
              im_click_id: imClickId || "",
            },
          },
          client_reference_id: userId?.toString(),
          metadata: {
            tenant_id: tenantId?.toString() || "",
            user_id: userId?.toString() || "",
            customer_email: userEmail || "",
            customer_name: userName || "",
            im_click_id: imClickId || "",
          },
          automatic_tax: { enabled: true },
          success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/pricing?stripe=cancelled`,
        });
        return Response.json({ url: session.url });
      }

      if (!amount || isNaN(parseFloat(String(amount)))) {
        return Response.json(
          { error: "Either priceId or amount is required" },
          { status: 400 }
        );
      }

      const amountCents = Math.round(parseFloat(String(amount)) * 100);
      const session = await stripe!.checkout.sessions.create({
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
        success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing?stripe=cancelled`,
      });

      return Response.json({ url: session.url });
    } catch (err: unknown) {
      console.error("[Stripe] Create checkout error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/create-embedded-checkout ────────────────────────────
  if (path === "/api/stripe/create-embedded-checkout" && method === "POST") {
    try {
      // PATCHED: require auth, override tenant/user from JWT.
      const authed = await authedUserFromRequest(req);
      if (!authed) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      const body = await safeJson<{ priceId?: string }>(req);
      const priceId = body.priceId;
      const userEmail = authed.email;
      const userId = authed.userId;
      const tenantId = authed.tenantId;
      if (!priceId) {
        return Response.json({ error: "priceId is required" }, { status: 400 });
      }
      let origin: string;
      try {
        origin = normalizeCheckoutOrigin(
          req.headers.get("origin") || getAppUrl() || "http://localhost:3000"
        );
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Invalid checkout origin",
          },
          { status: 400 }
        );
      }
      const session = await stripe!.checkout.sessions.create({
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
      return Response.json({ clientSecret: session.client_secret });
    } catch (err: unknown) {
      console.error("[Stripe] Create embedded checkout error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/portal (legacy alias) + /api/stripe/customer-portal ─
  // PATCHED: tRPC subscription.createPortalSession still calls /api/stripe/portal.
  if (
    (path === "/api/stripe/customer-portal" || path === "/api/stripe/portal") &&
    method === "POST"
  ) {
    try {
      const { customerId, origin } = await safeJson<{
        customerId?: string;
        origin?: string;
      }>(req);
      if (!customerId) {
        return Response.json(
          { error: "customerId is required" },
          { status: 400 }
        );
      }
      const authed = await authedUserFromRequest(req);
      if (!authed) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      const ownership = await ensureCustomerBelongsToAuthenticatedTenant(
        customerId,
        authed
      );
      if (!ownership.ok) {
        return Response.json(
          { error: ownership.error },
          { status: ownership.status }
        );
      }
      let baseUrl: string;
      try {
        baseUrl = normalizeCheckoutOrigin(origin || "http://localhost:3000");
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Invalid checkout origin",
          },
          { status: 400 }
        );
      }
      const session = await stripe!.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/settings`,
      });
      return Response.json({ url: session.url });
    } catch (err: unknown) {
      console.error("[Stripe] Customer portal error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/subscription/:subscriptionId ────────────────────────
  if (path.startsWith("/api/stripe/subscription/") && method === "GET") {
    try {
      const subId = decodeURIComponent(
        path.slice("/api/stripe/subscription/".length)
      );
      if (!subId) {
        return Response.json(
          { error: "subscriptionId required" },
          { status: 400 }
        );
      }
      const sub = await stripe!.subscriptions.retrieve(subId, {
        expand: ["latest_invoice", "items.data.price.product"],
      });
      return Response.json(sub);
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/change-plan ─────────────────────────────────────────
  if (path === "/api/stripe/change-plan" && method === "POST") {
    try {
      const { subscriptionId, newPriceId } = await safeJson<{
        subscriptionId?: string;
        newPriceId?: string;
      }>(req);
      if (!subscriptionId || !newPriceId) {
        return Response.json(
          { error: "subscriptionId and newPriceId are required" },
          { status: 400 }
        );
      }
      const sub = await stripe!.subscriptions.retrieve(subscriptionId);
      const updated = await stripe!.subscriptions.update(subscriptionId, {
        items: [{ id: sub.items.data[0].id, price: newPriceId }],
        proration_behavior: "create_prorations",
      });
      return Response.json(updated);
    } catch (err: unknown) {
      console.error("[Stripe] Change plan error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/cancel-subscription ─────────────────────────────────
  if (path === "/api/stripe/cancel-subscription" && method === "POST") {
    try {
      const { subscriptionId } = await safeJson<{ subscriptionId?: string }>(
        req
      );
      if (!subscriptionId) {
        return Response.json(
          { error: "subscriptionId is required" },
          { status: 400 }
        );
      }
      const updated = await stripe!.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return Response.json(updated);
    } catch (err: unknown) {
      console.error("[Stripe] Cancel subscription error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/flush-overages (admin-only) ─────────────────────────
  if (path === "/api/stripe/flush-overages" && method === "POST") {
    const adminKey = req.headers.get("x-admin-key") || "";
    if (process.env.ADMIN_API_KEY && adminKey !== process.env.ADMIN_API_KEY) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const result = await flushAllOverages();
      return Response.json(result);
    } catch (err: unknown) {
      console.error("[Stripe] Flush overages error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/flush-overages/:userId ──────────────────────────────
  if (path.startsWith("/api/stripe/flush-overages/") && method === "POST") {
    try {
      const userId = decodeURIComponent(
        path.slice("/api/stripe/flush-overages/".length)
      );
      const result = await flushUserOverages(userId);
      return Response.json(result);
    } catch (err: unknown) {
      console.error("[Stripe] Flush user overages error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/invoices/:customerId ────────────────────────────────
  if (path.startsWith("/api/stripe/invoices/") && method === "GET") {
    try {
      const customerId = decodeURIComponent(
        path.slice("/api/stripe/invoices/".length)
      );
      const authed = await authedUserFromRequest(req);
      if (!authed) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      const ownership = await ensureCustomerBelongsToAuthenticatedTenant(
        customerId,
        authed
      );
      if (!ownership.ok) {
        return Response.json(
          { error: ownership.error },
          { status: ownership.status }
        );
      }
      const invoices = await stripe!.invoices.list({
        customer: customerId,
        limit: 20,
      });
      return Response.json(invoices.data);
    } catch (err: unknown) {
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/admin/reconcile (admin-only recovery) ───────────────
  // PATCHED: pulls recent Stripe customers + subscriptions and links any
  // orphan paid customers back to their tenant rows. Use after a webhook
  // outage to recover lost subscribers. Idempotent.
  if (path === "/api/stripe/admin/reconcile" && method === "POST") {
    const adminKey = req.headers.get("x-admin-key") || "";
    if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!stripe) {
      return Response.json({ error: "Stripe not configured" }, { status: 503 });
    }
    try {
      const linked: Array<{
        customerId: string;
        subscriptionId: string;
        tenantId: number;
        email: string;
        action: string;
      }> = [];
      const orphans: Array<{
        customerId: string;
        subscriptionId: string;
        email: string;
        reason: string;
      }> = [];
      const subs = await stripe!.subscriptions.list({
        limit: 100,
        status: "all",
        expand: ["data.customer"],
      });
      for (const sub of subs.data) {
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const customerEmail =
          typeof sub.customer === "object" &&
          sub.customer &&
          !sub.customer.deleted
            ? (sub.customer as Stripe.Customer).email || ""
            : "";
        const tenant = await resolveTenantForSubscription(sub);
        if (!tenant) {
          orphans.push({
            customerId,
            subscriptionId: sub.id,
            email: customerEmail,
            reason:
              "no metadata.tenant_id/user_id and customer not previously linked",
          });
          continue;
        }
        await syncSubscription(sub);
        linked.push({
          customerId,
          subscriptionId: sub.id,
          tenantId: tenant.id,
          email: customerEmail,
          action: "linked-and-synced",
        });
      }
      return Response.json({ linked, orphans, scanned: subs.data.length });
    } catch (err: unknown) {
      console.error("[Stripe] Reconcile error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // PATCHED:ADMIN_DISCOVER_AND_SETUP
  // ── /api/stripe/admin/discover (admin-only, read-only) ──────────────
  // Returns a JSON snapshot of Stripe state so we can answer "do products
  // exist? are there orphan customers? was anyone actually charged?"
  // without needing a connected Stripe Dashboard browser session.
  if (path === "/api/stripe/admin/discover" && method === "POST") {
    const adminKey = req.headers.get("x-admin-key") || "";
    if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!stripe) {
      return Response.json({ error: "Stripe not configured" }, { status: 503 });
    }
    try {
      const [products, prices, customers, subs, payments, charges] =
        await Promise.all([
          stripe!.products.list({ limit: 100, active: true }),
          stripe!.prices.list({ limit: 100, active: true }),
          stripe!.customers.list({ limit: 100 }),
          stripe!.subscriptions.list({ limit: 100, status: "all" }),
          stripe!.paymentIntents.list({ limit: 100 }),
          stripe!.charges.list({ limit: 100 }),
        ]);
      const acct = await stripe!.accounts.retrieve();
      // Slim each list down to what's useful for triage (avoid 1MB responses).
      return Response.json({
        account: {
          id: acct.id,
          email: acct.email,
          country: acct.country,
          default_currency: acct.default_currency,
          charges_enabled: acct.charges_enabled,
          details_submitted: acct.details_submitted,
        },
        livemode: products.data[0]?.livemode ?? null,
        products: products.data.map(p => ({
          id: p.id,
          name: p.name,
          active: p.active,
          metadata: p.metadata,
          default_price:
            typeof p.default_price === "string" ? p.default_price : null,
        })),
        prices: prices.data.map(p => ({
          id: p.id,
          product: typeof p.product === "string" ? p.product : "",
          nickname: p.nickname,
          unit_amount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring
            ? {
                interval: p.recurring.interval,
                interval_count: p.recurring.interval_count,
              }
            : null,
          active: p.active,
          lookup_key: p.lookup_key,
        })),
        customers: customers.data.map(c => ({
          id: c.id,
          email: c.email,
          name: c.name,
          created: c.created,
          metadata: c.metadata,
          default_source: c.default_source,
        })),
        subscriptions: subs.data.map(s => ({
          id: s.id,
          customer: typeof s.customer === "string" ? s.customer : "",
          status: s.status,
          created: s.created,
          metadata: s.metadata,
          items: s.items.data.map(i => ({
            price_id: i.price.id,
            quantity: i.quantity,
          })),
        })),
        payments: payments.data.map(pi => ({
          id: pi.id,
          customer: typeof pi.customer === "string" ? pi.customer : null,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          description: pi.description,
          created: pi.created,
          metadata: pi.metadata,
          receipt_email: pi.receipt_email,
        })),
        charges: charges.data.map(c => ({
          id: c.id,
          customer: typeof c.customer === "string" ? c.customer : null,
          amount: c.amount,
          currency: c.currency,
          status: c.status,
          paid: c.paid,
          refunded: c.refunded,
          billing_email: c.billing_details?.email ?? null,
          billing_name: c.billing_details?.name ?? null,
          created: c.created,
          description: c.description,
        })),
      });
    } catch (err: unknown) {
      console.error("[Stripe] Discover error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // ── /api/stripe/admin/setup-products (admin-only, idempotent) ───────
  // Creates canonical paid-plan Stripe products based on ../shared/pricing
  // and upserts matching rows in the `plans` table. Safe to re-run.
  if (path === "/api/stripe/admin/setup-products" && method === "POST") {
    const adminKey = req.headers.get("x-admin-key") || "";
    if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!stripe) {
      return Response.json({ error: "Stripe not configured" }, { status: 503 });
    }
    try {
      const tiers = PLAN_CATALOG.filter(
        plan => plan.slug === "pro" || plan.slug === "scale"
      );

      const results: Array<Record<string, unknown>> = [];

      for (const t of tiers) {
        // Find existing product by metadata marker — survives renames.
        const search = await stripe!.products.search({
          query: `metadata['unifyone_plan_slug']:'${t.slug}'`,
          limit: 1,
        });
        let product = search.data[0];
        if (!product) {
          product = await stripe!.products.create({
            name: t.stripeProductName ?? t.name,
            description: t.stripeProductDescription ?? t.description,
            metadata: { unifyone_plan_slug: t.slug },
            tax_code: "txcd_10000000", // SaaS / general business services
          });
        } else {
          // Keep name/desc in sync.
          await stripe!.products.update(product.id, {
            name: t.stripeProductName ?? t.name,
            description: t.stripeProductDescription ?? t.description,
            active: true,
          });
        }

        // Find or create monthly price
        let monthlyPrice: Stripe.Price | undefined;
        let yearlyPrice: Stripe.Price | undefined;
        const existingPrices = await stripe!.prices.list({
          product: product.id,
          limit: 100,
          active: true,
        });
        for (const p of existingPrices.data) {
          if (
            p.recurring?.interval === "month" &&
            p.unit_amount === t.monthlyPriceCents
          ) {
            monthlyPrice = p;
          } else if (
            p.recurring?.interval === "year" &&
            p.unit_amount === t.yearlyPriceCents
          ) {
            yearlyPrice = p;
          }
        }
        if (!monthlyPrice) {
          monthlyPrice = await stripe!.prices.create({
            product: product.id,
            unit_amount: t.monthlyPriceCents,
            currency: "usd",
            recurring: { interval: "month" },
            nickname: `${t.slug}_monthly`,
            lookup_key: `unifyone_${t.slug}_monthly`,
            metadata: { unifyone_plan_slug: t.slug, billing_period: "monthly" },
          });
        }
        if (!yearlyPrice) {
          yearlyPrice = await stripe!.prices.create({
            product: product.id,
            unit_amount: t.yearlyPriceCents,
            currency: "usd",
            recurring: { interval: "year" },
            nickname: `${t.slug}_yearly`,
            lookup_key: `unifyone_${t.slug}_yearly`,
            metadata: { unifyone_plan_slug: t.slug, billing_period: "yearly" },
          });
        }

        // Upsert plan row in DB
        const db = await getDb();
        if (db) {
          const allPlans = await db.select().from(plans);
          const existing = allPlans.find(p => p.slug === t.slug);
          if (existing) {
            await db
              .update(plans)
              .set({
                name: t.name,
                description: t.description,
                priceMonthly: (t.monthlyPriceCents / 100).toFixed(2),
                priceYearly: (t.yearlyPriceCents / 100).toFixed(2),
                stripePriceIdMonthly: monthlyPrice.id,
                stripePriceIdYearly: yearlyPrice.id,
                features: t.features,
                isActive: true,
              })
              .where(eq(plans.slug, t.slug));
          } else {
            await db.insert(plans).values({
              slug: t.slug,
              name: t.name,
              description: t.description,
              priceMonthly: (t.monthlyPriceCents / 100).toFixed(2),
              priceYearly: (t.yearlyPriceCents / 100).toFixed(2),
              stripePriceIdMonthly: monthlyPrice.id,
              stripePriceIdYearly: yearlyPrice.id,
              maxProducts: t.maxProducts,
              maxOrders: t.maxOrders,
              maxUsers: t.maxUsers,
              features: t.features,
              isActive: true,
            });
          }
        }

        results.push({
          slug: t.slug,
          product_id: product.id,
          monthly_price_id: monthlyPrice.id,
          yearly_price_id: yearlyPrice.id,
        });
      }

      // Also seed the free Starter row if missing (no Stripe IDs needed).
      const db = await getDb();
      if (db) {
        const allPlans = await db.select().from(plans);
        if (!allPlans.find(p => p.slug === "starter")) {
          const starter = PLAN_CATALOG_BY_SLUG.starter;
          await db.insert(plans).values({
            slug: starter.slug,
            name: starter.name,
            description: starter.description,
            priceMonthly: (starter.monthlyPriceCents / 100).toFixed(2),
            priceYearly: (starter.yearlyPriceCents / 100).toFixed(2),
            stripePriceIdMonthly: null,
            stripePriceIdYearly: null,
            maxProducts: starter.maxProducts,
            maxOrders: starter.maxOrders,
            maxUsers: starter.maxUsers,
            features: starter.features,
            isActive: true,
          });
        }
      }

      return Response.json({ created: results });
    } catch (err: unknown) {
      console.error("[Stripe] Setup products error:", errMsg(err));
      return Response.json({ error: errMsg(err) }, { status: 500 });
    }
  }

  // Not handled here — return null so caller falls through to tRPC
  return null;
}
