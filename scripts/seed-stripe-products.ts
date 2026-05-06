/**
 * seed-stripe-products.ts
 *
 * Idempotent script that:
 *   1. Verifies STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET are set.
 *   2. Seeds the `plans` table in Neon with the three tiers from PLAN_CATALOG
 *      (starter / pro / scale) using ON CONFLICT DO UPDATE so it is safe to
 *      re-run at any time.
 *   3. Creates (or reuses via lookup_key) Stripe products + monthly/yearly
 *      prices for pro and scale.  Starter is free — no Stripe price needed.
 *   4. Writes the resolved Stripe price IDs back into
 *      plans.stripePriceIdMonthly and plans.stripePriceIdYearly.
 *   5. Verifies that the webhook endpoint https://1commerce.online/api/stripe/webhook
 *      is registered in Stripe and listens for the required events, printing a
 *      warning with a fix command if it is missing.
 *
 * Usage:
 *   pnpm tsx scripts/seed-stripe-products.ts
 *
 * Environment variables required (loaded from .env automatically):
 *   STRIPE_SECRET_KEY       sk_live_… or sk_test_…
 *   STRIPE_WEBHOOK_SECRET   whsec_…  (must already be set in production env)
 *   DATABASE_URL            postgresql://…   (or NETLIFY_DATABASE_URL)
 */
import "dotenv/config";
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { STRIPE_API_VERSION } from "../server/_core/stripeClient";
import { PLAN_CATALOG, type PlanCatalogEntry } from "../shared/pricing";
import { plans } from "../drizzle/schema";

// ── 0. Preflight checks ───────────────────────────────────────────────────────

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const DB_URL =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

const WEBHOOK_URL = "https://1commerce.online/api/stripe/webhook";
const REQUIRED_EVENTS: Stripe.WebhookEndpointUpdateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

let errors = 0;
if (!STRIPE_KEY) {
  console.error("✗ STRIPE_SECRET_KEY is not set");
  errors++;
}
if (!WEBHOOK_SECRET) {
  console.error("✗ STRIPE_WEBHOOK_SECRET is not set in the environment");
  errors++;
}
if (!DB_URL) {
  console.error(
    "✗ No database URL found (DATABASE_URL / NETLIFY_DATABASE_URL)"
  );
  errors++;
}
if (errors > 0) {
  console.error(
    `\n${errors} missing environment variable(s). Populate .env and re-run.`
  );
  process.exit(1);
}

console.log("✓ STRIPE_SECRET_KEY  set");
console.log("✓ STRIPE_WEBHOOK_SECRET  set");
console.log("✓ DATABASE_URL  set\n");

// ── 1. Clients ────────────────────────────────────────────────────────────────

const stripe = new Stripe(STRIPE_KEY!, { apiVersion: STRIPE_API_VERSION });
const sql = neon(DB_URL!);
const db = drizzle(sql);

// ── 2. Helpers ────────────────────────────────────────────────────────────────

/**
 * Find an existing active price by lookup_key, or create it.
 * Stripe lookup_keys are unique per live/test mode so this is idempotent.
 */
async function upsertPrice(
  product: Stripe.Product,
  lookupKey: string,
  unitAmount: number,
  interval: "month" | "year"
): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  if (existing.data.length > 0) {
    console.log(`    ↩  price exists (${lookupKey}): ${existing.data[0].id}`);
    return existing.data[0];
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: "usd",
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: false,
  });
  console.log(`    ✓  created price (${lookupKey}): ${price.id}`);
  return price;
}

/**
 * Find an existing active Stripe product by metadata slug, or create it.
 */
async function upsertProduct(entry: PlanCatalogEntry): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `metadata["plan_slug"]:"${entry.slug}" AND active:"true"`,
    limit: 1,
  });
  if (existing.data.length > 0) {
    const p = existing.data[0];
    console.log(`  ↩  product exists (${entry.slug}): ${p.id}`);
    return p;
  }
  const product = await stripe.products.create({
    name: entry.stripeProductName!,
    description: entry.stripeProductDescription ?? undefined,
    metadata: {
      plan_slug: entry.slug,
      max_products: String(entry.maxProducts),
      max_orders: String(entry.maxOrders),
      max_users: String(entry.maxUsers),
      kai_credits: String(entry.kaiCreditsMonthly),
    },
  });
  console.log(`  ✓  created product (${entry.slug}): ${product.id}`);
  return product;
}

// ── 3. Seed DB plans table ────────────────────────────────────────────────────

