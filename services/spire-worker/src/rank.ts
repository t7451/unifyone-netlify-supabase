import { eq, sql as drizzleSql } from "drizzle-orm";
import {
  createDataForSeoClient,
  schema,
  type RankCheckInput,
} from "@1commerce/spire";
import { connect } from "./lib/db.js";
import { logger } from "./lib/logger.js";

// Weekly rank check cron. On startup: if `--now` flag is passed, run once
// immediately and exit. Otherwise sleep until the next matching cron slot
// (default: Monday 06:00 UTC), run, sleep 7 days, repeat.

const DEFAULT_CRON = "0 6 * * 1"; // Monday 06:00 UTC

async function main(): Promise<void> {
  const forceNow = process.argv.includes("--now");
  const login = requireEnv("DATAFORSEO_LOGIN");
  const password = requireEnv("DATAFORSEO_PASSWORD");
  const cron = process.env.RANK_CRON ?? DEFAULT_CRON;

  const client = createDataForSeoClient({ login, password });

  if (forceNow) {
    logger.info(
      "--now flag present; running one rank check immediately and exiting"
    );
    await runOneCheck(client);
    return;
  }

  logger.info({ cron }, "Rank cron started; waiting for next slot");

  // Signal handling so docker compose down exits cleanly.
  let shuttingDown = false;
  process.on("SIGTERM", () => (shuttingDown = true));
  process.on("SIGINT", () => (shuttingDown = true));

  while (!shuttingDown) {
    const nextMs = msUntilNext(cron);
    logger.info(
      { nextMs, nextAt: new Date(Date.now() + nextMs).toISOString() },
      "Sleeping until next rank slot"
    );
    // Sleep in chunks so SIGTERM wakes us reasonably quickly.
    const end = Date.now() + nextMs;
    while (!shuttingDown && Date.now() < end) {
      await sleep(Math.min(30_000, end - Date.now()));
    }
    if (shuttingDown) break;
    try {
      await runOneCheck(client);
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Rank check run failed; will retry next slot"
      );
    }
  }
}

async function runOneCheck(
  client: ReturnType<typeof createDataForSeoClient>
): Promise<void> {
  const { sql: raw, db } = connect();
  try {
    const tracked = await db
      .select({
        id: schema.trackedKeywords.id,
        term: schema.keywords.term,
        targetUrl: schema.trackedKeywords.targetUrl,
        locationCode: schema.trackedKeywords.locationCode,
        languageCode: schema.trackedKeywords.languageCode,
      })
      .from(schema.trackedKeywords)
      .innerJoin(
        schema.keywords,
        eq(schema.keywords.id, schema.trackedKeywords.keywordId)
      )
      .where(eq(schema.trackedKeywords.active, true));

    if (tracked.length === 0) {
      logger.warn("No active tracked keywords; skipping rank check");
      return;
    }

    const inputs: RankCheckInput[] = tracked.map(t => ({
      trackedKeywordId: t.id,
      keyword: t.term,
      targetUrl: t.targetUrl,
      locationCode: t.locationCode,
      languageCode: t.languageCode,
    }));

    logger.info(
      { count: inputs.length },
      "Submitting DataForSEO rank check batch"
    );
    const results = await client.checkRanks(inputs);

    // Bulk insert results. Done row-by-row (not chunked VALUES) to keep the
    // error handling per-keyword — one bad row doesn't kill the whole batch.
    let inserted = 0;
    for (const r of results) {
      try {
        await db.insert(schema.rankChecks).values({
          trackedKeywordId: r.trackedKeywordId,
          rank: r.rank ?? null,
          urlFound: r.urlFound ?? null,
          serpFeatures: r.serpFeatures as Record<string, unknown>,
        });
        inserted += 1;
      } catch (err) {
        logger.warn(
          {
            trackedKeywordId: r.trackedKeywordId,
            err: err instanceof Error ? err.message : String(err),
          },
          "Failed to insert rank check row"
        );
      }
    }

    // Emit a compact summary.
    const ranked = results.filter(r => r.rank !== null).length;
    const top10 = results.filter(r => r.rank !== null && r.rank <= 10).length;
    logger.info(
      { inserted, total: results.length, ranked, top10 },
      "Rank check complete"
    );
    void drizzleSql; // suppress unused import when only referenced via schema
  } finally {
    await raw.end({ timeout: 5 });
  }
}

// --- Cron helpers ---
// Minimal 5-field cron parser. Supports `*`, `N`, and `N-M` but not `*/N`
// or lists. Enough for "0 6 * * 1" (Monday 06:00). If the cron is
// unparseable, fall back to weekly (7 days).
function msUntilNext(cron: string): number {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    logger.warn({ cron }, "Cron expression not 5 fields; using 7-day fallback");
    return 7 * 24 * 60 * 60 * 1000;
  }
  const [minute, hour, dom, month, dow] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];

  const now = new Date();
  for (let i = 0; i < 60 * 24 * 8; i += 1) {
    const candidate = new Date(now.getTime() + i * 60_000);
    // Align to the top of the minute we're testing.
    candidate.setUTCSeconds(0, 0);
    if (!match(candidate.getUTCMinutes(), minute)) continue;
    if (!match(candidate.getUTCHours(), hour)) continue;
    if (!match(candidate.getUTCDate(), dom)) continue;
    if (!match(candidate.getUTCMonth() + 1, month)) continue;
    if (!match(candidate.getUTCDay(), dow)) continue;
    const delta = candidate.getTime() - now.getTime();
    if (delta > 0) return delta;
  }
  return 7 * 24 * 60 * 60 * 1000;
}

function match(value: number, field: string): boolean {
  if (field === "*") return true;
  if (/^\d+$/.test(field)) return value === Number(field);
  const range = field.match(/^(\d+)-(\d+)$/);
  if (range) {
    const [, a, b] = range;
    return value >= Number(a) && value <= Number(b);
  }
  return false;
}

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is required`);
  return v;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  logger.fatal(
    { err: err instanceof Error ? err.message : String(err) },
    "Rank cron crashed at top level"
  );
  process.exit(1);
});
