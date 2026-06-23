import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  inArray,
  like,
  lt as drizzleLt,
  lte as drizzleLte,
  or as drizzleOr,
  sql,
  sum,
} from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { logger } from "./_core/logger";
import { resolveDatabaseUrl } from "./lib/databaseUrl";
// drizzle/neon-http loaded dynamically in getDb() to prevent cold-start crash
import {
  analyticsEvents,
  apiKeys,
  categories,
  clippingJobs,
  clippingSubscriptions,
  clips,
  customers,
  gigAIUsage,
  gigWorkerPlans,
  gigWorkerSubscriptions,
  InsertApiKey,
  InsertClip,
  InsertClippingJob,
  InsertClippingSubscription,
  InsertGigWorkerPlan,
  InsertGigWorkerSubscription,
  InsertOrder,
  InsertProduct,
  InsertTenant,
  InsertUser,
  inventory,
  orderItems,
  orders,
  plans,
  products,
  stripePaymentAudit,
  surveyResponses,
  tenants,
  users,
  webhookEvents,
  type InsertStripePaymentAudit,
  type StripePaymentAudit,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { isMasterControlOpenId } from "./lib/masterControl";
import { computeViewedTogether } from "./lib/marketBasket";

let _db: NeonHttpDatabase | null = null;

export async function getDb() {
  if (_db) return _db;
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) return null;
  try {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle: drizzleFn } = await import("drizzle-orm/neon-http");
    const queryClient = neon(connectionString);
    _db = drizzleFn(queryClient);
  } catch (error) {
    logger.error("Database connection failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    _db = null;
  }
  return _db;
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  for (const field of ["name", "email", "loginMethod"] as const) {
    const v = user[field];
    if (v !== undefined) {
      values[field] = v ?? null;
      updateSet[field] = v ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (
    user.openId === ENV.ownerOpenId ||
    isMasterControlOpenId(user.openId)
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  // NOTE:GDPR — INTENTIONALLY return soft-deleted users so sdk.ts
  // authenticateRequest can throw ForbiddenError on user.deletedAt. Filtering
  // here would let sdk fall back to a synthetic anonymous user from the JWT
  // payload and the request would proceed (200 + account:null leak vector).
  // Filter at the auth layer, not the data layer.
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
export async function updateUserTenant(
  userId: number,
  tenantId: number,
  opts: { promoteToAdmin?: boolean } = {}
) {
  const db = await getDb();
  if (!db) return;
  // PATCHED:CR2 — when set, promote the user to role=admin so a tenant owner
  // can manage Team page (invite, role-change, member removal). Without this,
  // tenant.create silently leaves owners as role=user and the Team UI hides.
  const set: { tenantId: number; role?: "admin" } = { tenantId };
  if (opts.promoteToAdmin) set.role = "admin";
  await db.update(users).set(set).where(eq(users.id, userId));
}

// ── Plans ─────────────────────────────────────────────────────────────────────
export async function getPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plans).where(eq(plans.isActive, true));
}

export async function getPlanBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, slug))
    .limit(1);
  return result[0];
}

// ── Tenants ───────────────────────────────────────────────────────────────────
export async function createTenant(data: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(tenants).values(data).returning();
  return result[0];
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  return result[0];
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  return result[0];
}

export async function getTenantsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).where(eq(tenants.ownerId, ownerId));
}

export async function updateTenant(
  id: number,
  data: Partial<InsertTenant>,
  ownerId?: number
) {
  const db = await getDb();
  if (!db) return;
  const condition =
    ownerId !== undefined
      ? and(eq(tenants.id, id), eq(tenants.ownerId, ownerId))
      : eq(tenants.id, id);
  await db.update(tenants).set(data).where(condition);
}

export async function getTenantByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return result[0];
}

export async function getAllTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

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

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(categories)
    .where(eq(categories.tenantId, tenantId))
    .orderBy(categories.sortOrder);
}

export async function createCategory(
  tenantId: number,
  name: string,
  slug: string,
  description?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(categories).values({ tenantId, name, slug, description });
}

// ── Orders ────────────────────────────────────────────────────────────────────
export async function getOrders(
  tenantId: number,
  opts?: {
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(orders.tenantId, tenantId)];
  const search = opts?.search?.trim();

  if (opts?.status)
    conditions.push(
      eq(
        orders.status,
        opts.status as
          | "pending"
          | "confirmed"
          | "processing"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded"
      )
    );
  if (opts?.paymentStatus) {
    conditions.push(
      eq(
        orders.paymentStatus,
        opts.paymentStatus as
          | "pending"
          | "paid"
          | "failed"
          | "refunded"
          | "partial"
      )
    );
  }
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      drizzleOr(
        ilike(orders.orderNumber, searchPattern),
        ilike(orders.customerName, searchPattern),
        ilike(orders.customerEmail, searchPattern),
        sql`cast(${orders.id} as text) ilike ${searchPattern}`
      )!
    );
  }
  if (opts?.dateFrom) {
    const dateFrom = new Date(opts.dateFrom);
    if (!Number.isNaN(dateFrom.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(opts.dateFrom)) {
        dateFrom.setUTCHours(0, 0, 0, 0);
      }
      conditions.push(gte(orders.createdAt, dateFrom));
    }
  }
  if (opts?.dateTo) {
    const dateTo = new Date(opts.dateTo);
    if (!Number.isNaN(dateTo.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(opts.dateTo)) {
        dateTo.setUTCHours(23, 59, 59, 999);
      }
      conditions.push(drizzleLte(orders.createdAt, dateTo));
    }
  }

  return db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

export async function getOrderById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
    .limit(1);
  return result[0];
}

