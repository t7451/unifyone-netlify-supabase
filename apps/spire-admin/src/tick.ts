// Shared tick logic used by both the CLI (`spire tick <slug>`) and the
// scheduled Netlify function (`spire-tick.mts`). Keeping the logic in one
// module ensures a manual invocation behaves identically to cron.

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Octokit } from "@octokit/rest";
import {
  buildBrief,
  connectNeon,
  createAnthropic,
  logger,
  publishArticle,
  scrubForStorage,
  schema,
  writeArticle,
} from "@1commerce/spire";

export type TickEnv = {
  NEON_DATABASE_URL: string;
  ANTHROPIC_API_KEY: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  SPIRE_MODEL: string;
  SPIRE_TICK_BRIEFS_PER_RUN: number;
  SPIRE_TICK_ARTICLES_PER_RUN: number;
};

export type TickInput = {
  trigger: "scheduled" | "manual" | "backfill";
  /** When set, run tick against this one site only. */
  siteSlug?: string;
  autopublish: boolean;
  autopublishThreshold: number;
  env: TickEnv;
};

export type TickSummary = {
  planned: number;
  generated: number;
  published: number;
  failed: number;
  sites: Array<{
    slug: string;
    planned: number;
    generated: number;
    published: number;
    failed: number;
  }>;
};

// Advisory lock key derived from site.id so two overlapping tick invocations
// against the same site serialize. pg_advisory_xact_lock releases at tx end;
// pg_try_advisory_lock requires explicit release — use the xact variant inside
// a transaction so cold-start aborts don't leak locks.
function advisoryLockKey(siteId: string): number {
  // Deterministic 32-bit hash of the site uuid. Good enough; collisions only
  // matter within the `spire_*` namespace (two sites sharing a hash is fine
  // — they just serialize, no correctness issue).
  let h = 0x811c9dc5;
  for (let i = 0; i < siteId.length; i += 1) {
    h ^= siteId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0; // signed 32-bit
}

export async function runTick(input: TickInput): Promise<TickSummary> {
  const { trigger, siteSlug, autopublish, autopublishThreshold, env } = input;
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  const anthropic = createAnthropic(env.ANTHROPIC_API_KEY);
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });

  const totals: TickSummary = {
    planned: 0,
    generated: 0,
    published: 0,
    failed: 0,
    sites: [],
  };

  try {
    const sites = siteSlug
      ? await db
          .select()
          .from(schema.sites)
          .where(eq(schema.sites.slug, siteSlug))
          .limit(1)
      : await db
          .select()
          .from(schema.sites)
          .where(eq(schema.sites.active, true));

    if (sites.length === 0) {
      logger.warn({ siteSlug }, "No active sites found");
      return totals;
    }

    for (const site of sites) {
      const siteTotals = {
        slug: site.slug,
        planned: 0,
        generated: 0,
        published: 0,
        failed: 0,
      };

      const [runRow] = await db
        .insert(schema.runs)
        .values({ siteId: site.id, trigger })
        .returning({ id: schema.runs.id });
      if (!runRow) {
        logger.error({ siteId: site.id }, "Failed to insert spire_runs row");
        continue;
      }

      await db.transaction(async tx => {
        // Serialize ticks against the same site.
        const lockKey = advisoryLockKey(site.id);
        await tx.execute(sql`select pg_advisory_xact_lock(${lockKey})`);

        // --- 1. Build briefs if the queue is thin ---
        const [queuedRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.contentPlan)
          .where(
            and(
              eq(schema.contentPlan.siteId, site.id),
              eq(schema.contentPlan.status, "queued")
            )
          );
        const queuedCount = queuedRow?.count ?? 0;

        if (queuedCount < 3) {
          const newKeywords = await tx
            .select()
            .from(schema.keywords)
            .where(
              and(
                eq(schema.keywords.siteId, site.id),
                eq(schema.keywords.status, "new")
              )
            )
            .orderBy(
              desc(schema.keywords.priority),
              asc(schema.keywords.createdAt)
            )
            .limit(env.SPIRE_TICK_BRIEFS_PER_RUN);

          for (const kw of newKeywords) {
            try {
              await buildBrief({
                db: tx,
                anthropic,
                model: env.SPIRE_MODEL,
                keywordId: kw.id,
              });
              siteTotals.planned += 1;
            } catch (err) {
              siteTotals.failed += 1;
              logger.warn(
                {
                  keywordId: kw.id,
                  term: kw.term,
                  err: err instanceof Error ? err.message : String(err),
                },
                "Brief step failed"
              );
            }
          }
        }

        // --- 2. Write articles for queued plans ---
        const queuedPlans = await tx
          .select({ id: schema.contentPlan.id })
          .from(schema.contentPlan)
          .where(
            and(
              eq(schema.contentPlan.siteId, site.id),
              eq(schema.contentPlan.status, "queued")
            )
          )
          .orderBy(asc(schema.contentPlan.createdAt))
          .limit(env.SPIRE_TICK_ARTICLES_PER_RUN);

        for (const plan of queuedPlans) {
          try {
            const result = await writeArticle({
              db: tx,
              anthropic,
              model: env.SPIRE_MODEL,
              contentPlanId: plan.id,
              // writeArticle only autopublishes if BOTH caller threshold is set
              // AND the tick allows autopublish. Otherwise status lands in review.
              autopublishThreshold: autopublish
                ? autopublishThreshold
                : undefined,
            });
            if (result.status === "failed") siteTotals.failed += 1;
            else siteTotals.generated += 1;
          } catch (err) {
            siteTotals.failed += 1;
            logger.warn(
              {
                contentPlanId: plan.id,
                err: err instanceof Error ? err.message : String(err),
              },
              "Write step failed"
            );
          }
        }

        // --- 3. Publish plans whose status is 'published' but commit_sha is null ---
        // (writeArticle upgrades status to 'published' when autopublish threshold
        // met; actually committing to GitHub happens here so the tx stays bounded.)
        const toPublish = await tx
          .select({ id: schema.contentPlan.id })
          .from(schema.contentPlan)
          .where(
            and(
              eq(schema.contentPlan.siteId, site.id),
              eq(schema.contentPlan.status, "published"),
              sql`${schema.contentPlan.commitSha} is null`
            )
          )
          .limit(env.SPIRE_TICK_ARTICLES_PER_RUN);

        for (const plan of toPublish) {
          try {
            await publishArticle({
              db: tx,
              octokit,
              owner: env.GITHUB_OWNER,
              repo: env.GITHUB_REPO,
              branch: env.GITHUB_BRANCH,
              contentPlanId: plan.id,
            });
            siteTotals.published += 1;
          } catch (err) {
            siteTotals.failed += 1;
            logger.warn(
              {
                contentPlanId: plan.id,
                err: err instanceof Error ? err.message : String(err),
              },
              "Publish step failed"
            );
          }
        }

        await tx
          .update(schema.runs)
          .set({
            finishedAt: new Date(),
            planned: siteTotals.planned,
            generated: siteTotals.generated,
            published: siteTotals.published,
            failed: siteTotals.failed,
            log: scrubForStorage({ siteTotals }) as Record<string, unknown>,
          })
          .where(eq(schema.runs.id, runRow.id));
      });

      totals.planned += siteTotals.planned;
      totals.generated += siteTotals.generated;
      totals.published += siteTotals.published;
      totals.failed += siteTotals.failed;
      totals.sites.push(siteTotals);
      logger.info(siteTotals, "Site tick done");
    }
  } finally {
    await raw.end({ timeout: 5 });
  }

  return totals;
}
