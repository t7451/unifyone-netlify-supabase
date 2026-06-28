/**
 * Stripe business-sync layer.
 *
 * Tenant resolution, subscription/product/price sync, credit grants, Kai
 * credit fulfillment, and the auth helpers used by the checkout/portal
 * routes. These are relocations of the logic previously inline in
 * server/stripe.ts — identical Stripe API calls, identical DB writes, and
 * identical side-effect order.
 */
import Stripe from "stripe";
import { eq, and } from "drizzle-orm";
import { sdk } from "../../_core/sdk";
import { COOKIE_NAME } from "../../../shared/const";
import {
  tenants,
  plans,
  users,
  kaiCreditPurchases,
  kaiCreditLedger,
} from "../../../drizzle/schema";
import { errMsg } from "../../_core/errors";
import {
  buildKaiCreditFulfillmentPlan,
  parseKaiCreditCheckoutMetadata,
} from "../../lib/kaiCredits";
import { fireAutomations } from "../../lib/automationDispatch";
import { stripe } from "./client";
import {
  getDb,
  getTenantByStripeCustomerId,
  getTenantById,
  getTenantsByOwner,
  getSupabaseAdmin,
} from "./repo";

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
export async function resolveTenantForCheckout(
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
export async function resolveTenantForSubscription(
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

export async function authedUserFromRequest(
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

export async function ensureCustomerBelongsToAuthenticatedTenant(
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
export async function fireSubscriptionAutomation(
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
export async function syncSubscription(sub: Stripe.Subscription) {
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
    // user_id comes from subscription metadata (stamped at checkout creation).
    // Do NOT fall back to customerId — it is a Stripe customer ID string and
    // would corrupt the user_id column, breaking overage flush lookups.
    const userId = sub.metadata?.user_id || sub.metadata?.tenant_id || null;
    if (!userId) {
      console.warn(
        `[Stripe] syncSubscription: no user_id in metadata for sub ${sub.id}, Supabase stripe_subscriptions.user_id will be null`
      );
    }
    const { error: upsertError } = await supabase
      .from("stripe_subscriptions")
      .upsert([
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
    if (upsertError) {
      console.error(
        `[Stripe] Supabase stripe_subscriptions upsert failed for ${sub.id}:`,
        upsertError.message
      );
    }
  }

  console.log(
    `[Stripe] Subscription synced: ${sub.id} → status=${status}, periodEnd=${periodEnd?.toISOString()}`
  );
}

// Sync Stripe product to Supabase
export async function syncProduct(product: Stripe.Product) {
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
export async function syncPrice(price: Stripe.Price) {
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
export async function grantSubscriptionCredits(
  invoice: Stripe.Invoice,
  sub: Stripe.Subscription
) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !stripe) return;

  const priceId = sub.items.data[0]?.price?.id;
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

export async function fulfillKaiCreditCheckout(
  session: Stripe.Checkout.Session
) {
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