export async function getOrderWithItems(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const order = await getOrderById(id, tenantId);
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export async function createOrder(
  data: InsertOrder,
  items: {
    productId?: number;
    productName: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
  }[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(orders).values(data);
  const result = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, data.tenantId),
        eq(orders.orderNumber, data.orderNumber)
      )
    )
    .limit(1);
  const order = result[0];
  if (order && items.length > 0) {
    await db.insert(orderItems).values(
      items.map(item => ({
        orderId: order.id,
        tenantId: data.tenantId,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        totalPrice: String(item.unitPrice * item.quantity),
        imageUrl: item.imageUrl,
      }))
    );
  }
  return order;
}

export async function updateOrderStatus(
  id: number,
  tenantId: number,
  status: string,
  paymentStatus?: string
) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (paymentStatus) updateData.paymentStatus = paymentStatus;
  await db
    .update(orders)
    .set(updateData)
    .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));
}

export async function getOrderCount(tenantId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.tenantId, tenantId));
  return result[0]?.count ?? 0;
}

export async function getOrderCountThisMonth(tenantId: number) {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(
      and(eq(orders.tenantId, tenantId), gte(orders.createdAt, startOfMonth))
    );

  return result[0]?.count ?? 0;
}

export async function getUserCount(tenantId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)));

  return result[0]?.count ?? 0;
}

// ── Stripe payment audit ─────────────────────────────────────────────────────
//
// recordStripePaymentVerification is the idempotency primitive: insert an
// audit row keyed on (tenantId, idempotencyKey). On unique conflict, the
// existing row is returned instead — letting callers detect retries.
//
// Pair with linkPaymentAuditToOrder once the order row is written, and with
// markPaymentAuditOrphaned for failures so the reconcile worker can pick up
// audit rows whose order write never landed.

export async function recordStripePaymentVerification(
  data: InsertStripePaymentAudit
): Promise<{ audit: StripePaymentAudit; isReplay: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const inserted = await db
    .insert(stripePaymentAudit)
    .values(data)
    .onConflictDoNothing({
      target: [stripePaymentAudit.tenantId, stripePaymentAudit.idempotencyKey],
    })
    .returning();
  if (inserted[0]) return { audit: inserted[0], isReplay: false };
  // Conflict — fetch the existing row.
  const existing = await db
    .select()
    .from(stripePaymentAudit)
    .where(
      and(
        eq(stripePaymentAudit.tenantId, data.tenantId),
        eq(stripePaymentAudit.idempotencyKey, data.idempotencyKey)
      )
    )
    .limit(1);
  if (!existing[0]) {
    throw new Error("Stripe payment audit upsert failed: row vanished");
  }
  return { audit: existing[0], isReplay: true };
}

export async function linkPaymentAuditToOrder(
  auditId: number,
  orderId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(stripePaymentAudit)
    .set({ linkedOrderId: orderId, status: "linked", updatedAt: new Date() })
    .where(eq(stripePaymentAudit.id, auditId));
}

export async function markPaymentAuditOrphaned(
  auditId: number,
  error: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(stripePaymentAudit)
    .set({
      status: "orphaned",
      lastError: error.slice(0, 1000),
      updatedAt: new Date(),
    })
    .where(eq(stripePaymentAudit.id, auditId));
}

export async function getOrderByStripeId(
  tenantId: number,
  ids: { stripePaymentIntentId?: string; stripeSessionId?: string }
) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [eq(orders.tenantId, tenantId)];
  if (ids.stripePaymentIntentId) {
    conditions.push(
      eq(orders.stripePaymentIntentId, ids.stripePaymentIntentId)
    );
  } else if (ids.stripeSessionId) {
    conditions.push(eq(orders.stripeSessionId, ids.stripeSessionId));
  } else {
    return null;
  }
  const result = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .limit(1);
  return result[0] ?? null;
}

export async function getPendingStripeAudits(olderThan: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(stripePaymentAudit)
    .where(
      and(
        eq(stripePaymentAudit.status, "pending"),
        sql`${stripePaymentAudit.createdAt} < ${olderThan}`
      )
    );
}

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

