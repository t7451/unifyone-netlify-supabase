import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  connectNeon,
  loadEnv,
  logger,
  renderSubmissionPayload,
  schema,
  type SubmissionPayload,
} from "@1commerce/spire";

// CLI-side queue management. Actually running a submission happens on the
// Contabo worker; here we only enqueue + report + manually retry.

export type QueueSubmissionsInput = {
  siteSlug: string;
  /** Restrict to a single directory slug. */
  directorySlug?: string;
};

export type QueueSubmissionsResult = {
  siteSlug: string;
  queued: number;
  skipped: Array<{ directory: string; reason: string }>;
};

export async function queueSubmissionsCommand(
  input: QueueSubmissionsInput
): Promise<QueueSubmissionsResult> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const [site] = await db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.slug, input.siteSlug))
      .limit(1);
    if (!site) throw new Error(`Site ${input.siteSlug} not registered`);

    // Load target directories. Filter by slug if provided; otherwise queue
    // all active directories whose categories overlap the site's audiences
    // OR carry a broad category (saas/ai/fintech).
    let dirs = await db
      .select()
      .from(schema.directories)
      .where(eq(schema.directories.active, true));
    if (input.directorySlug) {
      dirs = dirs.filter(d => d.slug === input.directorySlug);
      if (dirs.length === 0) {
        throw new Error(
          `Directory ${input.directorySlug} not found or not active`
        );
      }
    }

    const payload: SubmissionPayload = await renderSubmissionPayload({
      db,
      siteId: site.id,
    });

    // Find existing (site, directory) pairs so we can respect cooldown_days
    // and skip recently-sent ones.
    const existing = await db
      .select()
      .from(schema.submissions)
      .where(
        and(
          eq(schema.submissions.siteId, site.id),
          inArray(
            schema.submissions.directoryId,
            dirs.map(d => d.id)
          )
        )
      );
    const bySha = new Map(existing.map(s => [s.directoryId, s] as const));

    const skipped: Array<{ directory: string; reason: string }> = [];
    let queued = 0;

    for (const dir of dirs) {
      const prior = bySha.get(dir.id);
      if (prior) {
        if (prior.status === "sent" && prior.sentAt) {
          const ageDays =
            (Date.now() - prior.sentAt.getTime()) / (1000 * 60 * 60 * 24);
          if (ageDays < dir.cooldownDays) {
            skipped.push({
              directory: dir.slug,
              reason: `cooldown (sent ${Math.floor(ageDays)}d ago; ${dir.cooldownDays}d window)`,
            });
            continue;
          }
        }
        if (prior.status === "queued" || prior.status === "in_progress") {
          skipped.push({
            directory: dir.slug,
            reason: `already ${prior.status}`,
          });
          continue;
        }
        // status in ('failed', 'rejected', 'sent' past cooldown) — re-queue
        // by updating the existing row rather than inserting a duplicate
        // (unique key is (site_id, directory_id)).
        await db
          .update(schema.submissions)
          .set({
            payload,
            status: "queued",
            error: null,
            response: null,
            attempts: 0,
            queuedAt: new Date(),
          })
          .where(eq(schema.submissions.id, prior.id));
        queued += 1;
        continue;
      }

      await db.insert(schema.submissions).values({
        siteId: site.id,
        directoryId: dir.id,
        payload,
        status: "queued",
      });
      queued += 1;
    }

    logger.info(
      { siteSlug: input.siteSlug, queued, skipped },
      "Submissions queued"
    );
    return { siteSlug: input.siteSlug, queued, skipped };
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

export async function submissionStatusCommand(opts?: {
  tier?: number;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const countsQuery = db
      .select({
        status: schema.submissions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.submissions)
      .innerJoin(
        schema.directories,
        eq(schema.directories.id, schema.submissions.directoryId)
      )
      .groupBy(schema.submissions.status);
    const counts = opts?.tier
      ? await countsQuery.where(eq(schema.directories.tier, opts.tier))
      : await countsQuery;

    const recentQuery = db
      .select({
        id: schema.submissions.id,
        siteSlug: schema.sites.slug,
        directorySlug: schema.directories.slug,
        tier: schema.directories.tier,
        status: schema.submissions.status,
        liveUrl: schema.submissions.liveUrl,
        error: schema.submissions.error,
        updatedAt: schema.submissions.updatedAt,
      })
      .from(schema.submissions)
      .innerJoin(schema.sites, eq(schema.sites.id, schema.submissions.siteId))
      .innerJoin(
        schema.directories,
        eq(schema.directories.id, schema.submissions.directoryId)
      )
      .orderBy(desc(schema.submissions.updatedAt))
      .limit(15);
    const recent = opts?.tier
      ? await recentQuery.where(eq(schema.directories.tier, opts.tier))
      : await recentQuery;

    logger.info({ tier: opts?.tier ?? "(all)", counts }, "Pipeline counts");
    logger.info({ recent }, "Recent submissions");
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

export async function retrySubmissionCommand(
  submissionId: string
): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const updated = await db
      .update(schema.submissions)
      .set({
        status: "queued",
        error: null,
        response: null,
        attempts: 0,
        queuedAt: new Date(),
      })
      .where(eq(schema.submissions.id, submissionId))
      .returning({ id: schema.submissions.id });
    if (updated.length === 0)
      throw new Error(`Submission ${submissionId} not found`);
    logger.info({ submissionId }, "Submission requeued");
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}
