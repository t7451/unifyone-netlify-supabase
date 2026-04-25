import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import type { GscClient, GscDimension, GscRow } from "./client.js";

type DB = PostgresJsDatabase<typeof schema>;

// GSC ingest. Runs daily; defaults to 3-day overlap to catch GSC's
// late-arriving data finalizations. Upserts on the natural unique key so
// repeat runs are idempotent — same (site, query, page, country, device,
// date) always lands in the same row.

const INGEST_DIMENSIONS: GscDimension[] = [
  "query",
  "page",
  "country",
  "device",
  "date",
];

export type IngestInput = {
  db: DB;
  gsc: GscClient;
  siteId: string;
  /** YYYY-MM-DD; defaults to today UTC. */
  endDate?: string;
  /** How many days back to pull. Default 3 — overlaps yesterday's run. */
  days?: number;
};

export type IngestResult = {
  siteId: string;
  startDate: string;
  endDate: string;
  rowsIngested: number;
  rowsUpserted: number;
};

export async function ingestGsc(input: IngestInput): Promise<IngestResult> {
  const { db, gsc, siteId } = input;
  const days = Math.max(1, Math.min(90, input.days ?? 3));

  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.id, siteId))
    .limit(1);
  if (!site) throw new Error(`Site not found: ${siteId}`);

  const endDate = input.endDate ?? toIsoDate(new Date());
  const startDate = toIsoDate(addDays(parseIsoDate(endDate), -(days - 1)));
  const siteUrl = `https://${site.domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/`;

  logger.info({ siteId, startDate, endDate, siteUrl }, "GSC ingest starting");

  const rows = await gsc.queryAnalytics({
    siteUrl,
    startDate,
    endDate,
    dimensions: INGEST_DIMENSIONS,
    rowLimit: 25_000,
  });

  if (rows.length === 0) {
    logger.warn({ siteId, startDate, endDate }, "GSC returned zero rows");
    return { siteId, startDate, endDate, rowsIngested: 0, rowsUpserted: 0 };
  }

  // Bulk-upsert in chunks to keep parameter counts under postgres.js's limit.
  const CHUNK = 500;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK).map(toRow.bind(null, siteId));
    await db
      .insert(schema.gscDaily)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          schema.gscDaily.siteId,
          schema.gscDaily.query,
          schema.gscDaily.page,
          schema.gscDaily.country,
          schema.gscDaily.device,
          schema.gscDaily.date,
        ],
        set: {
          clicks: sql`excluded.clicks`,
          impressions: sql`excluded.impressions`,
          ctr: sql`excluded.ctr`,
          position: sql`excluded.position`,
          pulledAt: sql`excluded.pulled_at`,
        },
      });
    upserted += batch.length;
  }

  await refreshWeeklyRollup(db);

  logger.info(
    {
      siteId,
      startDate,
      endDate,
      rowsIngested: rows.length,
      rowsUpserted: upserted,
    },
    "GSC ingest complete"
  );
  return {
    siteId,
    startDate,
    endDate,
    rowsIngested: rows.length,
    rowsUpserted: upserted,
  };
}

export async function refreshWeeklyRollup(db: DB): Promise<void> {
  // Concurrent refresh requires the unique index on the MV (provided by
  // 0006_spire_syndication.sql). Falls back to plain refresh if concurrent
  // isn't available yet (first run before the index exists).
  try {
    await db.execute(
      sql`refresh materialized view concurrently spire_gsc_weekly_rollup`
    );
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Concurrent MV refresh failed; falling back to plain refresh"
    );
    await db.execute(sql`refresh materialized view spire_gsc_weekly_rollup`);
  }
}

function toRow(siteId: string, r: GscRow): typeof schema.gscDaily.$inferInsert {
  // Dimensions array order is stable: ["query","page","country","device","date"]
  const [query, page, country, device, date] = r.keys;
  return {
    siteId,
    query: query ?? "",
    page: page ?? "",
    country: country ?? null,
    device: device ?? null,
    date: date ?? "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr.toFixed(4),
    position: r.position.toFixed(2),
  };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseIsoDate(s: string): Date {
  // Anchor to UTC to dodge local-timezone drift across day boundaries.
  return new Date(`${s}T00:00:00Z`);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