// ── Analytics ─────────────────────────────────────────────────────────────────
export async function trackEvent(
  tenantId: number,
  eventType: string,
  data?: {
    userId?: number;
    orderId?: number;
    productId?: number;
    value?: number;
    properties?: Record<string, unknown>;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(analyticsEvents).values({
    tenantId,
    eventType,
    userId: data?.userId,
    orderId: data?.orderId,
    productId: data?.productId,
    value: data?.value ? String(data.value) : undefined,
    properties: data?.properties,
  });
}

// ── Behavioral tracking (first-party) ─────────────────────────────────────────

export type BehaviorEventInput = {
  eventType: string;
  userId?: number | null;
  orderId?: number | null;
  productId?: number | null;
  value?: number | null;
  properties?: Record<string, unknown>;
};

/**
 * Batch-insert first-party behavioral events (product views, searches, cart and
 * checkout actions, purchases) for a tenant. Returns the number of rows written.
 * No-ops gracefully when the DB is unavailable so tracking never breaks a page.
 */
export async function trackBehaviorEvents(
  tenantId: number,
  events: BehaviorEventInput[]
): Promise<number> {
  const db = await getDb();
  if (!db || events.length === 0) return 0;
  await db.insert(analyticsEvents).values(
    events.map(e => ({
      tenantId,
      eventType: e.eventType,
      userId: e.userId ?? undefined,
      orderId: e.orderId ?? undefined,
      productId: e.productId ?? undefined,
      value: e.value != null ? String(e.value) : undefined,
      properties: e.properties,
    }))
  );
  return events.length;
}

const BEHAVIOR_EVENT_FILTER = [
  "page_view",
  "product_view",
  "search",
  "add_to_cart",
  "checkout_start",
  "purchase",
];

/**
 * High-level behavior summary for the dashboard: per-stage event counts, unique
 * visitors, and the view → cart → checkout → purchase funnel for the window.
 */
export async function getBehaviorSummary(tenantId: number, days = 30) {
  const db = await getDb();
  const empty = {
    pageViews: 0,
    productViews: 0,
    searches: 0,
    addToCarts: 0,
    checkoutStarts: 0,
    purchases: 0,
    uniqueVisitors: 0,
    viewToCartRate: 0,
    cartToCheckoutRate: 0,
    checkoutToPurchaseRate: 0,
    cartAbandonment: 0,
  };
  if (!db) return empty;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      eventType: analyticsEvents.eventType,
      count: sql<number>`count(*)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        gte(analyticsEvents.createdAt, since),
        inArray(analyticsEvents.eventType, BEHAVIOR_EVENT_FILTER)
      )
    )
    .groupBy(analyticsEvents.eventType);

  const visitorRow = await db
    .select({
      visitors: sql<number>`count(distinct ${analyticsEvents.properties}->>'anonymousId')`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        gte(analyticsEvents.createdAt, since),
        inArray(analyticsEvents.eventType, BEHAVIOR_EVENT_FILTER)
      )
    );

  const byType = new Map(rows.map(r => [r.eventType, Number(r.count)]));
  const productViews = byType.get("product_view") ?? 0;
  const addToCarts = byType.get("add_to_cart") ?? 0;
  const checkoutStarts = byType.get("checkout_start") ?? 0;
  const purchases = byType.get("purchase") ?? 0;
  const rate = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

  return {
    pageViews: byType.get("page_view") ?? 0,
    productViews,
    searches: byType.get("search") ?? 0,
    addToCarts,
    checkoutStarts,
    purchases,
    uniqueVisitors: Number(visitorRow[0]?.visitors ?? 0),
    viewToCartRate: rate(addToCarts, productViews),
    cartToCheckoutRate: rate(checkoutStarts, addToCarts),
    checkoutToPurchaseRate: rate(purchases, checkoutStarts),
    cartAbandonment: rate(checkoutStarts - purchases, checkoutStarts),
  };
}

/**
 * Products ranked by how often customers *look at* them (demand intent),
 * alongside add-to-cart counts and distinct viewers, joined to product names.
 * This is the "what are they looking for" signal independent of what sold.
 */
export async function getTopViewedProducts(
  tenantId: number,
  days = 30,
  limit = 10
) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      productId: analyticsEvents.productId,
      views: sql<number>`sum(case when ${analyticsEvents.eventType} = 'product_view' then 1 else 0 end)`,
      addToCarts: sql<number>`sum(case when ${analyticsEvents.eventType} = 'add_to_cart' then 1 else 0 end)`,
      viewers: sql<number>`count(distinct case when ${analyticsEvents.eventType} = 'product_view' then ${analyticsEvents.properties}->>'anonymousId' end)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        gte(analyticsEvents.createdAt, since),
        inArray(analyticsEvents.eventType, ["product_view", "add_to_cart"]),
        sql`${analyticsEvents.productId} is not null`
      )
    )
    .groupBy(analyticsEvents.productId)
    .orderBy(
      desc(
        sql`sum(case when ${analyticsEvents.eventType} = 'product_view' then 1 else 0 end)`
      )
    )
    .limit(limit);

  const ids = rows
    .map(r => r.productId)
    .filter((id): id is number => id != null);
  const names = ids.length
    ? await db
        .select({ id: products.id, name: products.name, price: products.price })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, ids)))
    : [];
  const nameById = new Map(names.map(p => [p.id, p]));

  return rows.map(r => {
    const views = Number(r.views);
    const addToCarts = Number(r.addToCarts);
    const product = r.productId != null ? nameById.get(r.productId) : undefined;
    return {
      productId: r.productId,
      productName: product?.name ?? "Unknown product",
      price: product?.price ?? null,
      views,
      addToCarts,
      viewers: Number(r.viewers),
      viewToCartRate:
        views > 0 ? Math.round((addToCarts / views) * 1000) / 10 : 0,
    };
  });
}

/**
 * Top search queries customers typed, with distinct searchers and the average
 * number of results returned. Low-result, high-volume queries surface unmet
 * demand — products customers want but cannot find.
 */
export async function getTopSearches(tenantId: number, days = 30, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const queryExpr = sql<string>`lower(${analyticsEvents.properties}->>'query')`;

  return db
    .select({
      query: queryExpr,
      searches: sql<number>`count(*)`,
      searchers: sql<number>`count(distinct ${analyticsEvents.properties}->>'anonymousId')`,
      avgResults: sql<number>`round(avg(nullif(${analyticsEvents.properties}->>'resultCount', '')::numeric), 1)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        eq(analyticsEvents.eventType, "search"),
        gte(analyticsEvents.createdAt, since),
        sql`coalesce(${analyticsEvents.properties}->>'query', '') <> ''`
      )
    )
    .groupBy(queryExpr)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

/**
 * Unmet demand: search terms with real volume that return little or nothing
 * (avg results ≤ 1) — i.e. shoppers are asking for things you don't stock or
 * can't surface. The clearest "demand you're missing" signal, all first-party.
 */
export async function getUnmetDemand(tenantId: number, days = 30, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const queryExpr = sql<string>`lower(${analyticsEvents.properties}->>'query')`;
  const avgResultsExpr = sql`avg(nullif(${analyticsEvents.properties}->>'resultCount', '')::numeric)`;

  return db
    .select({
      query: queryExpr,
      searches: sql<number>`count(*)`,
      searchers: sql<number>`count(distinct ${analyticsEvents.properties}->>'anonymousId')`,
      avgResults: sql<number>`coalesce(round(${avgResultsExpr}, 1), 0)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        eq(analyticsEvents.eventType, "search"),
        gte(analyticsEvents.createdAt, since),
        sql`coalesce(${analyticsEvents.properties}->>'query', '') <> ''`
      )
    )
    .groupBy(queryExpr)
    .having(sql`coalesce(${avgResultsExpr}, 0) <= 1`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

/**
 * "Viewed together" — products frequently viewed by the same visitor. The
 * pairing is computed in JS (see computeViewedTogether) over a bounded set of
 * distinct (visitor, product) rows, then product names are joined in.
 */
export async function getViewedTogether(
  tenantId: number,
  days = 30,
  limit = 10
) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Bounded set of distinct (visitor, product) product-view rows.
  const rows = await db
    .selectDistinct({
      visitor: sql<string>`${analyticsEvents.properties}->>'anonymousId'`,
      productId: analyticsEvents.productId,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        eq(analyticsEvents.eventType, "product_view"),
        gte(analyticsEvents.createdAt, since),
        sql`${analyticsEvents.productId} is not null`,
        sql`coalesce(${analyticsEvents.properties}->>'anonymousId', '') <> ''`
      )
    )
    .limit(20000);

  const pairs = computeViewedTogether(rows, { limit });
  const ids = Array.from(
    new Set(pairs.flatMap(p => [p.productAId, p.productBId]))
  );
  const names = ids.length
    ? await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, ids)))
    : [];
  const nameById = new Map(names.map(p => [p.id, p.name]));

  return pairs.map(p => ({
    ...p,
    productAName: nameById.get(p.productAId) ?? "Unknown product",
    productBName: nameById.get(p.productBId) ?? "Unknown product",
  }));
}

