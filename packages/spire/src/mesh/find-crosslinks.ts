import { and, desc, eq, ne } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";

// Returns mesh crosslink suggestions for a given keyword cluster. Prefers
// cross-site links over same-site (the whole point of the mesh), but falls
// back to same-site when no other coverage exists.

export type MeshCrosslink = {
  siteSlug: string;
  siteDomain: string;
  url: string; // absolute URL — cross-site links need full host
  anchorHint: string; // suggested anchor seed; Claude will vary it
  authorityWeight: number;
  isCrossSite: boolean;
};

type DB = PostgresJsDatabase<typeof schema>;

export async function findCrosslinks(input: {
  db: DB;
  currentSiteId: string;
  /** The keyword's cluster from spire_keywords. May be null. */
  cluster: string | null;
  /** Max suggestions to return. */
  limit?: number;
}): Promise<MeshCrosslink[]> {
  const { db, currentSiteId, cluster, limit = 4 } = input;

  if (!cluster) return [];

  // Find the topic row matching this cluster. The keyword's `cluster` field
  // comes from expand-keywords and may be arbitrarily named; the mesh uses
  // its own normalized slugs. We try an exact match first. If the mapping is
  // missing, the article just doesn't get mesh links — quality gate will
  // skip the mesh check when mesh_crosslinks was empty.
  const [topic] = await db
    .select()
    .from(schema.meshTopics)
    .where(eq(schema.meshTopics.cluster, cluster))
    .limit(1);
  if (!topic) return [];

  // Cross-site candidates — preferred.
  const crossSite = await db
    .select({
      siteSlug: schema.sites.slug,
      siteDomain: schema.sites.domain,
      primaryPath: schema.meshCoverage.primaryPath,
      authorityWeight: schema.meshCoverage.authorityWeight,
    })
    .from(schema.meshCoverage)
    .innerJoin(schema.sites, eq(schema.sites.id, schema.meshCoverage.siteId))
    .where(
      and(
        eq(schema.meshCoverage.topicId, topic.id),
        ne(schema.meshCoverage.siteId, currentSiteId),
        eq(schema.sites.active, true)
      )
    )
    .orderBy(desc(schema.meshCoverage.authorityWeight))
    .limit(limit);

  const result: MeshCrosslink[] = crossSite.map(r => ({
    siteSlug: r.siteSlug,
    siteDomain: r.siteDomain,
    url: toAbsoluteUrl(r.siteDomain, r.primaryPath),
    anchorHint: topic.displayName,
    authorityWeight: r.authorityWeight,
    isCrossSite: true,
  }));

  // Top-up with same-site coverage only if we have fewer than 2 cross-site
  // candidates. The goal is building the mesh, not padding.
  if (result.length < 2) {
    const sameSite = await db
      .select({
        siteSlug: schema.sites.slug,
        siteDomain: schema.sites.domain,
        primaryPath: schema.meshCoverage.primaryPath,
        authorityWeight: schema.meshCoverage.authorityWeight,
      })
      .from(schema.meshCoverage)
      .innerJoin(schema.sites, eq(schema.sites.id, schema.meshCoverage.siteId))
      .where(
        and(
          eq(schema.meshCoverage.topicId, topic.id),
          eq(schema.meshCoverage.siteId, currentSiteId)
        )
      )
      .orderBy(desc(schema.meshCoverage.authorityWeight))
      .limit(limit - result.length);

    for (const r of sameSite) {
      result.push({
        siteSlug: r.siteSlug,
        siteDomain: r.siteDomain,
        // Same-site links are relative paths so Spire doesn't generate
        // accidental self-referential absolute URLs.
        url: r.primaryPath,
        anchorHint: topic.displayName,
        authorityWeight: r.authorityWeight,
        isCrossSite: false,
      });
    }
  }

  return result;
}

function toAbsoluteUrl(domain: string, path: string): string {
  // Normalize: strip protocol if present, strip trailing slash, prepend https.
  const bareDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `https://${bareDomain}${normalizedPath}`;
}
