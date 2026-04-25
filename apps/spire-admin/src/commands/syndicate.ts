import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  connectNeon,
  loadEnv,
  logger,
  publishSyndication,
  schema,
  selectCandidates,
} from "@1commerce/spire";

const here = dirname(fileURLToPath(import.meta.url));
// src/commands → src → apps/spire-admin
const platformsConfigPath = join(
  here,
  "..",
  "..",
  "config",
  "syndication",
  "platforms.json"
);

const PlatformSeedSchema = z.array(
  z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    method: z.enum(["api", "browser"]),
    config: z.record(z.string(), z.unknown()),
    audience_match: z.array(z.string()).default([]),
    min_quality_score: z.number().int().min(0).max(100).default(90),
    delay_days: z.number().int().min(0).max(365).default(7),
    rate_limit_per_day: z.number().int().min(0).max(50).default(2),
    active: z.boolean().default(true),
  })
);

export async function syndicatePlatformsSeedCommand(): Promise<void> {
  const raw = readFileSync(platformsConfigPath, "utf8");
  const parsed = PlatformSeedSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Invalid config/syndication/platforms.json: ${parsed.error.issues
        .map(i => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }

  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    let inserted = 0;
    let updated = 0;
    for (const entry of parsed.data) {
      const result = await db
        .insert(schema.syndicationPlatforms)
        .values({
          slug: entry.slug,
          name: entry.name,
          method: entry.method,
          config: entry.config,
          active: entry.active,
          audienceMatch: entry.audience_match,
          minQualityScore: entry.min_quality_score,
          delayDays: entry.delay_days,
          rateLimitPerDay: entry.rate_limit_per_day,
        })
        .onConflictDoUpdate({
          target: schema.syndicationPlatforms.slug,
          set: {
            name: entry.name,
            method: entry.method,
            // config: do NOT overwrite — operator may add API keys / tweaks
            // directly to the row. Seed only sets it on insert.
            active: entry.active,
            audienceMatch: entry.audience_match,
            minQualityScore: entry.min_quality_score,
            delayDays: entry.delay_days,
            rateLimitPerDay: entry.rate_limit_per_day,
          },
        })
        .returning({
          id: schema.syndicationPlatforms.id,
          createdAt: schema.syndicationPlatforms.createdAt,
        });
      const row = result[0];
      if (!row) continue;
      const ageMs = Date.now() - row.createdAt.getTime();
      if (ageMs < 2000) inserted += 1;
      else updated += 1;
    }
    logger.info(
      { total: parsed.data.length, inserted, updated },
      "Syndication platforms seeded"
    );
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

export async function syndicateCandidatesCommand(input: {
  siteSlug?: string;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const result = await selectCandidates({ db, siteSlug: input.siteSlug });
    logger.info(result, "Candidate selection complete");
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

export async function syndicateQueueCommand(input: {
  contentPlanId: string;
  platformSlug: string;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const [platform] = await db
      .select()
      .from(schema.syndicationPlatforms)
      .where(eq(schema.syndicationPlatforms.slug, input.platformSlug))
      .limit(1);
    if (!platform)
      throw new Error(`Platform ${input.platformSlug} not registered`);

    const [plan] = await db
      .select()
      .from(schema.contentPlan)
      .where(eq(schema.contentPlan.id, input.contentPlanId))
      .limit(1);
    if (!plan) throw new Error(`Content plan ${input.contentPlanId} not found`);
    if (plan.status !== "published") {
      throw new Error(
        `Plan status is ${plan.status}; only 'published' plans can be syndicated`
      );
    }

    const [row] = await db
      .insert(schema.syndications)
      .values({
        contentPlanId: plan.id,
        platformId: platform.id,
        status: "queued",
      })
      .onConflictDoUpdate({
        target: [
          schema.syndications.contentPlanId,
          schema.syndications.platformId,
        ],
        set: {
          status: "queued",
          attempts: 0,
          error: null,
          response: null,
          queuedAt: new Date(),
        },
      })
      .returning({ id: schema.syndications.id });

    logger.info(
      { syndicationId: row?.id, platform: platform.slug, plan: plan.slug },
      "Syndication queued"
    );
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

export async function syndicateRunCommand(input: {
  syndicationId: string;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const result = await publishSyndication({
      db,
      syndicationId: input.syndicationId,
    });
    logger.info(result, "Syndication run complete");
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}

export async function syndicateStatusCommand(input: {
  siteSlug?: string;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: rawSql, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const recentQuery = db
      .select({
        id: schema.syndications.id,
        platform: schema.syndicationPlatforms.slug,
        siteSlug: schema.sites.slug,
        planSlug: schema.contentPlan.slug,
        status: schema.syndications.status,
        externalUrl: schema.syndications.externalUrl,
        publishedAt: schema.syndications.publishedAt,
        error: schema.syndications.error,
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
      .innerJoin(schema.sites, eq(schema.sites.id, schema.contentPlan.siteId))
      .orderBy(desc(schema.syndications.queuedAt))
      .limit(20);

    const recent = input.siteSlug
      ? await recentQuery.where(eq(schema.sites.slug, input.siteSlug))
      : await recentQuery;

    logger.info({ recent }, "Recent syndications");
  } finally {
    await rawSql.end({ timeout: 5 });
  }
}
