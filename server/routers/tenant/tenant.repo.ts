import { count, eq } from "drizzle-orm";
import {
  kaiCreditLedger,
  products,
  type InsertProduct,
} from "../../../drizzle/schema";
import {
  createTenant,
  getAllTenants,
  getDb,
  getPlans,
  getTenantById,
  getTenantsByOwner,
  getTenantBySlug,
  updateTenant,
  updateUserTenant,
  createProduct,
  upsertInventory,
  createOrder,
  upsertCustomer,
  createCategory,
  getProductCount,
  getOrderCountThisMonth,
  getUserCount,
} from "../../db";

/**
 * Data access for the tenant router.
 *
 * Re-exports the existing `../../db` helpers (relocated, not rewritten) and
 * adds thin wrappers for the few inline Drizzle queries the original router
 * performed directly (Kai welcome credit grant, demo-product seeding). Every
 * tenant-scoped query keeps its existing `tenantId` filter exactly.
 */

export {
  createTenant,
  getAllTenants,
  getDb,
  getPlans,
  getTenantById,
  getTenantsByOwner,
  getTenantBySlug,
  updateTenant,
  updateUserTenant,
  createProduct,
  upsertInventory,
  createOrder,
  upsertCustomer,
  createCategory,
  getProductCount,
  getOrderCountThisMonth,
  getUserCount,
};

/**
 * Insert the 25-credit Kai welcome bonus ledger row. Idempotent via
 * idempotencyKey. Returns false when the DB is unavailable.
 */
export async function insertKaiWelcomeBonus(
  tenantId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db
    .insert(kaiCreditLedger)
    .values({
      tenantId,
      userId,
      type: "adjustment",
      creditDelta: 25,
      idempotencyKey: `kai_welcome_bonus:${tenantId}:${userId}`,
      description: "Welcome bonus — 25 free Kai credits",
    })
    .onConflictDoNothing({ target: kaiCreditLedger.idempotencyKey });
  return true;
}

/** Count products for a tenant (used to guard the demo-seed path). */
export async function countProductsForTenant(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  tenantId: number
): Promise<number> {
  const [{ productCount }] = await db
    .select({ productCount: count() })
    .from(products)
    .where(eq(products.tenantId, tenantId));
  return productCount;
}

/** Bulk-insert demo products for a tenant. */
export async function insertDemoProducts(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  demoProducts: InsertProduct[]
): Promise<void> {
  await db.insert(products).values(demoProducts);
}
