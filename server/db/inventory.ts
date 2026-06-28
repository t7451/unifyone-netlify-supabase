import { and, eq, sql } from "drizzle-orm";
import { inventory, products } from "../../drizzle/schema";
import { getDb } from "./connection";

// ── Inventory ─────────────────────────────────────────────────────────────────
export async function getInventory(tenantId: number, productId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(inventory.tenantId, tenantId)];
  if (productId) conditions.push(eq(inventory.productId, productId));
  return db
    .select()
    .from(inventory)
    .where(and(...conditions));
}

export async function upsertInventory(
  tenantId: number,
  productId: number,
  quantity: number,
  threshold?: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(inventory)
    .values({
      tenantId,
      productId,
      quantity,
      lowStockThreshold: threshold ?? 10,
    })
    .onConflictDoUpdate({
      target: inventory.id,
      set: { quantity, lowStockThreshold: threshold ?? 10 },
    });
}

export async function getLowStockProducts(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ product: products, inv: inventory })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .where(
      and(
        eq(inventory.tenantId, tenantId),
        sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`
      )
    );
}
