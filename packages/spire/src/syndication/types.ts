import type { ContentPlan, Site } from "../schema.js";

// Adapters take ContentPlan + Site, return SyndicationResult. They never
// touch the database — the orchestrator (publish.ts) handles all writes.

export type SyndicationResult = {
  ok: boolean;
  externalUrl?: string;
  externalId?: string;
  /** Raw response from the platform — stored on spire_syndications.response. */
  response?: Record<string, unknown>;
  error?: string;
  /** Default true. Set false for permanent errors (bad auth, schema mismatch). */
  retryable?: boolean;
};

export type Adapter = (
  plan: ContentPlan,
  site: Site
) => Promise<SyndicationResult>;

// Frontmatter shape the adapters expect to find on plan.brief or in
// content_md's --- block. ContentPlan.brief is a jsonb that already carries
// title + metaDescription from build-brief.ts — we read those.
export type PlanFrontmatter = {
  title: string;
  description: string;
  tags?: string[];
  publishedAt?: string;
};

/**
 * Strip the leading --- block from a Markdown body so the adapter can
 * pass the actual content to platforms that only accept body text.
 * (Spire-published Markdown carries Astro frontmatter that those platforms
 * don't understand.)
 */
export function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("\n---", 3);
  if (end === -1) return md;
  // Skip past the closing fence + the newline that follows.
  return md.slice(end + 4).replace(/^\s*\n/, "");
}

/** Site domain → canonical URL builder. Mirrors apps/unifyone routing. */
export function canonicalUrlFor(site: Site, slug: string): string {
  const host = site.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${host}/blog/${slug}`;
}
