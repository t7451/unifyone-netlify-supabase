import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  or as drizzleOr,
  sql,
} from "drizzle-orm";
import {
  InsertProduct,
  orderItems,
  orders,
  products,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ── Products ──────────────────────────────────────────────────────────────────
export async function getProducts(
  tenantId: number,
  opts?: {
    status?: string;
    search?: string;
    categoryId?: number;
    limit?: number;
    offset?: number;
  }
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(products.tenantId, tenantId)];
  const search = opts?.search?.trim();

  if (opts?.status)
    conditions.push(
      eq(products.status, opts.status as "active" | "draft" | "archived")
    );
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      drizzleOr(
        ilike(products.name, searchPattern),
        ilike(products.sku, searchPattern),
        ilike(products.description, searchPattern)
      )!
    );
  }
  if (opts?.categoryId)
    conditions.push(eq(products.categoryId, opts.categoryId));
  return db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

export async function getProductById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .limit(1);
  return result[0];
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(products).values(data);
  const result = await db
    .select()
    .from(products)
    .where(
      and(eq(products.tenantId, data.tenantId), eq(products.slug, data.slug))
    )
    .limit(1);
  return result[0];
}

export async function updateProduct(
  id: number,
  tenantId: number,
  data: Partial<InsertProduct>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(products)
    .set(data)
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
}

export async function deleteProduct(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(products)
    .set({ status: "archived" })
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
}

export async function bulkUpdateProductStatus(
  tenantId: number,
  ids: number[],
  status: "active" | "draft" | "archived"
) {
  const db = await getDb();
  if (!db || ids.length === 0) return 0;
  const result = await db
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(products.tenantId, tenantId), inArray(products.id, ids)));
  return result.rowCount ?? 0;
}

export async function bulkArchiveProducts(tenantId: number, ids: number[]) {
  return bulkUpdateProductStatus(tenantId, ids, "archived");
}

export async function bulkDeleteProducts(tenantId: number, ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return 0;
  const result = await db
    .delete(products)
    .where(and(eq(products.tenantId, tenantId), inArray(products.id, ids)));
  return result.rowCount ?? 0;
}

export async function bulkDeleteOrders(tenantId: number, ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return 0;

  await db
    .delete(orderItems)
    .where(
      and(eq(orderItems.tenantId, tenantId), inArray(orderItems.orderId, ids))
    );

  const result = await db
    .delete(orders)
    .where(and(eq(orders.tenantId, tenantId), inArray(orders.id, ids)));

  return result.rowCount ?? 0;
}

export async function getProductCount(tenantId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")));
  return result[0]?.count ?? 0;
}
