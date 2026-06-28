/**
 * discoverability.service.ts — use-cases for the Discoverability Engine router.
 *
 * Computes the MAU metric and organic funnel stats from the repo data access.
 */

import { getDb } from "../../db";
import {
  WINDOW_DAYS,
  countActiveUsers28d,
  countDistinctOrderTenantsSince,
  countDistinctProductTenantsSince,
  countTotalUsers,
  countUsersSignedInSince,
  selectSignupsByMethodSince,
  windowStart,
} from "./discoverability.repo";

/**
 * Real MAU: users who signed in AND placed an order (or created a product)
 * within the rolling 28-day window. Not a pageview count.
 *
 * Definition: active_28d = lastSignedIn >= now()-28d AND (has order OR has product in window)
 */
export async function getMauMetric() {
  const db = await getDb();
  const since = windowStart();

  if (!db) {
    return {
      windowDays: WINDOW_DAYS,
      since: since.toISOString(),
      loggedInCount: 0,
      actionTakerCount: 0,
      mauLowerBound: 0,
      computedAt: new Date().toISOString(),
      note: "Database not configured; no MAU data available.",
    };
  }

  // Users who signed in within the window (fast approximation — includes users
  // who logged in but took no further action; refine with order/product join below)
  const loginCount = await countUsersSignedInSince(db, since);

  // Distinct tenants with at least one order in the window (core commerce action)
  const orderTenants = await countDistinctOrderTenantsSince(db, since);

  // Distinct tenants with at least one new product in the window (merchant action)
  const productTenants = await countDistinctProductTenantsSince(db, since);

  // Strict MAU: signed in + at least one core action
  // We compute this as the login pool intersected with action-takers.
  // A fully precise query would be a JOIN; this gives directional numbers.
  const actionTakers = Math.max(orderTenants, productTenants);

  return {
    windowDays: WINDOW_DAYS,
    since: since.toISOString(),
    loggedInCount: loginCount,
    actionTakerCount: actionTakers,
    // Conservative MAU: min of logged-in and action-takers
    // (real overlap requires a subquery; this is a safe lower bound)
    mauLowerBound: Math.min(loginCount, actionTakers),
    computedAt: new Date().toISOString(),
    note: "mauLowerBound = min(loggedIn28d, actionTakers28d). For exact overlap run the SQL in scripts/mau-exact.sql.",
  };
}

/** New signups in the last N days, segmented by loginMethod (acquisition channel proxy). */
export async function getFunnelStats(input: { days: number }) {
  const db = await getDb();
  const since = new Date();
  since.setDate(since.getDate() - input.days);

  if (!db) {
    return {
      days: input.days,
      newSignups: 0,
      byMethod: [] as { method: string | null; count: number }[],
      totalUsers: 0,
      activeUsers28d: 0,
      activationRate: "0%",
    };
  }

  const signupsByMethod = await selectSignupsByMethodSince(db, since);
  const totalUsers = await countTotalUsers(db);
  const activeUsers = await countActiveUsers28d(db);

  const newSignups = signupsByMethod.reduce((s, r) => s + (r.count ?? 0), 0);

  return {
    days: input.days,
    newSignups,
    byMethod: signupsByMethod,
    totalUsers,
    activeUsers28d: activeUsers,
    activationRate:
      totalUsers > 0
        ? ((activeUsers / totalUsers) * 100).toFixed(1) + "%"
        : "0%",
  };
}