async function seedPlansTable(): Promise<void> {
  console.log(
    "── Seeding plans table ─────────────────────────────────────────"
  );
  for (const entry of PLAN_CATALOG) {
    await db
      .insert(plans)
      .values({
        slug: entry.slug,
        name: entry.name,
        description: entry.description,
        priceMonthly: String(entry.monthlyPriceCents / 100),
        priceYearly: String(entry.yearlyPriceCents / 100),
        maxProducts:
          entry.maxProducts >= 1_000_000 ? 999_999 : entry.maxProducts,
        maxOrders: entry.maxOrders >= 1_000_000 ? 999_999 : entry.maxOrders,
        maxUsers: entry.maxUsers >= 1_000_000 ? 999_999 : entry.maxUsers,
        features: entry.features as string[],
        isActive: true,
      })
      .onConflictDoUpdate({
        target: plans.slug,
        set: {
          name: entry.name,
          description: entry.description,
          priceMonthly: String(entry.monthlyPriceCents / 100),
          priceYearly: String(entry.yearlyPriceCents / 100),
          maxProducts:
            entry.maxProducts >= 1_000_000 ? 999_999 : entry.maxProducts,
          maxOrders: entry.maxOrders >= 1_000_000 ? 999_999 : entry.maxOrders,
          maxUsers: entry.maxUsers >= 1_000_000 ? 999_999 : entry.maxUsers,
          features: entry.features as string[],
          isActive: true,
        },
      });
    console.log(`  ✓  plans.${entry.slug} upserted`);
  }
  console.log();
}

// ── 4. Create Stripe products + prices, write IDs back to DB ─────────────────

async function seedStripeAndPatchDb(): Promise<void> {
  console.log(
    "── Stripe products + prices ────────────────────────────────────"
  );

  for (const entry of PLAN_CATALOG) {
    if (entry.monthlyPriceCents === 0) {
      console.log(`  ○  ${entry.slug}: free plan — no Stripe price needed`);
      continue;
    }

    console.log(`  ${entry.slug}:`);
    const product = await upsertProduct(entry);

    const monthlyPrice = await upsertPrice(
      product,
      `${entry.slug}_monthly`,
      entry.monthlyPriceCents,
      "month"
    );
    const yearlyPrice = await upsertPrice(
      product,
      `${entry.slug}_yearly`,
      entry.yearlyPriceCents,
      "year"
    );

    await db
      .update(plans)
      .set({
        stripePriceIdMonthly: monthlyPrice.id,
        stripePriceIdYearly: yearlyPrice.id,
      })
      .where(eq(plans.slug, entry.slug));

    console.log(
      `    ✓  DB updated: stripePriceIdMonthly=${monthlyPrice.id}, stripePriceIdYearly=${yearlyPrice.id}`
    );
  }
  console.log();
}

// ── 5. Verify webhook ─────────────────────────────────────────────────────────

async function verifyWebhook(): Promise<void> {
  console.log(
    "── Stripe webhook verification ─────────────────────────────────"
  );

  const allWebhooks = await stripe.webhookEndpoints.list({ limit: 100 });
  const endpoint = allWebhooks.data.find(w => w.url === WEBHOOK_URL);

  if (!endpoint) {
    console.error(`  ✗  Webhook NOT found for ${WEBHOOK_URL}`);
    console.error(`     Register it with:\n`);
    console.error(
      `     stripe listen --forward-to ${WEBHOOK_URL}   # local testing`
    );
    console.error(`     -- OR --`);
    console.error(`     stripe webhook endpoints create \\`);
    console.error(`       --url=${WEBHOOK_URL} \\`);
    console.error(`       --events=${REQUIRED_EVENTS.join(",")}\n`);
    return;
  }

  console.log(`  ✓  Webhook endpoint found: ${endpoint.id}`);
  console.log(`     Status : ${endpoint.status}`);

  const missing = REQUIRED_EVENTS.filter(
    ev => !endpoint.enabled_events.includes(ev as string)
  );
  if (missing.length === 0) {
    console.log(`  ✓  All required events are enabled`);
  } else {
    console.error(`  ✗  Missing events: ${missing.join(", ")}`);
    console.error(`     Fix with:`);
    console.error(`     stripe webhook endpoints update ${endpoint.id} \\`);
    console.error(`       --add-events=${missing.join(",")}`);
  }

  if (endpoint.status !== "enabled") {
    console.error(`  ✗  Webhook is not enabled (status=${endpoint.status})`);
  }

  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await seedPlansTable();
  await seedStripeAndPatchDb();
  await verifyWebhook();
  console.log("Done ✓");
}

main().catch((err: unknown) => {
  console.error(
    "\nSeed failed:",
    err instanceof Error ? err.message : String(err)
  );
  process.exit(1);
});
