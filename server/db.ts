import { and, desc, eq, gte, like, lt, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  analyticsEvents,
  cartItems,
  categories,
  customers,
  InsertOrder,
  InsertProduct,
  InsertTenant,
  InsertUser,
  inventory,
  orderItems,
  orders,
  plans,
  products,
  tenants,
  users,
  webhookEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("mysql")) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
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
    if (v !== undefined) { values[field] = v ?? null; updateSet[field] = v ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
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
  const result = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
  return result[0];
}

// ── Tenants ───────────────────────────────────────────────────────────────────
export async function createTenant(data: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(tenants).values(data);
  return result[0];
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return result[0];
}

export async function getTenantsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).where(eq(tenants.ownerId, ownerId));
}

export async function updateTenant(id: number, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tenants).set(data).where(eq(tenants.id, id));
}

export async function getAllTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

// ── Products ──────────────────────────────────────────────────────────────────
export async function getProducts(tenantId: number, opts?: { status?: string; search?: string; categoryId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(products.tenantId, tenantId)];
  if (opts?.status) conditions.push(eq(products.status, opts.status as "active" | "draft" | "archived"));
  if (opts?.search) conditions.push(like(products.name, `%${opts.search}%`));
  if (opts?.categoryId) conditions.push(eq(products.categoryId, opts.categoryId));
  return db.select().from(products).where(and(...conditions)).orderBy(desc(products.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}

export async function getProductById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(and(eq(products.id, id), eq(products.tenantId, tenantId))).limit(1);
  return result[0];
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(products).values(data);
  const result = await db.select().from(products).where(and(eq(products.tenantId, data.tenantId), eq(products.slug, data.slug))).limit(1);
  return result[0];
}

export async function updateProduct(id: number, tenantId: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) return;
  await db.update(products).set(data).where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
}

export async function deleteProduct(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(products).set({ status: "archived" }).where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
}

export async function getProductCount(tenantId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(products).where(and(eq(products.tenantId, tenantId), eq(products.status, "active")));
  return result[0]?.count ?? 0;
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export async function getInventory(tenantId: number, productId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(inventory.tenantId, tenantId)];
  if (productId) conditions.push(eq(inventory.productId, productId));
  return db.select().from(inventory).where(and(...conditions));
}

export async function upsertInventory(tenantId: number, productId: number, quantity: number, threshold?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(inventory).values({ tenantId, productId, quantity, lowStockThreshold: threshold ?? 10 })
    .onDuplicateKeyUpdate({ set: { quantity, lowStockThreshold: threshold ?? 10 } });
}

export async function getLowStockProducts(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ product: products, inv: inventory })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .where(and(
      eq(inventory.tenantId, tenantId),
      sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`
    ));
}

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.tenantId, tenantId)).orderBy(categories.sortOrder);
}

export async function createCategory(tenantId: number, name: string, slug: string, description?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(categories).values({ tenantId, name, slug, description });
}

// ── Orders ────────────────────────────────────────────────────────────────────
export async function getOrders(tenantId: number, opts?: { status?: string; limit?: number; offset?: number; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(orders.tenantId, tenantId)];
  if (opts?.status) conditions.push(eq(orders.status, opts.status as any));
  if (opts?.search) conditions.push(like(orders.orderNumber, `%${opts.search}%`));
  return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}

export async function getOrderById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.tenantId, tenantId))).limit(1);
  return result[0];
}

export async function getOrderWithItems(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const order = await getOrderById(id, tenantId);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export async function createOrder(data: InsertOrder, items: { productId?: number; productName: string; productSku?: string; quantity: number; unitPrice: number; imageUrl?: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(orders).values(data);
  const result = await db.select().from(orders).where(and(eq(orders.tenantId, data.tenantId), eq(orders.orderNumber, data.orderNumber))).limit(1);
  const order = result[0];
  if (order && items.length > 0) {
    await db.insert(orderItems).values(items.map(item => ({
      orderId: order.id,
      tenantId: data.tenantId,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      totalPrice: String(item.unitPrice * item.quantity),
      imageUrl: item.imageUrl,
    })));
  }
  return order;
}

export async function updateOrderStatus(id: number, tenantId: number, status: string, paymentStatus?: string) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (paymentStatus) updateData.paymentStatus = paymentStatus;
  await db.update(orders).set(updateData).where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));
}

export async function getOrderCount(tenantId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.tenantId, tenantId));
  return result[0]?.count ?? 0;
}

// ── Customers ─────────────────────────────────────────────────────────────────
export async function getCustomers(tenantId: number, opts?: { limit?: number; offset?: number; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(customers.tenantId, tenantId)];
  if (opts?.search) conditions.push(like(customers.email, `%${opts.search}%`));
  return db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}

export async function getCustomerById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId))).limit(1);
  return result[0] ?? null;
}

export async function getOrdersByCustomerEmail(tenantId: number, email: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(and(eq(orders.tenantId, tenantId), eq(orders.customerEmail, email))).orderBy(desc(orders.createdAt)).limit(20);
}

export async function updateCustomer(id: number, tenantId: number, data: Partial<typeof customers.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(customers).set({ ...data, updatedAt: new Date() }).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
}

export async function upsertCustomer(tenantId: number, email: string, data: Partial<typeof customers.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(customers).values({ tenantId, email, ...data })
    .onDuplicateKeyUpdate({ set: { ...data } });
}

export async function getCustomerCount(tenantId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.tenantId, tenantId));
  return result[0]?.count ?? 0;
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export async function trackEvent(tenantId: number, eventType: string, data?: { userId?: number; orderId?: number; productId?: number; value?: number; properties?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(analyticsEvents).values({
    tenantId, eventType,
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

  const [totalRevenue, orderCount, customerCount, productCount] = await Promise.all([
    db.select({ total: sum(orders.total) }).from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.paymentStatus, "paid"), gte(orders.createdAt, since))),
    db.select({ count: sql<number>`count(*)` }).from(orders)
      .where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, since))),
    db.select({ count: sql<number>`count(*)` }).from(customers)
      .where(eq(customers.tenantId, tenantId)),
    db.select({ count: sql<number>`count(*)` }).from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.status, "active"))),
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
  return db.select({
    date: sql<string>`DATE(${orders.createdAt})`,
    revenue: sum(orders.total),
    count: sql<number>`count(*)`,
  }).from(orders)
    .where(and(eq(orders.tenantId, tenantId), eq(orders.paymentStatus, "paid"), gte(orders.createdAt, since)))
    .groupBy(sql`DATE(${orders.createdAt})`)
    .orderBy(sql`DATE(${orders.createdAt})`);
}

export async function getTopProducts(tenantId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    productName: orderItems.productName,
    productId: orderItems.productId,
    totalQuantity: sql<number>`sum(${orderItems.quantity})`,
    totalRevenue: sum(orderItems.totalPrice),
  }).from(orderItems)
    .where(eq(orderItems.tenantId, tenantId))
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);
}

// ── Webhooks ──────────────────────────────────────────────────────────────────
export async function logWebhookEvent(source: "stripe" | "shopify" | "n8n" | "internal", eventType: string, payload: Record<string, unknown>, tenantId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookEvents).values({ source, eventType, payload, tenantId });
}

export async function getWebhookEvents(tenantId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions = tenantId ? [eq(webhookEvents.tenantId, tenantId)] : [];
  return db.select().from(webhookEvents).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(webhookEvents.createdAt)).limit(limit);
}