// ── WHERE: acquisition, exits, geo ────────────────────────────────────────────

/**
 * Where visitors come from: page views grouped by first-touch acquisition
 * source (organic-search, ai:chatgpt, utm:*, referral:*, direct), with visit
 * and distinct-visitor counts.
 */
export async function getAcquisitionSources(
  tenantId: number,
  days = 30,
  limit = 12
) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sourceExpr = sql<string>`coalesce(${analyticsEvents.properties}->>'source', 'direct')`;

  return db
    .select({
      source: sourceExpr,
      visits: sql<number>`count(*)`,
      visitors: sql<number>`count(distinct ${analyticsEvents.properties}->>'anonymousId')`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        eq(analyticsEvents.eventType, "page_view"),
        gte(analyticsEvents.createdAt, since)
      )
    )
    .groupBy(sourceExpr)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

/**
 * Where visitors go when they leave: outbound link clicks grouped by
 * destination domain, with click and distinct-visitor counts.
 */
export async function getOutboundDestinations(
  tenantId: number,
  days = 30,
  limit = 12
) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const destExpr = sql<string>`${analyticsEvents.properties}->>'destination'`;

  return db
    .select({
      destination: destExpr,
      clicks: sql<number>`count(*)`,
      visitors: sql<number>`count(distinct ${analyticsEvents.properties}->>'anonymousId')`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        eq(analyticsEvents.eventType, "outbound_click"),
        gte(analyticsEvents.createdAt, since),
        sql`coalesce(${analyticsEvents.properties}->>'destination', '') <> ''`
      )
    )
    .groupBy(destExpr)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

/**
 * Where visitors are located: distinct visitors grouped by country (coarse,
 * edge-derived geo). Scoped to behavioral events within the window.
 */
export async function getGeoBreakdown(tenantId: number, days = 30, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const countryExpr = sql<string>`${analyticsEvents.properties}->>'country'`;

  return db
    .select({
      country: countryExpr,
      visitors: sql<number>`count(distinct ${analyticsEvents.properties}->>'anonymousId')`,
      events: sql<number>`count(*)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        gte(analyticsEvents.createdAt, since),
        sql`coalesce(${analyticsEvents.properties}->>'country', '') <> ''`
      )
    )
    .groupBy(countryExpr)
    .orderBy(
      desc(sql`count(distinct ${analyticsEvents.properties}->>'anonymousId')`)
    )
    .limit(limit);
}

// ── WHAT (depth) + WHY (funnel) ───────────────────────────────────────────────

/**
 * Product engagement depth: average dwell time (seconds) and max scroll depth
 * (%) per product, from product_engagement events — how *intensely* shoppers
 * look at each product, not just whether they opened it.
 */
export async function getProductEngagement(
  tenantId: number,
  days = 30,
  limit = 10
) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dwellAvg = sql`avg(nullif(${analyticsEvents.properties}->>'dwellMs', '')::numeric)`;

  const rows = await db
    .select({
      productId: analyticsEvents.productId,
      avgDwellMs: sql<number>`round(${dwellAvg})`,
      avgScrollPct: sql<number>`round(avg(nullif(${analyticsEvents.properties}->>'scrollPct', '')::numeric))`,
      samples: sql<number>`count(*)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        eq(analyticsEvents.eventType, "product_engagement"),
        gte(analyticsEvents.createdAt, since),
        sql`${analyticsEvents.productId} is not null`
      )
    )
    .groupBy(analyticsEvents.productId)
    .orderBy(desc(dwellAvg))
    .limit(limit);

  const ids = rows
    .map(r => r.productId)
    .filter((id): id is number => id != null);
  const names = ids.length
    ? await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, ids)))
    : [];
  const nameById = new Map(names.map(p => [p.id, p.name]));

  return rows.map(r => ({
    productId: r.productId,
    productName:
      (r.productId != null ? nameById.get(r.productId) : undefined) ??
      "Unknown product",
    avgDwellSec: Math.round(Number(r.avgDwellMs ?? 0) / 1000),
    avgScrollPct: Number(r.avgScrollPct ?? 0),
    samples: Number(r.samples),
  }));
}

/**
 * Session-level funnel: distinct visitors who reached each stage (viewed a
 * product → added to cart → started checkout → purchased) and the drop-off
 * rate between stages. Answers "where exactly are shoppers falling out".
 */
