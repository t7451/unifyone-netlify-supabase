import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import * as db from "../../db";
import {
  discounts,
  notifications,
  orders as ordersTable,
} from "../../../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof db.getDb>>>;

/** Thin data-access layer: forwards to the shared `../../db` helpers and holds
 *  the inline Drizzle queries the orders router runs directly. Named helpers
 *  are forwarded lazily so test mocks of `../../db` that omit unrelated exports
 *  don't trip vitest's strict-mock guard at module-load time. */
export const ordersRepo = {
  getDb: (...a: Parameters<typeof db.getDb>) => db.getDb(...a),
  bulkDeleteOrders: (...a: Parameters<typeof db.bulkDeleteOrders>) =>
    db.bulkDeleteOrders(...a),
  createOrder: (...a: Parameters<typeof db.createOrder>) =>
    db.createOrder(...a),
  getCustomerById: (...a: Parameters<typeof db.getCustomerById>) =>
    db.getCustomerById(...a),
  getCustomers: (...a: Parameters<typeof db.getCustomers>) =>
    db.getCustomers(...a),
  getOrderById: (...a: Parameters<typeof db.getOrderById>) =>
    db.getOrderById(...a),
  getOrderByStripeId: (...a: Parameters<typeof db.getOrderByStripeId>) =>
    db.getOrderByStripeId(...a),
  getOrdersByCustomerEmail: (
    ...a: Parameters<typeof db.getOrdersByCustomerEmail>
  ) => db.getOrdersByCustomerEmail(...a),
  getOrderWithItems: (...a: Parameters<typeof db.getOrderWithItems>) =>
    db.getOrderWithItems(...a),
  getOrders: (...a: Parameters<typeof db.getOrders>) => db.getOrders(...a),
  linkPaymentAuditToOrder: (
    ...a: Parameters<typeof db.linkPaymentAuditToOrder>
  ) => db.linkPaymentAuditToOrder(...a),
  markPaymentAuditOrphaned: (
    ...a: Parameters<typeof db.markPaymentAuditOrphaned>
  ) => db.markPaymentAuditOrphaned(...a),
  recordStripePaymentVerification: (
    ...a: Parameters<typeof db.recordStripePaymentVerification>
  ) => db.recordStripePaymentVerification(...a),
  updateCustomer: (...a: Parameters<typeof db.updateCustomer>) =>
    db.updateCustomer(...a),
  updateOrderStatus: (...a: Parameters<typeof db.updateOrderStatus>) =>
    db.updateOrderStatus(...a),
  upsertCustomer: (...a: Parameters<typeof db.upsertCustomer>) =>
    db.upsertCustomer(...a),

  listPage(
    database: Db,
    tenantId: number,
    opts: {
      status?: (typeof ordersTable.status.enumValues)[number];
      paymentStatus?: (typeof ordersTable.paymentStatus.enumValues)[number];
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      page: number;
      limit: number;
    }
  ) {
    const conditions = [eq(ordersTable.tenantId, tenantId)];

    if (opts.status) {
      conditions.push(eq(ordersTable.status, opts.status));
    }
    if (opts.paymentStatus) {
      conditions.push(eq(ordersTable.paymentStatus, opts.paymentStatus));
    }
    if (opts.search) {
      const searchPattern = `%${opts.search}%`;
      const searchCondition = or(
        ilike(ordersTable.orderNumber, searchPattern),
        ilike(ordersTable.customerName, searchPattern),
        ilike(ordersTable.customerEmail, searchPattern),
        sql`cast(${ordersTable.id} as text) ilike ${searchPattern}`
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    if (opts.dateFrom) {
      const dateFrom = new Date(opts.dateFrom);
      if (!Number.isNaN(dateFrom.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(opts.dateFrom)) {
          dateFrom.setUTCHours(0, 0, 0, 0);
        }
        conditions.push(gte(ordersTable.createdAt, dateFrom));
      }
    }
    if (opts.dateTo) {
      const dateTo = new Date(opts.dateTo);
      if (!Number.isNaN(dateTo.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(opts.dateTo)) {
          dateTo.setUTCHours(23, 59, 59, 999);
        }
        conditions.push(lte(ordersTable.createdAt, dateTo));
      }
    }

    const where = and(...conditions);
    return Promise.all([
      database
        .select()
        .from(ordersTable)
        .where(where)
        .orderBy(desc(ordersTable.createdAt))
        .limit(opts.limit)
        .offset((opts.page - 1) * opts.limit),
      database.select({ count: count() }).from(ordersTable).where(where),
    ]);
  },

  findActiveDiscountByCode(database: Db, tenantId: number, code: string) {
    return database
      .select()
      .from(discounts)
      .where(
        and(
          eq(discounts.tenantId, tenantId),
          eq(discounts.code, code),
          eq(discounts.isActive, true)
        )
      )
      .limit(1);
  },

  incrementDiscountUsage(database: Db, discountId: number, tenantId: number) {
    return database
      .update(discounts)
      .set({
        usageCount: sql`${discounts.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(eq(discounts.id, discountId), eq(discounts.tenantId, tenantId))
      );
  },

  insertNotification(database: Db, values: typeof notifications.$inferInsert) {
    return database.insert(notifications).values(values);
  },
};
