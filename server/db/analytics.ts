import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { analyticsEvents, products } from "../../drizzle/schema";
import { computeViewedTogether } from "../lib/marketBasket";
import { getDb } from "./connection";

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