export async function getFunnelDropoff(tenantId: number, days = 30) {
  const db = await getDb();
  const empty = {
    viewed: 0,
    carted: 0,
    checkedOut: 0,
    purchased: 0,
    viewToCart: 0,
    cartToCheckout: 0,
    checkoutToPurchase: 0,
  };
  if (!db) return empty;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const anon = sql`${analyticsEvents.properties}->>'anonymousId'`;

  const rows = await db
    .select({
      viewed: sql<number>`count(distinct case when ${analyticsEvents.eventType} = 'product_view' then ${anon} end)`,
      carted: sql<number>`count(distinct case when ${analyticsEvents.eventType} = 'add_to_cart' then ${anon} end)`,
      checkedOut: sql<number>`count(distinct case when ${analyticsEvents.eventType} = 'checkout_start' then ${anon} end)`,
      purchased: sql<number>`count(distinct case when ${analyticsEvents.eventType} = 'purchase' then ${anon} end)`,
    })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tenantId, tenantId),
        gte(analyticsEvents.createdAt, since)
      )
    );

  const r = rows[0];
  if (!r) return empty;
  const viewed = Number(r.viewed ?? 0);
  const carted = Number(r.carted ?? 0);
  const checkedOut = Number(r.checkedOut ?? 0);
  const purchased = Number(r.purchased ?? 0);
  const rate = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

  return {
    viewed,
    carted,
    checkedOut,
    purchased,
    // Drop-off % between consecutive stages (share lost at each step).
    viewToCart: rate(viewed - carted, viewed),
    cartToCheckout: rate(carted - checkedOut, carted),
    checkoutToPurchase: rate(checkedOut - purchased, checkedOut),
  };
}

// ── WHY: voice-of-customer microsurveys ───────────────────────────────────────

export type SurveyResponseInput = {
  surveyType: "exit_intent" | "post_purchase" | "custom";
  question: string;
  answer?: string | null;
  rating?: number | null;
  anonymousId?: string | null;
  userId?: number | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
};

/** Record a single microsurvey response. No-ops when the DB is unavailable. */
export async function insertSurveyResponse(
  tenantId: number,
  input: SurveyResponseInput
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(surveyResponses).values({
    tenantId,
    surveyType: input.surveyType,
    question: input.question,
    answer: input.answer ?? undefined,
    rating: input.rating ?? undefined,
    anonymousId: input.anonymousId ?? undefined,
    userId: input.userId ?? undefined,
    path: input.path ?? undefined,
    metadata: input.metadata,
  });
}

/**
 * Aggregated survey results for the dashboard: response counts per survey type,
 * the most common answers, and recent verbatim responses.
 */
export async function getSurveyResults(
  tenantId: number,
  days = 30,
  limit = 20
) {
  const db = await getDb();
  const empty = {
    total: 0,
    byType: [] as Array<{ surveyType: string; responses: number }>,
    topAnswers: [] as Array<{
      surveyType: string;
      answer: string;
      count: number;
    }>,
    recent: [] as Array<{
      id: number;
      surveyType: string;
      question: string;
      answer: string | null;
      rating: number | null;
      createdAt: Date;
    }>,
  };
  if (!db) return empty;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [byType, topAnswers, recent] = await Promise.all([
    db
      .select({
        surveyType: surveyResponses.surveyType,
        responses: count(),
      })
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.tenantId, tenantId),
          gte(surveyResponses.createdAt, since)
        )
      )
      .groupBy(surveyResponses.surveyType),
    db
      .select({
        surveyType: surveyResponses.surveyType,
        answer: surveyResponses.answer,
        count: count(),
      })
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.tenantId, tenantId),
          gte(surveyResponses.createdAt, since),
          sql`coalesce(${surveyResponses.answer}, '') <> ''`
        )
      )
      .groupBy(surveyResponses.surveyType, surveyResponses.answer)
      .orderBy(desc(count()))
      .limit(limit),
    db
      .select({
        id: surveyResponses.id,
        surveyType: surveyResponses.surveyType,
        question: surveyResponses.question,
        answer: surveyResponses.answer,
        rating: surveyResponses.rating,
        createdAt: surveyResponses.createdAt,
      })
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.tenantId, tenantId),
          gte(surveyResponses.createdAt, since)
        )
      )
      .orderBy(desc(surveyResponses.createdAt))
      .limit(limit),
  ]);

  return {
    total: byType.reduce((s, r) => s + Number(r.responses), 0),
    byType: byType.map(r => ({
      surveyType: r.surveyType,
      responses: Number(r.responses),
    })),
    topAnswers: topAnswers.map(r => ({
      surveyType: r.surveyType,
      answer: r.answer ?? "",
      count: Number(r.count),
    })),
    recent,
  };
}

export async function getAnalyticsSummary(tenantId: number, days = 30) {
  const db = await getDb();
  if (!db) return null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totalRevenue, orderCount, customerCount, productCount] =
    await Promise.all([
      db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(
            eq(orders.tenantId, tenantId),
            eq(orders.paymentStatus, "paid"),
            gte(orders.createdAt, since)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(
          and(eq(orders.tenantId, tenantId), gte(orders.createdAt, since))
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(eq(customers.tenantId, tenantId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(
          and(eq(products.tenantId, tenantId), eq(products.status, "active"))
        ),
    ]);

  return {
    totalRevenue: Number(totalRevenue[0]?.total ?? 0),
    orderCount: Number(orderCount[0]?.count ?? 0),
    customerCount: Number(customerCount[0]?.count ?? 0),
    productCount: Number(productCount[0]?.count ?? 0),
  };
}

export async function getRevenueByDay(tenantId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      date: sql<string>`DATE(${orders.createdAt})`,
      revenue: sum(orders.total),
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.paymentStatus, "paid"),
        gte(orders.createdAt, since)
      )
    )
    .groupBy(sql`DATE(${orders.createdAt})`)
    .orderBy(sql`DATE(${orders.createdAt})`);
}

export async function getTopProducts(tenantId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      productName: orderItems.productName,
      productId: orderItems.productId,
      totalQuantity: sql<number>`sum(${orderItems.quantity})`,
      orderCount: sql<number>`count(distinct ${orderItems.orderId})`,
      totalRevenue: sum(orderItems.totalPrice),
    })
    .from(orderItems)
    .where(eq(orderItems.tenantId, tenantId))
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);
}

