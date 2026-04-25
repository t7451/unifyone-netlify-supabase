import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { dispatchAdapter } from "./adapters/index.js";

type DB = PostgresJsDatabase<typeof schema>;

const MAX_ATTEMPTS = 3;

export type PublishOneInput = {
  db: DB;
  syndicationId: string;
};

/**
 * Drive one syndication row through the state machine:
 *   queued → rendering → publishing → published | failed
 *
 * Picks the right adapter based on the platform.slug. For browser-method
 * platforms the API adapter returns ok:false retryable:false with a
 * deferred marker — `publish.ts` leaves the row queued so the worker
 * picks it up.
 */
export async function publishOne(input: PublishOneInput): Promise<{
  status: "published" | "failed" | "queued_for_browser";
  error?: string;
}> {
  const { db, syndicationId } = input;

  const [row] = await db
    .select({
      syndication: schema.syndications,
      platform: schema.syndicationPlatforms,
      plan: schema.contentPlan,
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
    .where(eq(schema.syndications.id, syndicationId))
    .limit(1);
  if (!row) throw new Error(`Syndication not found: ${syndicationId}`);

  // Browser-method platforms aren't handled here — the spire-worker
  // claims them by status='queued' + platform.method='browser'.
  if (row.platform.method === "browser") {
    return { status: "queued_for_browser" };
  }

  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.id, row.plan.siteId))
    .limit(1);
  if (!site) throw new Error(`Site not found for plan ${row.plan.id}`);

  const nextAttempts = row.syndication.attempts + 1;
  await db
    .update(schema.syndications)
    .set({ status: "rendering", attempts: nextAttempts })
    .where(eq(schema.syndications.id, syndicationId));

  try {
    await db
      .update(schema.syndications)
      .set({ status: "publishing" })
      .where(eq(schema.syndications.id, syndicationId));

    const result = await dispatchAdapter(row.platform.slug, row.plan, site);

    if (result.ok) {
      await db
        .update(schema.syndications)
        .set({
          status: "published",
          externalUrl: result.externalUrl ?? null,
          externalId: result.externalId ?? null,
          response: (result.response ?? null) as Record<string, unknown> | null,
          publishedAt: new Date(),
          error: null,
        })
        .where(eq(schema.syndications.id, syndicationId));
      logger.info(
        {
          syndicationId,
          platform: row.platform.slug,
          externalUrl: result.externalUrl,
        },
        "Syndication published"
      );
      return { status: "published" };
    }

    const retryable = result.retryable !== false;
    const exhausted = nextAttempts >= MAX_ATTEMPTS;
    const finalStatus = retryable && !exhausted ? "queued" : "failed";
    await db
      .update(schema.syndications)
      .set({
        status: finalStatus,
        error: result.error?.slice(0, 2000) ?? "(no error message)",
        response: (result.response ?? null) as Record<string, unknown> | null,
      })
      .where(eq(schema.syndications.id, syndicationId));

    logger.warn(
      {
        syndicationId,
        platform: row.platform.slug,
        nextAttempts,
        finalStatus,
        error: result.error,
      },
      "Syndication adapter returned non-ok"
    );
    return finalStatus === "failed"
      ? { status: "failed", error: result.error }
      : { status: "queued_for_browser" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const exhausted = nextAttempts >= MAX_ATTEMPTS;
    await db
      .update(schema.syndications)
      .set({
        status: exhausted ? "failed" : "queued",
        error: message.slice(0, 2000),
      })
      .where(eq(schema.syndications.id, syndicationId));
    logger.error({ syndicationId, err: message }, "Syndication adapter threw");
    return {
      status: exhausted ? "failed" : "queued_for_browser",
      error: message,
    };
  }
}
