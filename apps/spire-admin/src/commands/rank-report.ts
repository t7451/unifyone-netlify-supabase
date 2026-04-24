import { and, desc, eq, gte, sql } from "drizzle-orm";
import { connectNeon, loadEnv, logger, schema } from "@1commerce/spire";

// `spire rank track`, `spire rank report`. The actual rank-check run happens
// in the spire-worker rank cron (or `docker exec spire-rank node dist/rank.js --now`).

export async function trackKeywordCommand(input: {
  keywordId: string;
  targetUrl: string;
  locationCode?: number;
  languageCode?: string;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const [kw] = await db
      .select()
      .from(schema.keywords)
      .where(eq(schema.keywords.id, input.keywordId))
      .limit(1);
    if (!kw) throw new Error(`Keyword ${input.keywordId} not found`);

    await db
      .insert(schema.trackedKeywords)
      .values({
        siteId: kw.siteId,
        keywordId: kw.id,
        targetUrl: input.targetUrl,
        locationCode: input.locationCode ?? 2840,
        languageCode: input.languageCode ?? "en",
      })
      .onConflictDoUpdate({
        target: [
          schema.trackedKeywords.siteId,
          schema.trackedKeywords.keywordId,
          schema.trackedKeywords.locationCode,
        ],
        set: {
          targetUrl: input.targetUrl,
          languageCode: input.languageCode ?? "en",
          active: true,
        },
      });
    logger.info(
      { keywordId: kw.id, term: kw.term, target: input.targetUrl },
      "Tracking enabled"
    );
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

export async function rankReportCommand(input: {
  siteSlug?: string;
  sinceDays?: number;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  const sinceDays = input.sinceDays ?? 30;
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  try {
    let siteId: string | null = null;
    if (input.siteSlug) {
      const [site] = await db
        .select()
        .from(schema.sites)
        .where(eq(schema.sites.slug, input.siteSlug))
        .limit(1);
      if (!site) throw new Error(`Site ${input.siteSlug} not registered`);
      siteId = site.id;
    }

    const trackedQuery = db
      .select({
        id: schema.trackedKeywords.id,
        term: schema.keywords.term,
        target: schema.trackedKeywords.targetUrl,
        siteSlug: schema.sites.slug,
      })
      .from(schema.trackedKeywords)
      .innerJoin(
        schema.keywords,
        eq(schema.keywords.id, schema.trackedKeywords.keywordId)
      )
      .innerJoin(
        schema.sites,
        eq(schema.sites.id, schema.trackedKeywords.siteId)
      )
      .where(
        siteId
          ? and(
              eq(schema.trackedKeywords.active, true),
              eq(schema.trackedKeywords.siteId, siteId)
            )
          : eq(schema.trackedKeywords.active, true)
      );

    const tracked = await trackedQuery;

    // Pull most recent + week-ago rank for each tracked keyword.
    for (const t of tracked) {
      const checks = await db
        .select()
        .from(schema.rankChecks)
        .where(
          and(
            eq(schema.rankChecks.trackedKeywordId, t.id),
            gte(schema.rankChecks.checkedAt, since)
          )
        )
        .orderBy(desc(schema.rankChecks.checkedAt))
        .limit(10);

      const latest = checks[0];
      const prior = checks[1];
      const delta =
        latest && prior ? (latest.rank ?? 101) - (prior.rank ?? 101) : null;

      logger.info(
        {
          site: t.siteSlug,
          term: t.term,
          target: t.target,
          latestRank: latest?.rank ?? null,
          priorRank: prior?.rank ?? null,
          delta,
          checkCount: checks.length,
        },
        "Rank"
      );
    }
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

export async function rankRunNowStubCommand(): Promise<void> {
  // The CLI doesn't run rank checks directly — that would bypass worker-side
  // batching and credit accounting. Tell the operator to trigger the worker.
  logger.info(
    'Rank checks run on the Contabo worker. Trigger manually with:\n  ssh keith@contabo "docker exec spire-rank node dist/rank.js --now"'
  );
  // Force summary read so this command is more than a printf: show what
  // the worker is about to check.
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.trackedKeywords)
      .where(eq(schema.trackedKeywords.active, true));
    logger.info(
      { tracking: row?.count ?? 0 },
      "Active tracked keywords (will be checked)"
    );
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}
