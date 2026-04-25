import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";
import { callClaude } from "../lib/anthropic.js";
import { renderPrompt } from "../lib/prompts.js";
import { logger } from "../lib/logger.js";
import type { ParsedHaroQuery } from "./parse.js";

const VariationSchema = z.object({
  angle: z.string().min(1).max(120),
  subject_line: z.string().min(1).max(200),
  body: z.string().min(50).max(3000),
});

const DraftResponseSchema = z.object({
  variations: z.array(VariationSchema).min(2).max(4),
});
export type DraftResponse = z.infer<typeof DraftResponseSchema>;

const JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["variations"],
  properties: {
    variations: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["angle", "subject_line", "body"],
        properties: {
          angle: { type: "string" },
          subject_line: { type: "string" },
          body: { type: "string" },
        },
      },
    },
  },
};

type DB = PostgresJsDatabase<typeof schema>;

export async function draftHaroResponse(input: {
  db: DB;
  anthropic: Anthropic;
  model: string;
  query: ParsedHaroQuery;
  siteSlug: string;
  matchedClusters: string[];
}): Promise<DraftResponse | null> {
  const { db, anthropic, model, query, siteSlug, matchedClusters } = input;

  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.slug, siteSlug))
    .limit(1);
  if (!site) throw new Error(`Site ${siteSlug} not registered`);

  // Anchor context: find one published high-quality piece in any of the
  // matched clusters so the pitch can cite a specific URL.
  let angleContext =
    "No specific cluster matched; pitch from general operator perspective.";
  if (matchedClusters.length > 0) {
    const topClusterPieces = await db
      .select({
        title: schema.contentPlan.title,
        slug: schema.contentPlan.slug,
        cluster: schema.keywords.cluster,
        qualityScore: schema.contentPlan.qualityScore,
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
          inArray(schema.keywords.cluster, matchedClusters)
        )
      )
      .orderBy(desc(schema.contentPlan.qualityScore))
      .limit(1);

    const piece = topClusterPieces[0];
    if (piece) {
      angleContext = `Matched clusters: ${matchedClusters.join(", ")}.\nReference piece: "${piece.title}" at ${site.domain}/blog/${piece.slug} (quality ${piece.qualityScore}). Cite this if the angle aligns.`;
    } else {
      angleContext = `Matched clusters: ${matchedClusters.join(", ")}. No published piece exists yet — pitch from operator/practitioner experience without a citation URL.`;
    }
  }

  const prompt = renderPrompt("../haro/prompts/draft-response", {
    SITE_NAME: site.slug,
    SITE_DOMAIN: site.domain,
    SUBJECT: query.subject,
    OUTLET: query.outlet ?? "(unspecified)",
    CATEGORY: query.category ?? "(unspecified)",
    DEADLINE: query.deadline_iso ?? "(no deadline parsed)",
    QUERY_BODY: query.query_body.slice(0, 4000),
    ANGLE_CONTEXT: angleContext,
  });

  try {
    const { text } = await callClaude(anthropic, model, {
      user: prompt,
      maxTokens: 4000,
      effort: "high",
      think: true,
      jsonSchema: JSON_SCHEMA,
    });

    const parsed = DraftResponseSchema.safeParse(safeJsonParse(text));
    if (!parsed.success) {
      logger.warn(
        { issues: parsed.error.issues, preview: text.slice(0, 300) },
        "Draft response failed validation; skipping draft for this opportunity"
      );
      return null;
    }
    return parsed.data;
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Draft response generation threw"
    );
    return null;
  }
}

function safeJsonParse(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
  return JSON.parse(stripped);
}
