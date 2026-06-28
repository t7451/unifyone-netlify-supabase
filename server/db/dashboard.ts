import { and, desc, eq, gte, lt as drizzleLt, sql, sum } from "drizzle-orm";
import { customers, orderItems, orders, products } from "../../drizzle/schema";
import { getDb } from "./connection";

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
