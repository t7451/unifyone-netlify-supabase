import { and, desc, eq, like, sql } from "drizzle-orm";
import { customers, orders } from "../../drizzle/schema";
import { getDb } from "./connection";

// ── Customers ─────────────────────────────────────────────────────────────────
export async function getCustomers(
  tenantId: number,
  opts?: { limit?: number; offset?: number; search?: string }
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(customers.tenantId, tenantId)];
  if (opts?.search) conditions.push(like(customers.email, `%${opts.search}%`));
  return db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

export async function getCustomerById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getOrdersByCustomerEmail(
  tenantId: number,
  email: string
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tenantId), eq(orders.customerEmail, email)))
    .orderBy(desc(orders.createdAt))
    .limit(20);
}

export async function updateCustomer(
  id: number,
  tenantId: number,
  data: Partial<typeof customers.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
}

export async function upsertCustomer(
  tenantId: number,
  email: string,
  data: Partial<typeof customers.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  // Conflict target is the (tenantId, email) unique index added in migration 0023.
  // Previously this used customers.id (the PK) which never conflicted on INSERT,
  // causing duplicate customer rows per email per tenant.
  await db
    .insert(customers)
    .values({ tenantId, email, ...data })
    .onConflictDoUpdate({
      target: [customers.tenantId, customers.email],
      set: { ...data, updatedAt: new Date() },
    });
}

export async function getCustomerCount(tenantId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(eq(customers.tenantId, tenantId));
  return result[0]?.count ?? 0;
}
