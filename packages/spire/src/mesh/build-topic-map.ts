import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import { schema } from "../lib/db.js";
import { logger } from "../lib/logger.js";

// Loader that ingests the topic-clusters.json seed file (from
// apps/spire-admin/config/mesh/) into Neon. Idempotent — re-running updates
// display_name / description on clusters and coverage rows.

export const MeshSeedSchema = z.object({
  clusters: z
    .array(
      z.object({
        slug: z.string().min(1).max(80),
        display_name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .min(1),
  coverage: z
    .array(
      z.object({
        site: z.string().min(1),
        cluster: z.string().min(1),
        primary_path: z.string().startsWith("/"),
        weight: z.number().int().min(0).max(100),
      })
    )
    .min(1),
});

export type MeshSeed = z.infer<typeof MeshSeedSchema>;

type DB = PostgresJsDatabase<typeof schema>;

export type SeedMeshResult = {
  clustersUpserted: number;
  coverageUpserted: number;
  skippedMissingSites: string[];
};

export async function seedMesh(input: {
  db: DB;
  seed: MeshSeed;
}): Promise<SeedMeshResult> {
  const { db, seed } = input;

  // 1. Upsert clusters → get id by cluster slug.
  const clusterIdByCluster = new Map<string, string>();
  for (const c of seed.clusters) {
    const [row] = await db
      .insert(schema.meshTopics)
      .values({
        cluster: c.slug,
        displayName: c.display_name,
        description: c.description ?? null,
      })
      .onConflictDoUpdate({
        target: schema.meshTopics.cluster,
        set: {
          displayName: c.display_name,
          description: c.description ?? null,
        },
      })
      .returning({ id: schema.meshTopics.id });
    if (row) clusterIdByCluster.set(c.slug, row.id);
  }
  logger.info({ upserted: clusterIdByCluster.size }, "Mesh clusters upserted");

  // 2. Site slug → id lookup. Coverage rows whose site isn't registered yet
  //    are collected for the caller to report; we don't auto-register.
  const allSites = await db.select().from(schema.sites);
  const siteIdBySlug = new Map(allSites.map(s => [s.slug, s.id] as const));

  let coverageUpserted = 0;
  const skippedMissingSites: string[] = [];

  for (const c of seed.coverage) {
    const siteId = siteIdBySlug.get(c.site);
    const topicId = clusterIdByCluster.get(c.cluster);
    if (!siteId) {
      skippedMissingSites.push(c.site);
      continue;
    }
    if (!topicId) {
      logger.warn(
        { coverage: c },
        "Coverage references unknown cluster — skipping"
      );
      continue;
    }
    await db
      .insert(schema.meshCoverage)
      .values({
        siteId,
        topicId,
        primaryPath: c.primary_path,
        authorityWeight: c.weight,
      })
      .onConflictDoUpdate({
        target: [
          schema.meshCoverage.siteId,
          schema.meshCoverage.topicId,
          schema.meshCoverage.primaryPath,
        ],
        set: { authorityWeight: c.weight },
      });
    coverageUpserted += 1;
  }

  if (skippedMissingSites.length > 0) {
    logger.warn(
      { sites: Array.from(new Set(skippedMissingSites)) },
      "Coverage references sites that are not yet registered — register them first to pick up these rows"
    );
  }

  return {
    clustersUpserted: clusterIdByCluster.size,
    coverageUpserted,
    skippedMissingSites: Array.from(new Set(skippedMissingSites)),
  };
}

// Report helper for `spire mesh report` — which clusters have coverage,
// which are orphaned. Used by the CLI.
export async function meshCoverageReport(db: DB): Promise<{
  clusters: Array<{
    cluster: string;
    displayName: string;
    siteCount: number;
    sites: string[];
  }>;
  orphans: string[];
}> {
  const topics = await db.select().from(schema.meshTopics);
  const coverage = await db
    .select({
      topicId: schema.meshCoverage.topicId,
      siteSlug: schema.sites.slug,
      weight: schema.meshCoverage.authorityWeight,
    })
    .from(schema.meshCoverage)
    .innerJoin(schema.sites, eq(schema.sites.id, schema.meshCoverage.siteId));

  const bySite = new Map<string, Array<{ site: string; weight: number }>>();
  for (const c of coverage) {
    const list = bySite.get(c.topicId) ?? [];
    list.push({ site: c.siteSlug, weight: c.weight });
    bySite.set(c.topicId, list);
  }

  const clusters = topics.map(t => {
    const sites = (bySite.get(t.id) ?? [])
      .sort((a, b) => b.weight - a.weight)
      .map(s => s.site);
    return {
      cluster: t.cluster,
      displayName: t.displayName,
      siteCount: sites.length,
      sites,
    };
  });
  const orphans = clusters.filter(c => c.siteCount === 0).map(c => c.cluster);
  return { clusters, orphans };
}
