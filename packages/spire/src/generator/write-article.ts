import { eq } from "drizzle-orm";
import type Anthropic from "@anthropic-ai/sdk";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "../lib/db.js";
import { callClaude } from "../lib/anthropic.js";
import { renderPrompt } from "../lib/prompts.js";
import { logger } from "../lib/logger.js";
import { qualityGate, type QualityReport } from "./quality-gate.js";
import type { Brief } from "./build-brief.js";

type DB = PostgresJsDatabase<typeof schema>;

export type WriteArticleResult = {
  status: "review" | "published" | "failed";
  qualityScore: number;
  wordCount: number;
  report: QualityReport;
};

export async function writeArticle(input: {
  db: DB;
  anthropic: Anthropic;
  model: string;
  contentPlanId: string;
  /** If the site has autopublish on AND score >= threshold, publish straight through. */
  autopublishThreshold?: number;
}): Promise<WriteArticleResult> {
  const { db, anthropic, model, contentPlanId, autopublishThreshold } = input;

  const [plan] = await db
    .select()
    .from(schema.contentPlan)
    .where(eq(schema.contentPlan.id, contentPlanId))
    .limit(1);
  if (!plan) throw new Error(`Content plan not found: ${contentPlanId}`);
  if (!plan.brief)
    throw new Error(
      `Content plan ${contentPlanId} has no brief; run buildBrief first`
    );

  const [site] = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.id, plan.siteId))
    .limit(1);
  if (!site) throw new Error(`Site not found: ${plan.siteId}`);

  // Brief shape is validated at insert time in build-brief.ts, but jsonb
  // round-trips as unknown — cast carefully here.
  const brief = plan.brief as Brief;

  // Mark generating and increment attempts atomically.
  await db
    .update(schema.contentPlan)
    .set({
      status: "generating",
      attempts: plan.attempts + 1,
    })
    .where(eq(schema.contentPlan.id, plan.id));

  try {
    const outlineMd = brief.outline
      .map((o, i) => {
        const h3s = o.h3s.map(h3 => `   - H3: ${h3}`).join("\n");
        const notes = o.notes ? `\n  Notes: ${o.notes}` : "";
        return `${i + 1}. H2: ${o.h2}${notes}\n${h3s}`;
      })
      .join("\n\n");

    const internalLinksBlock = brief.internalLinks
      .map(l => `- "${l.anchor}" → ${l.url} (${l.placement})`)
      .join("\n");

    const outboundBlock =
      brief.outboundSources.length === 0
        ? "(no outbound sources — use zero outbound links)"
        : brief.outboundSources.map(s => `- ${s.title} → ${s.url}`).join("\n");

    const proofBlock = brief.proofPoints
      .filter(p => !p.needs_verification)
      .map(p => `- ${p.claim}`)
      .join("\n");

    const prompt = renderPrompt("write-article", {
      SITE_NAME: site.slug,
      SITE_DOMAIN: site.domain,
      TITLE: brief.title,
      TARGET_KEYWORD: plan.targetKeyword,
      TARGET_WORD_COUNT: String(brief.targetWordCount),
      OUTLINE_MARKDOWN: outlineMd,
      KEY_QUESTIONS: brief.keyQuestions.map(q => `- ${q}`).join("\n"),
      INTERNAL_LINKS: internalLinksBlock,
      OUTBOUND_SOURCES: outboundBlock,
      PROOF_POINTS:
        proofBlock.length > 0
          ? proofBlock
          : "(none supplied — anchor on specifics from your general knowledge)",
    });

    logger.info(
      { contentPlanId, slug: plan.slug, targetWords: brief.targetWordCount },
      "Generating article"
    );

    // Article generation is the biggest call — max_tokens generous so the
    // model can finish a 2000-word piece plus thinking overhead.
    const { text } = await callClaude(anthropic, model, {
      user: prompt,
      maxTokens: 32000,
      effort: "xhigh",
      think: true,
    });

    const markdown = text.trim();
    // Mesh crosslinks are grafted onto the brief by build-brief.ts; they
    // flow through jsonb round-trip as `meshCrosslinks`. Pass them to the
    // quality gate so cross-site URLs count as internal, not outbound, and
    // so the mesh_links_present check fires when coverage exists.
    const meshCrosslinks = brief.meshCrosslinks ?? [];
    const report = qualityGate(
      markdown,
      brief.internalLinks,
      brief.outboundSources,
      meshCrosslinks
    );

    if (!report.pass) {
      await db
        .update(schema.contentPlan)
        .set({
          status: "failed",
          contentMd: markdown, // keep for manual inspection
          wordCount: report.wordCount,
          qualityScore: report.score,
          qualityReport: report,
          error: `Quality gate failed: ${report.checks
            .filter(c => !c.pass)
            .map(c => c.name)
            .join(", ")}`,
        })
        .where(eq(schema.contentPlan.id, plan.id));

      logger.warn(
        {
          contentPlanId,
          score: report.score,
          failed: report.checks.filter(c => !c.pass).map(c => c.name),
        },
        "Article failed quality gate"
      );
      return {
        status: "failed",
        qualityScore: report.score,
        wordCount: report.wordCount,
        report,
      };
    }

    // Decide target status. Autopublish only when caller passed a threshold
    // AND the score clears it. Without a threshold, everything lands in review.
    const shouldAutopublish =
      typeof autopublishThreshold === "number" &&
      report.score >= autopublishThreshold;
    const nextStatus: "review" | "published" = shouldAutopublish
      ? "published"
      : "review";

    await db
      .update(schema.contentPlan)
      .set({
        status: nextStatus,
        contentMd: markdown,
        wordCount: report.wordCount,
        qualityScore: report.score,
        qualityReport: report,
        error: null,
      })
      .where(eq(schema.contentPlan.id, plan.id));

    logger.info(
      {
        contentPlanId,
        status: nextStatus,
        score: report.score,
        words: report.wordCount,
      },
      "Article written"
    );

    return {
      status: nextStatus,
      qualityScore: report.score,
      wordCount: report.wordCount,
      report,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.contentPlan)
      .set({
        status: "failed",
        error: message.slice(0, 2000),
      })
      .where(eq(schema.contentPlan.id, plan.id));
    logger.error({ contentPlanId, err: message }, "Article generation threw");
    throw err;
  }
}