function getMonthStart(offset = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

function calculatePercentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export async function getDashboardOverview(tenantId: number) {
  const db = await getDb();
  if (!db) {
    return {
      revenueThisMonth: 0,
      revenueLastMonth: 0,
      revenueChangePct: 0,
      ordersThisMonth: 0,
      ordersLastMonth: 0,
      ordersChangePct: 0,
      customersTotal: 0,
      customersNewThisMonth: 0,
      paidOrdersThisMonth: 0,
      paidOrdersLastMonth: 0,
      totalOrdersThisMonth: 0,
      totalOrdersLastMonth: 0,
      conversionRateThisMonth: 0,
      conversionRateLastMonth: 0,
      totalOrdersAllTime: 0,
    };
  }

  const currentMonthStart = getMonthStart(0);
  const nextMonthStart = getMonthStart(1);
  const previousMonthStart = getMonthStart(-1);

  const [
    revenueThisMonthRow,
    revenueLastMonthRow,
    ordersThisMonthRow,
    ordersLastMonthRow,
    customersTotalRow,
    customersNewThisMonthRow,
    paidOrdersThisMonthRow,
    paidOrdersLastMonthRow,
    totalOrdersAllTimeRow,
  ] = await Promise.all([
    db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.paymentStatus, "paid"),
          gte(orders.createdAt, currentMonthStart),
          drizzleLt(orders.createdAt, nextMonthStart)
        )
      ),
    db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.paymentStatus, "paid"),
          gte(orders.createdAt, previousMonthStart),
          drizzleLt(orders.createdAt, currentMonthStart)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          gte(orders.createdAt, currentMonthStart),
          drizzleLt(orders.createdAt, nextMonthStart)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          gte(orders.createdAt, previousMonthStart),
          drizzleLt(orders.createdAt, currentMonthStart)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(eq(customers.tenantId, tenantId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          gte(customers.createdAt, currentMonthStart),
          drizzleLt(customers.createdAt, nextMonthStart)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.paymentStatus, "paid"),
          gte(orders.createdAt, currentMonthStart),
          drizzleLt(orders.createdAt, nextMonthStart)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.paymentStatus, "paid"),
          gte(orders.createdAt, previousMonthStart),
          drizzleLt(orders.createdAt, currentMonthStart)
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.tenantId, tenantId)),
  ]);

  const revenueThisMonth = Number(revenueThisMonthRow[0]?.total ?? 0);
  const revenueLastMonth = Number(revenueLastMonthRow[0]?.total ?? 0);
  const ordersThisMonth = Number(ordersThisMonthRow[0]?.count ?? 0);
  const ordersLastMonth = Number(ordersLastMonthRow[0]?.count ?? 0);
  const customersTotal = Number(customersTotalRow[0]?.count ?? 0);
  const customersNewThisMonth = Number(customersNewThisMonthRow[0]?.count ?? 0);
  const paidOrdersThisMonth = Number(paidOrdersThisMonthRow[0]?.count ?? 0);
  const paidOrdersLastMonth = Number(paidOrdersLastMonthRow[0]?.count ?? 0);
  const totalOrdersAllTime = Number(totalOrdersAllTimeRow[0]?.count ?? 0);
  const conversionRateThisMonth =
    ordersThisMonth > 0 ? (paidOrdersThisMonth / ordersThisMonth) * 100 : 0;
  const conversionRateLastMonth =
    ordersLastMonth > 0 ? (paidOrdersLastMonth / ordersLastMonth) * 100 : 0;

  return {
    revenueThisMonth,
    revenueLastMonth,
    revenueChangePct: calculatePercentChange(
      revenueThisMonth,
      revenueLastMonth
    ),
    ordersThisMonth,
    ordersLastMonth,
    ordersChangePct: calculatePercentChange(ordersThisMonth, ordersLastMonth),
    customersTotal,
    customersNewThisMonth,
    paidOrdersThisMonth,
    paidOrdersLastMonth,
    totalOrdersThisMonth: ordersThisMonth,
    totalOrdersLastMonth: ordersLastMonth,
    conversionRateThisMonth,
    conversionRateLastMonth,
    totalOrdersAllTime,
  };
}

export async function getTopProductsSummary(tenantId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];

  const currentMonthStart = getMonthStart(0);
  const nextMonthStart = getMonthStart(1);

  return db
    .select({
      productName: orderItems.productName,
      productId: orderItems.productId,
      totalQuantity: sql<number>`sum(${orderItems.quantity})`,
      orderCount: sql<number>`count(distinct ${orderItems.orderId})`,
      totalRevenue: sum(orderItems.totalPrice),
    })
    .from(orderItems)
    .innerJoin(
      orders,
      and(
        eq(orderItems.orderId, orders.id),
        eq(orderItems.tenantId, orders.tenantId)
      )
    )
    .where(
      and(
        eq(orderItems.tenantId, tenantId),
        eq(orders.tenantId, tenantId),
        eq(orders.paymentStatus, "paid"),
        gte(orders.createdAt, currentMonthStart),
        drizzleLt(orders.createdAt, nextMonthStart)
      )
    )
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`coalesce(sum(${orderItems.totalPrice}), 0)`))
    .limit(limit);
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

/**
 * Log a webhook event scoped to a specific tenant.
 * `tenantId` is required to prevent cross-tenant data leakage when querying events.
 * For system-level events with no tenant context, use `logSystemWebhookEvent`.
 */
export async function logWebhookEvent(
  source: "stripe" | "shopify" | "n8n" | "internal",
  eventType: string,
  payload: Record<string, unknown>,
  tenantId: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(webhookEvents)
    .values({ source, eventType, payload, tenantId });
}

/**
 * Log a system-level webhook event that has no tenant association
 * (e.g. Stripe events before tenant is resolved).
 * Only use this for events that genuinely cannot be scoped to a tenant.
 */
