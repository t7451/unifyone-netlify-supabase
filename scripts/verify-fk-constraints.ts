/**
 * scripts/verify-fk-constraints.ts
 *
 * Queries the PostgreSQL system catalog to confirm all 14 foreign key
 * constraints added in migration 0026 are active.
 *
 * Run with:
 *   DATABASE_URL=<your-db-url> npx ts-node scripts/verify-fk-constraints.ts
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

const EXPECTED_CONSTRAINTS = [
  "fk_users_tenant",
  "fk_tenants_owner",
  "fk_tenants_plan",
  "fk_categories_tenant",
  "fk_products_tenant",
  "fk_products_category",
  "fk_inventory_product",
  "fk_inventory_tenant",
  "fk_orders_tenant",
  "fk_orders_customer",
  "fk_order_items_order",
  "fk_order_items_tenant",
  "fk_order_items_product",
  "fk_webhook_events_tenant",
] as const;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  const result = await db.execute(sql`
    SELECT conname AS constraint_name
    FROM pg_constraint
    WHERE contype = 'f'
      AND conname = ANY(ARRAY[${sql.raw(
        EXPECTED_CONSTRAINTS.map(c => `'${c}'`).join(", ")
      )}])
    ORDER BY conname
  `);

  const found = new Set((result.rows as { constraint_name: string }[]).map(r => r.constraint_name));
  const missing = EXPECTED_CONSTRAINTS.filter(c => !found.has(c));

  console.log(`\nFK Constraint Verification`);
  console.log(`══════════════════════════`);
  console.log(`Expected : ${EXPECTED_CONSTRAINTS.length}`);
  console.log(`Found    : ${found.size}`);
  console.log(`Missing  : ${missing.length}`);

  if (missing.length > 0) {
    console.error("\n❌ Missing constraints:");
    for (const c of missing) {
      console.error(`   • ${c}`);
    }
    console.error("\nRun migrations 0026+ to add the missing constraints.");
    process.exit(1);
  }

  console.log("\n✅ All expected FK constraints are active.");

  /*
   * Cascade behaviour summary (for documentation):
   *
   * fk_users_tenant          users.tenantId      → tenants.id      SET NULL
   * fk_tenants_owner         tenants.ownerId      → users.id        RESTRICT
   * fk_tenants_plan          tenants.planId       → plans.id        SET NULL
   * fk_categories_tenant     categories.tenantId  → tenants.id      CASCADE
   * fk_products_tenant       products.tenantId    → tenants.id      CASCADE
   * fk_products_category     products.categoryId  → categories.id   SET NULL
   * fk_inventory_product     inventory.productId  → products.id     CASCADE
   * fk_inventory_tenant      inventory.tenantId   → tenants.id      CASCADE
   * fk_orders_tenant         orders.tenantId      → tenants.id      CASCADE
   * fk_orders_customer       orders.customerId    → customers.id    SET NULL
   * fk_order_items_order     order_items.orderId  → orders.id       CASCADE
   * fk_order_items_tenant    order_items.tenantId → tenants.id      CASCADE
   * fk_order_items_product   order_items.productId → products.id    SET NULL
   * fk_webhook_events_tenant webhook_events.tenantId → tenants.id   CASCADE
   */

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
