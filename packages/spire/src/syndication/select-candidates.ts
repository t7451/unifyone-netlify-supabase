import {
  and,
  desc,
  eq,
  gte,
  isNull,
  lt,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";
import { logger } from "../lib/logger.js";

type DB = PostgresJsDatabase<typeof schema>;

// For each active platform, find content_plan rows that are eligible to
// syndicate (published past the platform's delay window, score above the
// platform's threshold, cluster matches platform.audience_match), and
// haven't been syndicated to that platform yet. Insert spire_syndications
// rows with status='queued' for each match — up to platform.rate_limit_per_day.

export type SelectInput = {
  db: DB;
  /** Restrict selection to one site; defaults to all active sites. */
  siteSlug?: string;
};

export type SelectResult = {
  queued: number;
  byPlatform: Record<string, number>;
  reasonsSkipped: Array<{ platform: string; planSlug: string; reason: string }>;
};

export async function selectCandidates(
  input: SelectInput
): Promise<SelectResult> {
  const { db } = input;

  const platforms = await db
    .select()
    .from(schema.syndicationPlatforms)
    .where(eq(schema.syndicationPlatforms.active, true));
  if (platforms.length === 0) {
    logger.warn(
      "No active syndication platforms; run `spire syndicate platforms seed` first"
    );
    return { queued: 0, byPlatform: {}, reasonsSkipped: [] };
  }

  const sites = input.siteSlug
    ? await db
        .select()
        .from(schema.sites)
        .where(eq(schema.sites.slug, input.siteSlug))
        .limit(1)
    : await db.select().from(schema.sites).where(eq(schema.sites.active, true));

  const result: SelectResult = {
    queued: 0,
    byPlatform: {},
    reasonsSkipped: [],
  };

  for (const platform of platforms) {
    const audience = platform.audienceMatch;
    if (!audience || audience.length === 0) continue;

    for (const site of sites) {
      // Already-syndicated plans for this platform — exclude them so we
      // don't double-queue. Track by plan id; the unique index on
      // (content_plan_id, platform_id) is the backstop.
      const alreadySyndicated = await db
        .select({ planId: schema.syndications.contentPlanId })
        .from(schema.syndications)
        .where(eq(schema.syndications.platformId, platform.id));
      const excludeIds = alreadySyndicated.map(r => r.planId);

      // Cutoff date: anything published before now()-delay_days is fair game.
      const cutoff = new Date(
        Date.now() - platform.delayDays * 24 * 60 * 60 * 1000
      );

      const candidates = await db
        .select({
          id: schema.contentPlan.id,
          slug: schema.contentPlan.slug,
          targetKeyword: schema.contentPlan.targetKeyword,
          qualityScore: schema.contentPlan.qualityScore,
          publishedAt: schema.contentPlan.publishedAt,
          cluster: schema.keywords.cluster,
        })
        .from(schema.contentPlan)
        .leftJoin(
          schema.keywords,
          eq(schema.keywords.id, schema.contentPlan.keywordId)
        )
        .where(
          and(
            eq(schema.contentPlan.siteId, site.id),
            eq(schema.contentPlan.status, "published"),
            gte(schema.contentPlan.qualityScore, platform.minQualityScore),
            lt(schema.contentPlan.publishedAt, cutoff),
            // Cluster must be in the platform's audience_match array OR
            // the plan has no keyword/cluster (in which case skip; we
            // can't audience-match it).
            sql`${schema.keywords.cluster} = any(${audience}::text[])`,
            excludeIds.length > 0
              ? notInArray(schema.contentPlan.id, excludeIds)
              : sql`true`
          )
        )
        .orderBy(desc(schema.contentPlan.publishedAt))
        .limit(platform.rateLimitPerDay);

      for (const c of candidates) {
        try {
          await db.insert(schema.syndications).values({
            contentPlanId: c.id,
            platformId: platform.id,
            status: "queued",
          });
          result.queued += 1;
          result.byPlatform[platform.slug] =
            (result.byPlatform[platform.slug] ?? 0) + 1;
        } catch (err) {
          // Most likely violation of the unique (plan, platform) index — race
          // with another tick. Safe to ignore.
          result.reasonsSkipped.push({
            platform: platform.slug,
            planSlug: c.slug,
            reason:
              err instanceof Error ? err.message.slice(0, 200) : String(err),
          });
        }
      }
    }
  }

  logger.info(result, "Syndication candidates selected");
  return result;
}

// Helper exported for the tick to find queued rows for API-method platforms.
export async function findQueuedForApiMethods(db: DB): Promise<
  Array<{
    syndicationId: string;
    platformSlug: string;
    method: "api" | "browser";
    planId: string;
    siteId: string;
  }>
> {
  const rows = await db
    .select({
      syndicationId: schema.syndications.id,
      platformSlug: schema.syndicationPlatforms.slug,
      method: schema.syndicationPlatforms.method,
      planId: schema.syndications.contentPlanId,
      siteId: schema.contentPlan.siteId,
    })
    .from(schema.syndications)
    .innerJoin(
      schema.syndicationPlatforms,
      eq(schema.syndicationPlatforms.id, schema.syndications.platformId)
    )
    .innerJoin(
      schema.contentPlan,
      eq(schema.contentPlan.id, schema.syndications.contentPlanId)
    )
    .where(
      and(
        eq(schema.syndications.status, "queued"),
        eq(schema.syndicationPlatforms.method, "api")
      )
    )
    .limit(20);

  return rows.map(r => ({
    syndicationId: r.syndicationId,
    platformSlug: r.platformSlug,
    method: r.method as "api" | "browser",
    planId: r.planId,
    siteId: r.siteId,
  }));
}

// suppress unused-import warnings on optional clauses
void or;
void isNull;
