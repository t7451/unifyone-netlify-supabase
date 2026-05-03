import {
  and,
  count,
  isNull,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  like,
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
  tenants,
  users,
  webhookEvents,
  type InsertStripePaymentAudit,
  type StripePaymentAudit,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
  } else if (user.openId === ENV.ownerOpenId) {
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
  // PATCHED:GDPR_DELETED_AT_FILTER — soft-deleted users must not be auth-resolvable.
  // Stale JWTs were continuing to authenticate after delete-account because this
  // lookup didn't exclude deletedAt. See GDPR audit 2026-05-03.
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.openId, openId), isNull(users.deletedAt)))
    .limit(1);
  return result[0];
}

export async function updateUserTenant(userId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ tenantId }).where(eq(users.id, userId));
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
  if (opts?.status)
    conditions.push(
      eq(products.status, opts.status as "active" | "draft" | "archived")
    );
  if (opts?.search) conditions.push(like(products.name, `%${opts.search}%`));
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
  opts?: { status?: string; limit?: number; offset?: number; search?: string }
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(orders.tenantId, tenantId)];
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
  if (opts?.search)
    conditions.push(like(orders.orderNumber, `%${opts.search}%`));
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
      totalRevenue: sum(orderItems.totalPrice),
    })
    .from(orderItems)
    .where(eq(orderItems.tenantId, tenantId))
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
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

  // onConflictDoNothing makes this safe under concurrent first-hit traffic —
  // if two requests race to seed simultaneously, the second insert silently
  // skips the conflicting rows instead of erroring or duplicating.
  const defaults: InsertGigWorkerPlan[] = [
    {
      name: "Gig Starter",
      slug: "gig-starter",
      tier: "starter",
      description: "Free forever — track shifts, log mileage, basic AI tips.",
      priceMonthly: "0.00",
      priceYearly: "0.00",
      monthlyAICredits: 25,
      features: ["shift_tracker", "mileage_log", "basic_ai"],
      isActive: true,
    },
    {
      name: "Gig Pro",
      slug: "gig-pro",
      tier: "pro",
      description:
        "For serious gig workers — route optimizer, tax export, unlimited rule engine.",
      priceMonthly: "9.99",
      priceYearly: "95.88",
      monthlyAICredits: 250,
      features: [
        "shift_tracker",
        "mileage_log",
        "basic_ai",
        "route_optimizer",
        "tax_export",
        "unlimited_rules",
        "advanced_analytics",
      ],
      isActive: true,
    },
    {
      name: "Gig Elite",
      slug: "gig-elite",
      tier: "elite",
      description:
        "Maximum earnings — unlimited AI, earnings forecast, priority support.",
      priceMonthly: "24.99",
      priceYearly: "239.88",
      monthlyAICredits: 1000,
      features: [
        "shift_tracker",
        "mileage_log",
        "basic_ai",
        "route_optimizer",
        "tax_export",
        "unlimited_rules",
        "advanced_analytics",
        "earnings_forecast",
        "ai_strategy",
        "priority_support",
      ],
      isActive: true,
    },
  ];

  await db.insert(gigWorkerPlans).values(defaults).onConflictDoNothing();
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