export async function logSystemWebhookEvent(
  source: "stripe" | "shopify" | "n8n" | "internal",
  eventType: string,
  payload: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookEvents).values({ source, eventType, payload });
}

/**
 * Retrieve webhook events for a specific tenant.
 * Always requires tenantId — callers must not pass undefined.
 */
export async function getWebhookEvents(tenantId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.tenantId, tenantId))
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}

/**
 * Admin-only: retrieve webhook events across all tenants.
 * Do NOT expose this to non-admin users.
 */
export async function getAllWebhookEventsAdmin(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}

/**
 * Retrieve webhook events for a tenant with optional source/status/eventType filters.
 */
export async function getFilteredWebhookEvents(
  tenantId: number,
  opts: {
    limit?: number;
    source?: "stripe" | "shopify" | "n8n" | "internal";
    status?: "pending" | "processed" | "failed" | "skipped";
    search?: string;
  } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50, source, status, search } = opts;

  const conditions = [eq(webhookEvents.tenantId, tenantId)];
  if (source) conditions.push(eq(webhookEvents.source, source));
  if (status) conditions.push(eq(webhookEvents.status, status));
  if (search) conditions.push(ilike(webhookEvents.eventType, `%${search}%`));

  return db
    .select()
    .from(webhookEvents)
    .where(and(...conditions))
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}

/**
 * Aggregate webhook event counts by status for a tenant.
 */
export async function getWebhookStats(tenantId: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, processed: 0, failed: 0, skipped: 0 };

  const rows = await db
    .select({
      status: webhookEvents.status,
      cnt: count(webhookEvents.id),
    })
    .from(webhookEvents)
    .where(eq(webhookEvents.tenantId, tenantId))
    .groupBy(webhookEvents.status);

  const result = { total: 0, pending: 0, processed: 0, failed: 0, skipped: 0 };
  for (const row of rows) {
    const n = Number(row.cnt);
    result.total += n;
    if (row.status === "pending") result.pending = n;
    else if (row.status === "processed") result.processed = n;
    else if (row.status === "failed") result.failed = n;
    else if (row.status === "skipped") result.skipped = n;
  }
  return result;
}

/**
 * Mark a failed webhook event as pending so it can be retried.
 * Only allows retrying events that belong to the given tenant.
 */
export async function retryWebhookEvent(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(webhookEvents)
    .set({ status: "pending", error: null, processedAt: null })
    .where(and(eq(webhookEvents.id, id), eq(webhookEvents.tenantId, tenantId)));
}

// ── API Keys ──────────────────────────────────────────────────────────────────
export async function createApiKey(data: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(apiKeys).values(data).returning();
  return result[0];
}

export async function getApiKeysByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.tenantId, tenantId), sql`${apiKeys.revokedAt} IS NULL`)
    )
    .orderBy(desc(apiKeys.createdAt));
}

export async function getApiKeyByHash(keyHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), sql`${apiKeys.revokedAt} IS NULL`))
    .limit(1);
  return result[0];
}

export async function touchApiKey(id: number) {
  const db = await getDb();
  if (!db) return;
  // PATCHED:CR1 — record last-used timestamp on successful API-key auth.
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}
export async function revokeApiKey(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)));
}

export async function touchApiKeyLastUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}

// ── Gig Worker Plans ──────────────────────────────────────────────────────────
export async function getGigWorkerPlans() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(gigWorkerPlans)
    .where(eq(gigWorkerPlans.isActive, true))
    .orderBy(gigWorkerPlans.priceMonthly);
}

export async function getGigWorkerPlanBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(gigWorkerPlans)
    .where(eq(gigWorkerPlans.slug, slug))
    .limit(1);
  return rows[0];
}

export async function getGigWorkerPlanById(planId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(gigWorkerPlans)
    .where(eq(gigWorkerPlans.id, planId))
    .limit(1);
  return rows[0];
}

// ── Gig Worker Subscriptions ──────────────────────────────────────────────────
export async function getGigWorkerSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(gigWorkerSubscriptions)
    .where(eq(gigWorkerSubscriptions.userId, userId))
    .limit(1);
  return rows[0];
}

