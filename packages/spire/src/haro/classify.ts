import { eq } from "drizzle-orm";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";
import { callClaude } from "../lib/anthropic.js";
import { renderPrompt } from "../lib/prompts.js";
import { logger } from "../lib/logger.js";
import type { ParsedHaroQuery } from "./parse.js";

const ClassifyResponseSchema = z.object({
  matched_clusters: z.array(z.string()).max(5),
  match_score: z.number().int().min(0).max(100),
  rationale: z.string().min(1).max(500),
});
export type ClassifyResponse = z.infer<typeof ClassifyResponseSchema>;

const JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["matched_clusters", "match_score", "rationale"],
  properties: {
    matched_clusters: { type: "array", maxItems: 5, items: { type: "string" } },
    match_score: { type: "integer", minimum: 0, maximum: 100 },
    rationale: { type: "string" },
  },
};

type DB = PostgresJsDatabase<typeof schema>;

export async function classifyHaroQuery(input: {
  db: DB;
  anthropic: Anthropic;
  model: string;
  query: ParsedHaroQuery;
  siteSlug: string;
}): Promise<ClassifyResponse> {
  const { db, anthropic, model, query, siteSlug } = input;

  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.slug, siteSlug))
    .limit(1);
  if (!site) throw new Error(`Site ${siteSlug} not registered`);

  const topics = await db.select().from(schema.meshTopics);
  if (topics.length === 0) {
    return {
      matched_clusters: [],
      match_score: 0,
      rationale: "No mesh clusters defined for this site; cannot classify.",
    };
  }

  const clustersList = topics
    .map(t => `- ${t.cluster}: ${t.description ?? t.displayName}`)
    .join("\n");

  const prompt = renderPrompt("../haro/prompts/classify", {
    SITE_NAME: site.slug,
    SITE_DOMAIN: site.domain,
    CLUSTERS_LIST: clustersList,
    SUBJECT: query.subject,
    OUTLET: query.outlet ?? "(unspecified)",
    CATEGORY: query.category ?? "(unspecified)",
    QUERY_BODY: query.query_body.slice(0, 4000),
  });

  const { text } = await callClaude(anthropic, model, {
    user: prompt,
    maxTokens: 1500,
    effort: "high",
    think: true,
    jsonSchema: JSON_SCHEMA,
  });

  const parsed = ClassifyResponseSchema.safeParse(safeJsonParse(text));
  if (!parsed.success) {
    logger.warn(
      { issues: parsed.error.issues, preview: text.slice(0, 300) },
      "Classify response did not match schema; defaulting to score=0"
    );
    return {
      matched_clusters: [],
      match_score: 0,
      rationale: "Classifier output failed validation.",
    };
  }

  // Drop matched clusters that aren't in the site's mesh — Claude
  // sometimes hallucinates close-but-not-exact slugs.
  const validSlugs = new Set(topics.map(t => t.cluster));
  parsed.data.matched_clusters = parsed.data.matched_clusters.filter(c =>
    validSlugs.has(c)
  );

  return parsed.data;
}

function safeJsonParse(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
  return JSON.parse(stripped);
}
