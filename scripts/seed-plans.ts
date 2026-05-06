/**
 * Seed the UnifyOne subscription stack end-to-end.
 *
 * This is the single command that turns "we have nice pricing copy" into
 * "a customer can actually subscribe right now". It is idempotent and safe
 * to re-run.
 *
 * For each entry in `shared/pricing.PLAN_CATALOG` it will:
 *
 *   1. Create (or reuse) a Stripe **Product** keyed by `metadata.uo_plan_slug`.
 *   2. Create (or reuse) a recurring **Price** for the monthly cycle, keyed
 *      by `lookup_key = unifyone_<slug>_monthly` (and the same for yearly).
 *      Free plans skip Stripe price creation.
 *   3. Upsert a row in the Drizzle `plans` table (Neon) keyed by `slug`,
 *      copying the resolved Stripe price IDs into `stripePriceIdMonthly`
 *      and `stripePriceIdYearly` so `subscription.createCheckout` can
 *      resolve them.
 *
 * Usage:
 *   pnpm tsx scripts/seed-plans.ts            # apply (requires STRIPE_SECRET_KEY + DATABASE_URL)
 *   pnpm tsx scripts/seed-plans.ts --dry-run  # plan only, no writes
 *   pnpm tsx scripts/seed-plans.ts --skip-stripe  # only upsert plans rows (uses existing price IDs)
 *
 * Required env:
 *   - STRIPE_SECRET_KEY        (unless --skip-stripe)
 *   - DATABASE_URL             (or NETLIFY_DATABASE_URL / _UNPOOLED)
 */
import "dotenv/config";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { STRIPE_API_VERSION } from "../server/_core/stripeClient";
import { getDb } from "../server/db";
import { plans } from "../drizzle/schema";
import {
  PLAN_CATALOG,
  type BillingCycle,
  type PlanCatalogEntry,
} from "../shared/pricing";

type Args = {
  dryRun: boolean;
  skipStripe: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run"),
    skipStripe: argv.includes("--skip-stripe"),
  };
}

function lookupKey(slug: string, cycle: BillingCycle): string {
  return `unifyone_${slug}_${cycle}`;
}

function intervalFor(cycle: BillingCycle): "month" | "year" {
  return cycle === "yearly" ? "year" : "month";
}

/**
 * Find an existing Stripe Product for this plan slug. We key on
 * `metadata.uo_plan_slug` so renaming the product title in the dashboard
 * never breaks reuse.
 */
async function findProductBySlug(
  stripe: Stripe,
  slug: string
): Promise<Stripe.Product | null> {
  // Search API is the authoritative idempotency lookup. Fall back to a
  // bounded list scan if Search isn't available on this account.
  try {
    const result = await stripe.products.search({
      query: `active:'true' AND metadata['uo_plan_slug']:'${slug}'`,
      limit: 1,
    });
    if (result.data[0]) return result.data[0];
  } catch {
    // Search not enabled — fall through to list scan
  }

  let starting_after: string | undefined;
  for (let page = 0; page < 20; page++) {
    const list = await stripe.products.list({
      active: true,
      limit: 100,
      starting_after,
    });
    const hit = list.data.find(p => p.metadata?.uo_plan_slug === slug);
    if (hit) return hit;
    if (!list.has_more) break;
    starting_after = list.data[list.data.length - 1]?.id;
    if (!starting_after) break;
  }
  return null;
}

async function findPriceByLookupKey(
  stripe: Stripe,
  key: string
): Promise<Stripe.Price | null> {
  const list = await stripe.prices.list({
    lookup_keys: [key],
    active: true,
    limit: 1,
  });
  return list.data[0] ?? null;
}

async function ensureStripeProduct(
  stripe: Stripe,
  plan: PlanCatalogEntry,
  dryRun: boolean
): Promise<Stripe.Product> {
  const existing = await findProductBySlug(stripe, plan.slug);
  if (existing) {
    console.log(
      `  • product reused: ${existing.id} (${existing.name}) [slug=${plan.slug}]`
    );
    return existing;
  }
  if (dryRun) {
    console.log(`  • [dry-run] would create product for slug=${plan.slug}`);
    return {
      id: `prod_dryrun_${plan.slug}`,
      name: plan.stripeProductName ?? `UnifyOne ${plan.name}`,
      metadata: { uo_plan_slug: plan.slug },
    } as unknown as Stripe.Product;
  }
  const created = await stripe.products.create({
    name: plan.stripeProductName ?? `UnifyOne ${plan.name}`,
    description: plan.stripeProductDescription ?? plan.description,
    metadata: {
      uo_plan_slug: plan.slug,
      uo_max_products: String(plan.maxProducts),
      uo_max_orders: String(plan.maxOrders),
      uo_max_users: String(plan.maxUsers),
      uo_kai_credits_monthly: String(plan.kaiCreditsMonthly),
      uo_tenant_limit:
        plan.tenantLimit === null ? "unlimited" : String(plan.tenantLimit),
    },
  });
  console.log(`  • product created: ${created.id} (${created.name})`);
  return created;
}

