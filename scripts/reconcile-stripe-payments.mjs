#!/usr/bin/env node

/**
 * Reconcile Stripe Payment Audits Script
 *
 * Walks the stripe_payment_audit table and resolves rows whose linked order
 * never landed:
 *
 *   1. Audit row is `pending` and older than the grace window:
 *      - If a matching order exists (by stripePaymentIntentId or stripeSessionId),
 *        link it. The order write succeeded but the link update was lost
 *        (network drop, etc.) — recoverable.
 *      - Otherwise, mark `orphaned`. The Stripe payment captured but no
 *        order row was ever written. These need human review or manual
 *        order creation.
 *
 *   2. Audit row is already `linked` — skip.
 *
 * Run on a schedule (every 5–10 min). Idempotent.
 *
 * Usage: DATABASE_URL=<url> node scripts/reconcile-stripe-payments.mjs
 *        Optional: GRACE_SECONDS=300 (default 300)
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
const GRACE_SECONDS = Number(process.env.GRACE_SECONDS ?? 300);

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function reconcile() {
  console.log("🔌 Connecting to database…");
  await sql`SELECT 1`;
  console.log(`✅ Connected. Grace window: ${GRACE_SECONDS}s`);

  const pending = await sql`
    SELECT id, "tenantId", "stripePaymentIntentId", "stripeSessionId", "createdAt"
    FROM stripe_payment_audit
    WHERE status = 'pending'
      AND "createdAt" < (NOW() - (${GRACE_SECONDS} || ' seconds')::interval)
  `;

  if (pending.length === 0) {
    console.log("✅ No pending audit rows past the grace window.");
    return;
  }

  console.log(`Found ${pending.length} pending audit row(s) to reconcile.`);

  let linked = 0;
  let orphaned = 0;

  for (const row of pending) {
    const lookup = row.stripePaymentIntentId
      ? await sql`
          SELECT id FROM orders
          WHERE "tenantId" = ${row.tenantId}
            AND "stripePaymentIntentId" = ${row.stripePaymentIntentId}
          LIMIT 1
        `
      : row.stripeSessionId
      ? await sql`
          SELECT id FROM orders
          WHERE "tenantId" = ${row.tenantId}
            AND "stripeSessionId" = ${row.stripeSessionId}
          LIMIT 1
        `
      : [];

    if (lookup[0]) {
      await sql`
        UPDATE stripe_payment_audit
        SET "linkedOrderId" = ${lookup[0].id},
            status = 'linked',
            "updatedAt" = NOW()
        WHERE id = ${row.id}
      `;
      console.log(`  ✓ Audit #${row.id} → linked to order #${lookup[0].id}`);
      linked++;
    } else {
      await sql`
        UPDATE stripe_payment_audit
        SET status = 'orphaned',
            "lastError" = 'Reconcile: no matching order found within grace window',
            "updatedAt" = NOW()
        WHERE id = ${row.id}
      `;
      console.warn(
        `  ⚠ Audit #${row.id} (tenant ${row.tenantId}, pi=${row.stripePaymentIntentId ?? "—"}, cs=${row.stripeSessionId ?? "—"}) → ORPHANED — Stripe captured but no UnifyOne order exists.`
      );
      orphaned++;
    }
  }

  console.log(`\n✅ Reconciled ${linked} linked, ${orphaned} orphaned.`);
  if (orphaned > 0) {
    console.log(
      "Orphaned rows require manual review (likely refund or manual order creation)."
    );
  }
}

reconcile().catch(err => {
  console.error("❌ Reconcile failed:", err.message);
  process.exit(1);
});