export async function upsertGigWorkerSubscription(
  data: InsertGigWorkerSubscription
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(gigWorkerSubscriptions)
    .values(data)
    .onConflictDoUpdate({
      target: gigWorkerSubscriptions.userId,
      set: {
        planId: data.planId,
        status: data.status,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        trialEnd: data.trialEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    });
}

// ── Gig AI Usage ──────────────────────────────────────────────────────────────
/** Returns or initialises the usage row for the given user + billing period. */
export async function getGigAIUsage(userId: number, billingPeriod: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(gigAIUsage)
    .where(
      and(
        eq(gigAIUsage.userId, userId),
        eq(gigAIUsage.billingPeriod, billingPeriod)
      )
    )
    .limit(1);
  return rows[0];
}

/** Increments the requestsUsed and tokensUsed counters for the current period. */
export async function incrementGigAIUsage(
  userId: number,
  billingPeriod: string,
  tokens: number,
  context?: string
) {
  const db = await getDb();
  if (!db) return;

  // Use INSERT … ON CONFLICT DO UPDATE so both the initial-insert and
  // the subsequent-increment paths are a single atomic DB round-trip.
  // This eliminates the race condition where two concurrent callers both
  // observe "no row" and both insert, creating a duplicate.
  await db
    .insert(gigAIUsage)
    .values({
      userId,
      billingPeriod,
      requestsUsed: 1,
      tokensUsed: tokens,
      ...(context !== undefined ? { lastContext: context } : {}),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [gigAIUsage.userId, gigAIUsage.billingPeriod],
      set: {
        requestsUsed: sql`${gigAIUsage.requestsUsed} + 1`,
        tokensUsed: sql`${gigAIUsage.tokensUsed} + ${tokens}`,
        ...(context !== undefined ? { lastContext: context } : {}),
        updatedAt: new Date(),
      },
    });
}

/** Seed the gig worker default plans if the table is empty. */
export async function seedGigWorkerPlans(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // onConflictDoUpdate refreshes the marketing fields on every deploy so the
  // code is the single source of truth for pricing/features — while preserving
  // the Stripe price IDs (seeded separately) by NOT including them in the set.
  const defaults: InsertGigWorkerPlan[] = [
    {
      name: "Gig Starter",
      slug: "gig-starter",
      tier: "starter",
      description:
        "Free forever — track shifts, log mileage, and run every gig-tax calculator.",
      priceMonthly: "0.00",
      priceYearly: "0.00",
      monthlyAICredits: 25,
      features: ["shift_tracker", "mileage_log", "tax_calculators"],
      isActive: true,
    },
    {
      name: "Gig Pro",
      slug: "gig-pro",
      tier: "pro",
      description:
        "Everything in Starter, plus unlimited saved history, a year-round tax dashboard, priority support — and the AI tools the moment they ship, included.",
      priceMonthly: "4.99",
      priceYearly: "49.00",
      monthlyAICredits: 250,
      features: [
        "shift_tracker",
        "mileage_log",
        "tax_calculators",
        "unlimited_history",
        "tax_dashboard",
        "priority_support",
        "early_ai_access",
      ],
      isActive: true,
    },
    {
      // Hidden at launch (isActive=false) until the AI features are real — kept
      // so its slug/Stripe IDs persist for an easy re-activation later.
      name: "Gig Elite",
      slug: "gig-elite",
      tier: "elite",
      description:
        "Coming soon — full AI earnings strategy, route optimization, and forecasting.",
      priceMonthly: "9.99",
      priceYearly: "99.00",
      monthlyAICredits: 1000,
      features: [
        "shift_tracker",
        "mileage_log",
        "tax_calculators",
        "unlimited_history",
        "tax_dashboard",
        "priority_support",
        "early_ai_access",
      ],
      isActive: false,
    },
  ];

  await db
    .insert(gigWorkerPlans)
    .values(defaults)
    .onConflictDoUpdate({
      target: gigWorkerPlans.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        tier: sql`excluded.tier`,
        priceMonthly: sql`excluded."priceMonthly"`,
        priceYearly: sql`excluded."priceYearly"`,
        monthlyAICredits: sql`excluded."monthlyAICredits"`,
        features: sql`excluded.features`,
        isActive: sql`excluded."isActive"`,
        updatedAt: new Date(),
      },
    });
}

// ── Clippers ────────────────────────────────────────────────────────────────────
export async function createClippingJob(data: InsertClippingJob) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.insert(clippingJobs).values(data).returning();
  return rows[0];
}

export async function getClippingJobById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(clippingJobs)
    .where(and(eq(clippingJobs.id, id), eq(clippingJobs.tenantId, tenantId)))
    .limit(1);
  return rows[0];
}

export async function listClippingJobsForUser(
  userId: number,
  tenantId: number,
  opts?: { limit?: number; offset?: number }
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(clippingJobs)
    .where(
      and(eq(clippingJobs.userId, userId), eq(clippingJobs.tenantId, tenantId))
    )
    .orderBy(desc(clippingJobs.createdAt))
    .limit(opts?.limit ?? 20)
    .offset(opts?.offset ?? 0);
}

export async function listAllClippingJobs(opts?: {
  tenantId?: number;
  status?: (typeof clippingJobs.$inferSelect)["status"];
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.tenantId !== undefined)
    conditions.push(eq(clippingJobs.tenantId, opts.tenantId));
  if (opts?.status) conditions.push(eq(clippingJobs.status, opts.status));

  return db
    .select()
    .from(clippingJobs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(clippingJobs.createdAt))
    .limit(opts?.limit ?? 100)
    .offset(opts?.offset ?? 0);
}

export async function updateClippingJobStatus(
  id: number,
  tenantId: number,
  data: Partial<InsertClippingJob>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(clippingJobs)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(clippingJobs.id, id), eq(clippingJobs.tenantId, tenantId)));
}

export async function insertClip(data: InsertClip) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.insert(clips).values(data).returning();
  return rows[0];
}

export async function listClipsForJob(jobId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(clips)
    .where(and(eq(clips.jobId, jobId), eq(clips.tenantId, tenantId)))
    .orderBy(clips.index);
}

export async function getClippingSubscriptionForTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(clippingSubscriptions)
    .where(eq(clippingSubscriptions.tenantId, tenantId))
    .limit(1);
  return rows[0];
}

export async function upsertClippingSubscription(
  data: InsertClippingSubscription
) {
  const db = await getDb();
  if (!db) return;

  await db
    .insert(clippingSubscriptions)
    .values(data)
    .onConflictDoUpdate({
      target: clippingSubscriptions.tenantId,
      set: {
        userId: data.userId,
        plan: data.plan,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripeCustomerId: data.stripeCustomerId,
        stripePriceId: data.stripePriceId,
        status: data.status,
        monthlyJobQuota: data.monthlyJobQuota,
        jobsUsedThisPeriod: data.jobsUsedThisPeriod,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        updatedAt: new Date(),
      },
    });
}

export async function incrementClippingUsage(
  tenantId: number,
  now = new Date()
) {
  const db = await getDb();
  if (!db) return;

  const current = await getClippingSubscriptionForTenant(tenantId);
  if (!current) return;

  const isNewPeriod = current.periodEnd <= now;
  const nextPeriodStart = isNewPeriod
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    : current.periodStart;
  const nextPeriodEnd = isNewPeriod
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    : current.periodEnd;
  const nextUsage = isNewPeriod ? 1 : current.jobsUsedThisPeriod + 1;

  await db
    .update(clippingSubscriptions)
    .set({
      jobsUsedThisPeriod: nextUsage,
      periodStart: nextPeriodStart,
      periodEnd: nextPeriodEnd,
      updatedAt: now,
    })
    .where(eq(clippingSubscriptions.tenantId, tenantId));
}