async function ensureStripePrice(
  stripe: Stripe,
  product: Stripe.Product,
  plan: PlanCatalogEntry,
  cycle: BillingCycle,
  dryRun: boolean
): Promise<Stripe.Price | null> {
  const amountCents =
    cycle === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;
  if (!amountCents || amountCents <= 0) {
    console.log(`    – skip ${cycle} price (free tier)`);
    return null;
  }

  const key = lookupKey(plan.slug, cycle);
  const existing = await findPriceByLookupKey(stripe, key);
  if (existing) {
    if (existing.unit_amount !== amountCents) {
      throw new Error(
        `Price mismatch for ${plan.slug} ${cycle}: existing Stripe price ` +
          `${existing.id} is ${existing.unit_amount}¢ but PLAN_CATALOG wants ` +
          `${amountCents}¢. Stripe prices are immutable. To roll over: ` +
          `archive ${existing.id} (or rename its lookup_key) in the Stripe ` +
          `dashboard, then re-run this script to create a new price at the ` +
          `correct amount.`
      );
    }
    console.log(`    • ${cycle} price reused: ${existing.id} (${key})`);
    return existing;
  }

  if (dryRun) {
    console.log(
      `    • [dry-run] would create ${cycle} price=${amountCents} key=${key}`
    );
    return {
      id: `price_dryrun_${plan.slug}_${cycle}`,
      lookup_key: key,
      unit_amount: amountCents,
    } as unknown as Stripe.Price;
  }

  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: amountCents,
    currency: "usd",
    recurring: { interval: intervalFor(cycle) },
    lookup_key: key,
    nickname: `${plan.name} ${cycle === "yearly" ? "Yearly" : "Monthly"}`,
    metadata: {
      uo_plan_slug: plan.slug,
      uo_billing_cycle: cycle,
    },
  });
  console.log(`    • ${cycle} price created: ${created.id} (${key})`);
  return created;
}

async function upsertPlanRow(
  plan: PlanCatalogEntry,
  monthlyPriceId: string | null,
  yearlyPriceId: string | null,
  dryRun: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error(
      "Database not available — set DATABASE_URL (or NETLIFY_DATABASE_URL) and retry."
    );
  }

  const values = {
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    priceMonthly: (plan.monthlyPriceCents / 100).toFixed(2),
    priceYearly: (plan.yearlyPriceCents / 100).toFixed(2),
    stripePriceIdMonthly: monthlyPriceId,
    stripePriceIdYearly: yearlyPriceId,
    maxProducts: plan.maxProducts,
    maxOrders: plan.maxOrders,
    maxUsers: plan.maxUsers,
    features: plan.features,
    isActive: true,
  } as const;

  const existing = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, plan.slug))
    .limit(1);

  if (existing[0]) {
    if (dryRun) {
      console.log(`  • [dry-run] would update plans.slug=${plan.slug}`);
      return;
    }
    await db.update(plans).set(values).where(eq(plans.slug, plan.slug));
    console.log(
      `  • plan row updated: id=${existing[0].id} slug=${plan.slug} ` +
        `monthly=${monthlyPriceId ?? "—"} yearly=${yearlyPriceId ?? "—"}`
    );
    return;
  }

  if (dryRun) {
    console.log(`  • [dry-run] would insert plans.slug=${plan.slug}`);
    return;
  }
  const inserted = await db.insert(plans).values(values).returning();
  console.log(
    `  • plan row inserted: id=${inserted[0]?.id} slug=${plan.slug} ` +
      `monthly=${monthlyPriceId ?? "—"} yearly=${yearlyPriceId ?? "—"}`
  );
}

async function main() {
  const args = parseArgs();
  console.log(
    `\nUnifyOne plan seeder ${args.dryRun ? "[DRY RUN]" : ""}` +
      `${args.skipStripe ? " [SKIP STRIPE]" : ""}\n`
  );

  let stripe: Stripe | null = null;
  if (!args.skipStripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is required (or pass --skip-stripe to only upsert plan rows)."
      );
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  for (const plan of PLAN_CATALOG) {
    console.log(`▸ ${plan.name} (${plan.slug})`);

    let monthlyPriceId: string | null = null;
    let yearlyPriceId: string | null = null;

    if (plan.monthlyPriceCents > 0 && stripe) {
      const product = await ensureStripeProduct(stripe, plan, args.dryRun);
      const monthly = await ensureStripePrice(
        stripe,
        product,
        plan,
        "monthly",
        args.dryRun
      );
      const yearly = await ensureStripePrice(
        stripe,
        product,
        plan,
        "yearly",
        args.dryRun
      );
      monthlyPriceId = monthly?.id ?? null;
      yearlyPriceId = yearly?.id ?? null;
    } else if (plan.monthlyPriceCents > 0 && args.skipStripe) {
      // Preserve any IDs already on the plan row when --skip-stripe is set,
      // so we don't accidentally null them out.
      const db = await getDb();
      if (db) {
        const row = await db
          .select()
          .from(plans)
          .where(eq(plans.slug, plan.slug))
          .limit(1);
        monthlyPriceId = row[0]?.stripePriceIdMonthly ?? null;
        yearlyPriceId = row[0]?.stripePriceIdYearly ?? null;
      }
      if (!monthlyPriceId && !yearlyPriceId) {
        throw new Error(
          `--skip-stripe was set but plan '${plan.slug}' has no existing ` +
            `Stripe price IDs in the DB. Refusing to write null IDs for a ` +
            `paid tier (would silently break checkout). Re-run without ` +
            `--skip-stripe so Stripe products + prices get created.`
        );
      }
      console.log(
        `  • [skip-stripe] reusing existing ids monthly=${monthlyPriceId ?? "—"} yearly=${yearlyPriceId ?? "—"}`
      );
    } else {
      console.log("  • free tier — no Stripe price needed");
    }

    await upsertPlanRow(plan, monthlyPriceId, yearlyPriceId, args.dryRun);
  }

  console.log(
    `\n✓ Done.${args.dryRun ? " (dry run — nothing was written)" : ""}\n`
  );
}

main().catch(err => {
  console.error("\n✗ Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
