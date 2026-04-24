import { eq } from "drizzle-orm";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";
import { callClaude } from "../lib/anthropic.js";
import { renderPrompt } from "../lib/prompts.js";
import { logger } from "../lib/logger.js";

// Zod schema Claude's response must conform to. Enforced client-side even
// though we also pass json_schema to Claude — the API schema validation is
// best-effort; our local parse is the real gate.
const ExpandedKeyword = z.object({
  term: z.string().min(1).max(200).trim().toLowerCase(),
  cluster: z.string().min(1).max(80),
  intent: z.enum([
    "informational",
    "commercial",
    "transactional",
    "navigational",
  ]),
  priority: z.number().int().min(0).max(100),
  reason: z.string().min(1).max(500).optional(),
});
const ExpandResponse = z.object({
  keywords: z.array(ExpandedKeyword).min(20).max(300),
});

type DB = PostgresJsDatabase<typeof schema>;

// JSON schema fed to Claude via output_config.format. Kept in lockstep with
// ExpandResponse above — the zod schema is what validates, this just helps
// Claude format correctly on the first try.
const JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["keywords"],
  properties: {
    keywords: {
      type: "array",
      minItems: 20,
      maxItems: 300,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "cluster", "intent", "priority"],
        properties: {
          term: { type: "string", minLength: 1, maxLength: 200 },
          cluster: { type: "string", minLength: 1, maxLength: 80 },
          intent: {
            type: "string",
            enum: [
              "informational",
              "commercial",
              "transactional",
              "navigational",
            ],
          },
          priority: { type: "integer", minimum: 0, maximum: 100 },
          reason: { type: "string" },
        },
      },
    },
  },
};

export type ExpandResult = {
  created: number;
  updated: number;
  rejected: number;
  clusters: string[];
};

export async function expandKeywords(input: {
  db: DB;
  anthropic: Anthropic;
  model: string;
  siteId: string;
  seedKeywords: string[];
}): Promise<ExpandResult> {
  const { db, anthropic, model, siteId, seedKeywords } = input;

  if (seedKeywords.length === 0) {
    throw new Error("expandKeywords: seedKeywords is empty");
  }

  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.id, siteId))
    .limit(1);
  if (!site) throw new Error(`Site not found: ${siteId}`);

  const prompt = renderPrompt("expand-keywords", {
    SITE_NAME: site.slug,
    SITE_DOMAIN: site.domain,
    SITE_NICHE: site.niche,
    TARGET_AUDIENCES: site.targetAudiences.join(", "),
    SEED_KEYWORDS_LIST: seedKeywords.map(k => `- ${k}`).join("\n"),
  });

  logger.info(
    { siteId, seeds: seedKeywords.length },
    "Calling Claude for keyword expansion"
  );

  const { text } = await callClaude(anthropic, model, {
    user: prompt,
    // 60–200 keywords × ~30 tokens each + object wrapping ≈ 8–10K output tokens.
    // Headroom for the full spec upper bound.
    maxTokens: 16000,
    effort: "high",
    think: true,
    jsonSchema: JSON_SCHEMA,
  });

  const parsed = ExpandResponse.safeParse(safeJsonParse(text));
  if (!parsed.success) {
    logger.error(
      { issues: parsed.error.issues, preview: text.slice(0, 500) },
      "Claude response failed zod validation"
    );
    throw new Error(
      `Keyword expansion response did not match schema: ${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
  }

  // De-dup within the returned batch (Claude occasionally repeats).
  const seen = new Set<string>();
  const unique = parsed.data.keywords.filter(k => {
    const key = k.term.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let created = 0;
  let updated = 0;
  let rejected = 0;
  const clusters = new Set<string>();

  for (const k of unique) {
    const term = k.term.toLowerCase().trim();
    if (term.length === 0 || term.length > 200) {
      rejected += 1;
      continue;
    }
    clusters.add(k.cluster);

    // ON CONFLICT refresh cluster/intent/priority but preserve status — a
    // keyword already in `planned` or `published` shouldn't be bumped back.
    const result = await db
      .insert(schema.keywords)
      .values({
        siteId: site.id,
        term,
        cluster: k.cluster,
        intent: k.intent,
        priority: k.priority,
      })
      .onConflictDoUpdate({
        target: [schema.keywords.siteId, schema.keywords.term],
        set: {
          cluster: k.cluster,
          intent: k.intent,
          priority: k.priority,
        },
      })
      .returning({
        id: schema.keywords.id,
        createdAt: schema.keywords.createdAt,
      });

    const row = result[0];
    if (!row) {
      rejected += 1;
      continue;
    }
    // Drizzle doesn't return "inserted vs updated" directly — infer by
    // comparing created_at to the current statement timestamp. Close enough:
    // rows created in this transaction will have created_at within 2s of now.
    const ageMs = Date.now() - row.createdAt.getTime();
    if (ageMs < 2000) created += 1;
    else updated += 1;
  }

  logger.info(
    {
      siteId,
      returned: parsed.data.keywords.length,
      unique: unique.length,
      created,
      updated,
      rejected,
      clusters: clusters.size,
    },
    "Keyword expansion complete"
  );

  return { created, updated, rejected, clusters: Array.from(clusters) };
}

function safeJsonParse(text: string): unknown {
  // Claude occasionally wraps JSON in ```json fences despite instructions.
  // Strip them before parsing so one stray wrapper doesn't kill the run.
  const trimmed = text.trim();
  const stripped = trimmed
    .replace(/^```(?:json)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (err) {
    throw new Error(
      `Claude did not return valid JSON. First 200 chars: ${stripped.slice(0, 200)}... (${err instanceof Error ? err.message : String(err)})`
    );
  }
}
