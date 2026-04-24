import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";
import { callClaude } from "../lib/anthropic.js";
import { renderPrompt } from "../lib/prompts.js";
import { logger } from "../lib/logger.js";
import { slugify } from "../lib/slug.js";

// Brief schema — validated client-side. If Claude's output drifts, the
// caller gets a clear error naming the field, not a silent bad row.
const BriefSchema = z.object({
  slug: z.string().min(1).max(100),
  title: z.string().min(10).max(200),
  metaDescription: z.string().min(50).max(200),
  targetWordCount: z.number().int().min(1000).max(2500),
  outline: z
    .array(
      z.object({
        h2: z.string().min(3).max(200),
        h3s: z.array(z.string().min(3).max(200)).min(1).max(8),
        notes: z.string().min(1).max(1000).optional(),
      })
    )
    .min(3)
    .max(10),
  keyQuestions: z.array(z.string().min(5)).min(3).max(10),
  internalLinks: z
    .array(
      z.object({
        anchor: z.string().min(1),
        url: z.string().startsWith("/"),
        placement: z.string().min(1),
      })
    )
    .min(2)
    .max(8),
  outboundSources: z
    .array(
      z.object({
        title: z.string().min(1),
        url: z.string().url(),
        relevance: z.string().min(1),
      })
    )
    .max(5),
  proofPoints: z
    .array(
      z.object({
        claim: z.string().min(1),
        needs_verification: z.boolean(),
      })
    )
    .min(0)
    .max(10),
});

export type Brief = z.infer<typeof BriefSchema>;

const JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug",
    "title",
    "metaDescription",
    "targetWordCount",
    "outline",
    "keyQuestions",
    "internalLinks",
    "outboundSources",
    "proofPoints",
  ],
  properties: {
    slug: { type: "string" },
    title: { type: "string" },
    metaDescription: { type: "string", minLength: 50, maxLength: 200 },
    targetWordCount: { type: "integer", minimum: 1000, maximum: 2500 },
    outline: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["h2", "h3s"],
        properties: {
          h2: { type: "string" },
          h3s: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 8,
          },
          notes: { type: "string" },
        },
      },
    },
    keyQuestions: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 10,
    },
    internalLinks: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["anchor", "url", "placement"],
        properties: {
          anchor: { type: "string" },
          url: { type: "string" },
          placement: { type: "string" },
        },
      },
    },
    outboundSources: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "relevance"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          relevance: { type: "string" },
        },
      },
    },
    proofPoints: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "needs_verification"],
        properties: {
          claim: { type: "string" },
          needs_verification: { type: "boolean" },
        },
      },
    },
  },
};

// Default internal link targets from the spec's brand brief. Sites override
// via metadata if needed; for now this is the same set Spire sends to Claude.
const DEFAULT_INTERNAL_LINKS = [
  { anchor: "Pricing", url: "/pricing" },
  { anchor: "Developers", url: "/developers" },
  { anchor: "Gig workers", url: "/gig-workers" },
  { anchor: "Freelancers", url: "/freelancers" },
  { anchor: "Small business", url: "/smb" },
];

type DB = PostgresJsDatabase<typeof schema>;

export async function buildBrief(input: {
  db: DB;
  anthropic: Anthropic;
  model: string;
  keywordId: string;
}): Promise<{
  contentPlanId: string;
  slug: string;
  title: string;
  brief: Brief;
}> {
  const { db, anthropic, model, keywordId } = input;

  const [keyword] = await db
    .select()
    .from(schema.keywords)
    .where(eq(schema.keywords.id, keywordId))
    .limit(1);
  if (!keyword) throw new Error(`Keyword not found: ${keywordId}`);

  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.id, keyword.siteId))
    .limit(1);
  if (!site) throw new Error(`Site not found for keyword ${keywordId}`);

  const internalLinksList = DEFAULT_INTERNAL_LINKS.map(
    l => `- [${l.anchor}](${l.url})`
  ).join("\n");

  const prompt = renderPrompt("build-brief", {
    SITE_NAME: site.slug,
    SITE_DOMAIN: site.domain,
    TARGET_KEYWORD: keyword.term,
    INTENT: keyword.intent ?? "informational",
    CLUSTER: keyword.cluster ?? "general",
    PRIORITY: String(keyword.priority),
    INTERNAL_LINKS_LIST: internalLinksList,
  });

  logger.info({ keywordId, term: keyword.term }, "Building brief");

  const { text } = await callClaude(anthropic, model, {
    user: prompt,
    maxTokens: 8000,
    effort: "high",
    think: true,
    jsonSchema: JSON_SCHEMA,
  });

  const parsed = BriefSchema.safeParse(safeJsonParse(text));
  if (!parsed.success) {
    logger.error(
      { issues: parsed.error.issues, preview: text.slice(0, 500) },
      "Brief response failed zod validation"
    );
    throw new Error(
      `Brief response did not match schema: ${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
  }

  const brief = parsed.data;

  // Normalize slug: Claude's proposed slug may have punctuation, stop words,
  // or casing. slugify() enforces our own rules.
  const finalSlug = slugify(brief.slug, { maxLength: 80 });

  // Insert content plan row. If the slug collides (same site, same slug),
  // fail loudly rather than silently overwriting a previous plan.
  const existing = await db
    .select({ id: schema.contentPlan.id })
    .from(schema.contentPlan)
    .where(
      and(
        eq(schema.contentPlan.siteId, site.id),
        eq(schema.contentPlan.slug, finalSlug)
      )
    )
    .limit(1);

  if (existing[0]) {
    throw new Error(
      `Slug collision: ${finalSlug} already has a content plan for this site (${existing[0].id}). Retry brief with a different angle or manually delete the old plan.`
    );
  }

  const [row] = await db
    .insert(schema.contentPlan)
    .values({
      siteId: site.id,
      keywordId: keyword.id,
      slug: finalSlug,
      targetKeyword: keyword.term,
      title: brief.title,
      brief: brief,
      status: "queued",
    })
    .returning({ id: schema.contentPlan.id });

  // Mark keyword as planned so the queue moves forward.
  await db
    .update(schema.keywords)
    .set({ status: "planned" })
    .where(eq(schema.keywords.id, keyword.id));

  if (!row) throw new Error("Failed to insert content plan");

  logger.info(
    { contentPlanId: row.id, slug: finalSlug, title: brief.title },
    "Brief persisted"
  );

  return { contentPlanId: row.id, slug: finalSlug, title: brief.title, brief };
}

function safeJsonParse(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (err) {
    throw new Error(
      `Brief response was not valid JSON. First 200 chars: ${stripped.slice(0, 200)}... (${err instanceof Error ? err.message : String(err)})`
    );
  }
}
