import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";

type DB = PostgresJsDatabase<typeof schema>;

// Pure SQL analytics over spire_gsc_daily / spire_gsc_weekly_rollup. No AI
// calls, no external dependencies. Used by the digest function and the
// `spire gsc report` CLI. Keeping the math close to the data.

export type StrikingDistanceRow = {
  query: string;
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  /** Score = impressions / position. Higher = more leverage. */
  opportunityScore: number;
};

/**
 * Queries that are almost ranking — avg position 5–20 with meaningful impression
 * volume. One supporting piece typically moves these into the top 5.
 */
export async function findStrikingDistanceQueries(
  db: DB,
  args: {
    siteId: string;
    minImpressions?: number;
    weeks?: number;
    limit?: number;
  }
): Promise<StrikingDistanceRow[]> {
  const minImpressions = args.minImpressions ?? 50;
  const weeks = args.weeks ?? 1;
  const limit = args.limit ?? 20;

  const result = await db.execute(sql`
    select
      query,
      page,
      avg(avg_position)::numeric(6,2) as position,
      sum(impressions)::int as impressions,
      sum(clicks)::int as clicks
    from spire_gsc_weekly_rollup
    where site_id = ${args.siteId}
      and week_start >= date_trunc('week', now()) - (${weeks}::int * interval '7 days')
      and avg_position between 5 and 20
    group by query, page
    having sum(impressions) >= ${minImpressions}
    order by sum(impressions) / nullif(avg(avg_position), 0) desc
    limit ${limit}
  `);

  return (result as unknown as Array<Record<string, unknown>>).map(row => ({
    query: String(row.query),
    page: String(row.page),
    position: Number(row.position),
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    opportunityScore:
      Number(row.impressions) / Math.max(0.01, Number(row.position)),
  }));
}

export type CannibalRow = {
  query: string;
  pages: Array<{ url: string; impressions: number; position: number }>;
};

/**
 * Same query competing across multiple pages on the same site. Almost always
 * a content-consolidation or internal-linking fix.
 */
export async function findCannibalQueries(
  db: DB,
  args: { siteId: string; weeks?: number; limit?: number }
): Promise<CannibalRow[]> {
  const weeks = args.weeks ?? 4;
  const limit = args.limit ?? 20;
  const result = await db.execute(sql`
    with q as (
      select query, page,
        sum(impressions)::int as impressions,
        avg(avg_position)::numeric(6,2) as position
      from spire_gsc_weekly_rollup
      where site_id = ${args.siteId}
        and week_start >= date_trunc('week', now()) - (${weeks}::int * interval '7 days')
      group by query, page
      having sum(impressions) >= 10
    )
    select query,
      array_agg(json_build_object('url', page, 'impressions', impressions, 'position', position)
        order by impressions desc) as pages,
      count(distinct page) as page_count
    from q
    group by query
    having count(distinct page) > 1
    order by sum(impressions) desc
    limit ${limit}
  `);

  return (result as unknown as Array<Record<string, unknown>>).map(row => ({
    query: String(row.query),
    pages: row.pages as CannibalRow["pages"],
  }));
}

export type TrendRow = {
  query: string;
  page: string;
  recentImpressions: number;
  priorImpressions: number;
  pctChange: number;
};

/**
 * Pages whose impressions dropped meaningfully over the last N weeks vs the
 * prior N weeks. Refresh / rewrite candidates.
 */
export async function findDecliningPages(
  db: DB,
  args: {
    siteId: string;
    weeks?: number;
    minImpressions?: number;
    limit?: number;
  }
): Promise<TrendRow[]> {
  return findTrend(db, { ...args, direction: "decline" });
}

/** Queries with sharp impression growth — double-down candidates. */
export async function findRisingQueries(
  db: DB,
  args: {
    siteId: string;
    weeks?: number;
    minImpressions?: number;
    limit?: number;
  }
): Promise<TrendRow[]> {
  return findTrend(db, { ...args, direction: "rise" });
}

async function findTrend(
  db: DB,
  args: {
    siteId: string;
    weeks?: number;
    minImpressions?: number;
    limit?: number;
    direction: "rise" | "decline";
  }
): Promise<TrendRow[]> {
  const weeks = args.weeks ?? 4;
  const minImpressions = args.minImpressions ?? 100;
  const limit = args.limit ?? 20;
  // pct_change > 0 = growth, < 0 = decline
  const orderClause =
    args.direction === "rise" ? sql`pct_change desc` : sql`pct_change asc`;
  const havingClause =
    args.direction === "rise"
      ? sql`pct_change >= 0.5 and recent_impressions >= ${minImpressions}`
      : sql`pct_change <= -0.3 and prior_impressions >= ${minImpressions}`;

  const result = await db.execute(sql`
    with windowed as (
      select query, page,
        sum(case when week_start >= date_trunc('week', now()) - (${weeks}::int * interval '7 days')
          then impressions else 0 end)::int as recent_impressions,
        sum(case when week_start <  date_trunc('week', now()) - (${weeks}::int * interval '7 days')
              and week_start >= date_trunc('week', now()) - (${weeks * 2}::int * interval '7 days')
          then impressions else 0 end)::int as prior_impressions
      from spire_gsc_weekly_rollup
      where site_id = ${args.siteId}
      group by query, page
    )
    select query, page, recent_impressions, prior_impressions,
      case when prior_impressions = 0 then null
        else (recent_impressions::numeric - prior_impressions) / nullif(prior_impressions, 0)
      end as pct_change
    from windowed
    where ${havingClause}
    order by ${orderClause}
    limit ${limit}
  `);

  return (result as unknown as Array<Record<string, unknown>>).map(row => ({
    query: String(row.query),
    page: String(row.page),
    recentImpressions: Number(row.recent_impressions),
    priorImpressions: Number(row.prior_impressions),
    pctChange: Number(row.pct_change ?? 0),
  }));
}

/**
 * Compact week-over-week summary for the digest's top of the GSC section.
 */
export async function summarize(
  db: DB,
  args: { siteId: string }
): Promise<{
  recentClicks: number;
  recentImpressions: number;
  recentAvgPosition: number;
  priorClicks: number;
  priorImpressions: number;
  priorAvgPosition: number;
}> {
  const result = await db.execute(sql`
    with windows as (
      select
        sum(case when date >= (current_date - interval '7 days') then clicks else 0 end)::int as recent_clicks,
        sum(case when date >= (current_date - interval '7 days') then impressions else 0 end)::int as recent_imps,
        avg(case when date >= (current_date - interval '7 days') then position end)::numeric(6,2) as recent_pos,
        sum(case when date <  (current_date - interval '7 days') and date >= (current_date - interval '14 days')
          then clicks else 0 end)::int as prior_clicks,
        sum(case when date <  (current_date - interval '7 days') and date >= (current_date - interval '14 days')
          then impressions else 0 end)::int as prior_imps,
        avg(case when date <  (current_date - interval '7 days') and date >= (current_date - interval '14 days')
          then position end)::numeric(6,2) as prior_pos
      from spire_gsc_daily
      where site_id = ${args.siteId}
    )
    select * from windows
  `);
  const row = (result as unknown as Array<Record<string, unknown>>)[0] ?? {};
  return {
    recentClicks: Number(row.recent_clicks ?? 0),
    recentImpressions: Number(row.recent_imps ?? 0),
    recentAvgPosition: Number(row.recent_pos ?? 0),
    priorClicks: Number(row.prior_clicks ?? 0),
    priorImpressions: Number(row.prior_imps ?? 0),
    priorAvgPosition: Number(row.prior_pos ?? 0),
  };
}
