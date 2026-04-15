/**
 * Seed Stripe with three subscription tiers.
 * Uses lookup_key on prices so code references keys rather than IDs.
 *
 * Usage: npx tsx scripts/seed-stripe-products.ts
 */
import "dotenv/config";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "../server/_core/stripeClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

const tiers = [
  {
    name: "Starter",
    amount: 2900,
    lookup: "starter_monthly",
    meta: { tier: "starter", credits: "100", max_stores: "5" },
  },
  {
    name: "Pro",
    amount: 4900,
    lookup: "pro_monthly",
    meta: { tier: "pro", credits: "300", max_stores: "25" },
  },
  {
    name: "Enterprise",
    amount: 9900,
    lookup: "enterprise_monthly",
    meta: { tier: "enterprise", credits: "1000", max_stores: "-1" },
  },
];

async function seed() {
  console.log("Seeding Stripe products and prices...\n");

  for (const t of tiers) {
    const product = await stripe.products.create({
      name: `UnifyOne ${t.name}`,
      metadata: t.meta,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: t.amount,
      currency: "usd",
      recurring: { interval: "month" },
      lookup_key: t.lookup,
    });

    console.log(
      `  ✓ ${t.name}: product=${product.id}, price=${price.id}, lookup=${t.lookup}`
    );
  }

  console.log("\nDone! Update subscription_tiers table stripe_price_id values to match.");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
