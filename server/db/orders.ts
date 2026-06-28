import {
  and,
  desc,
  eq,
  gte,
  ilike,
  lte as drizzleLte,
  or as drizzleOr,
  sql,
} from "drizzle-orm";
import {
  InsertOrder,
  orderItems,
  orders,
  stripePaymentAudit,
  type InsertStripePaymentAudit,
  type StripePaymentAudit,
} from "../../drizzle/schema";
import { getDb } from "./connection";

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
