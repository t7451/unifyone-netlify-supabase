/**
 * discoverability.repo.ts — data access for the Discoverability Engine router.
 *
 * Wraps the Drizzle queries against users / orders / products used to compute
 * the MAU metric and organic funnel stats.
 */

import { getDb } from "../../db";
import { users, orders, products } from "../../../drizzle/schema";
import { and, gte, count, isNull, sql } from "drizzle-orm";

export const WINDOW_DAYS = 28;

/** Rolling 28-day window start timestamp */
export function windowStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - WINDOW_DAYS);
  return d;
}

/** Count of non-deleted users who signed in since `since`. */
export async function countUsersSignedInSince(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  since: Date
): Promise<number> {
  const [loginResult] = await db
    .select({ count: count() })
    .from(users)
    .where(and(gte(users.lastSignedIn, since), isNull(users.deletedAt)));
  return loginResult?.count ?? 0;
}

/** Distinct tenants with at least one order in the window. */
export async function countDistinctOrderTenantsSince(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  since: Date
): Promise<number> {
  const [orderResult] = await db
    .select({ count: count(sql<number>`DISTINCT ${orders.tenantId}`) })
    .from(orders)
    .where(gte(orders.createdAt, since));
  return orderResult?.count ?? 0;
}

/** Distinct tenants with at least one new product in the window. */
export async function countDistinctProductTenantsSince(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  since: Date
): Promise<number> {
  const [productResult] = await db
    .select({ count: count(sql<number>`DISTINCT ${products.tenantId}`) })
    .from(products)
    .where(gte(products.createdAt, since));
  return productResult?.count ?? 0;
}

/** New signups since `since`, grouped by loginMethod (acquisition channel proxy). */
export async function selectSignupsByMethodSince(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  since: Date
): Promise<{ method: string | null; count: number }[]> {
  return db
    .select({
      method: users.loginMethod,
      count: count(),
    })
    .from(users)
    .where(and(gte(users.createdAt, since), isNull(users.deletedAt)))
    .groupBy(users.loginMethod);
}

/** Total non-deleted users. */
export async function countTotalUsers(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<number> {
  const [totalResult] = await db
    .select({ count: count() })
    .from(users)
    .where(isNull(users.deletedAt));
  return totalResult?.count ?? 0;
}

/** Non-deleted users signed in within the rolling 28-day window. */
export async function countActiveUsers28d(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<number> {
  const [activeResult] = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(gte(users.lastSignedIn, windowStart()), isNull(users.deletedAt))
    );
  return activeResult?.count ?? 0;
}
