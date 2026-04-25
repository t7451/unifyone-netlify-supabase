import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../schema.js";
import {
  outreachCampaigns,
  outreachMessages,
  outreachProspects,
  outreachSequences,
} from "../../schema.js";
import { callClaude } from "../../lib/anthropic.js";
import { logger } from "../../lib/logger.js";
import { renderPitchPrompt } from "./tokens.js";

type DB = PostgresJsDatabase<typeof schema>;

export interface DraftInput {
  db: DB;
  anthropic: Anthropic;
  model: string;
  sequenceId: string;
  step: number; // 0=initial, 1=follow-up, 2=breakup
  // For breakup: caller passes original_subject + one_line_ask. For step 0/1
  // we derive context from the sequence + prospect + asset.
  breakupContext?: { originalSubject: string; oneLineAsk: string };
  // Optional override (mostly for tests).
  recentPosts?: string;
  topicIdeas?: string;
  credibility?: string;
}

export interface DraftResult {
  ok: boolean;
  messageId?: string;
  subject?: string;
  body?: string;
  reason?: string;
}

const QUALITY_TELLS: RegExp[] = [
  /i hope this email finds you well/i,
  /i hope this finds you well/i,
  /i came across your website/i,
  /i noticed that you/i,
  /just wanted to reach out/i,
  /touching base/i,
];

function firstNameOf(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const tok = fullName.trim().split(/\s+/)[0] ?? "";
  if (tok.length < 2) return "";
  return tok;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

interface RawDraft {
  subject?: string;
  body?: string;
}

function parseClaudeJson(text: string): RawDraft {
  // Strip leading/trailing fences if Claude added them.
  const trimmed = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(trimmed) as RawDraft;
}

export async function draftPitch({
  db,
  anthropic,
  model,
  sequenceId,
  step,
  breakupContext,
  recentPosts,
  topicIdeas,
  credibility,
}: DraftInput): Promise<DraftResult> {
  const seqRows = await db
    .select()
    .from(outreachSequences)
    .where(eq(outreachSequences.id, sequenceId))
    .limit(1);
  if (seqRows.length === 0) {
    return { ok: false, reason: "sequence_not_found" };
  }
  const sequence = seqRows[0]!;

  const campRows = await db
    .select()
    .from(outreachCampaigns)
    .where(eq(outreachCampaigns.id, sequence.campaignId))
    .limit(1);
  const campaign = campRows[0];
  if (!campaign) return { ok: false, reason: "campaign_not_found" };

  const prosRows = await db
    .select()
    .from(outreachProspects)
    .where(eq(outreachProspects.id, sequence.prospectId))
    .limit(1);
  const prospect = prosRows[0];
  if (!prospect) return { ok: false, reason: "prospect_not_found" };

  // Determine prompt name + variables.
  let promptName: "broken-link" | "resource-page" | "guest-post" | "breakup";
  let vars: Record<string, string>;

  if (step === 2) {
    if (!breakupContext) {
      return { ok: false, reason: "breakup_context_required" };
    }
    promptName = "breakup";
    vars = {
      ORIGINAL_SUBJECT: breakupContext.originalSubject,
      ONE_LINE_ASK: breakupContext.oneLineAsk,
      FROM_NAME: campaign.fromName,
    };
  } else if (campaign.campaignType === "broken_link") {
    promptName = "broken-link";
    vars = {
      FROM_NAME: campaign.fromName,
      PROSPECT_DOMAIN: prospect.domain,
      SOURCE_PAGE_URL: prospect.backlinkUrl ?? "",
      BROKEN_URL: prospect.competitorUrl ?? prospect.backlinkUrl ?? "",
      ANCHOR_TEXT: prospect.anchorText ?? "",
      ASSET_URL: sequence.assetUrl ?? "",
      ASSET_TITLE: sequence.assetTitle ?? "",
      MATCH_RATIONALE: sequence.pitchAngle ?? "",
      FIRST_NAME: firstNameOf(prospect.prospectContactName),
    };
  } else if (campaign.campaignType === "resource_page") {
    promptName = "resource-page";
    vars = {
      FROM_NAME: campaign.fromName,
      SOURCE_PAGE_URL: prospect.backlinkUrl ?? "",
      PAGE_TOPIC: prospect.anchorText ?? "",
      ASSET_URL: sequence.assetUrl ?? "",
      ASSET_TITLE: sequence.assetTitle ?? "",
      MATCH_RATIONALE: sequence.pitchAngle ?? "",
      GAP_RATIONALE:
        "Operator-built, not affiliate-driven; covers the workflow itself, not just terminology.",
      FIRST_NAME: firstNameOf(prospect.prospectContactName),
    };
  } else {
    promptName = "guest-post";
    vars = {
      FROM_NAME: campaign.fromName,
      PROSPECT_DOMAIN: prospect.domain,
      RECENT_POSTS: recentPosts ?? "(not enriched)",
      PITCH_ANGLE: sequence.pitchAngle ?? "",
      TOPIC_IDEAS: topicIdeas ?? "(see pitch_angle for primary)",
      CREDIBILITY:
        credibility ??
        "Operator at 1Commerce; ship product to gig workers and micro-merchants daily.",
    };
  }

  const userPrompt = renderPitchPrompt(promptName, vars);

  let raw: RawDraft;
  try {
    const out = await callClaude(anthropic, model, {
      user: userPrompt,
      maxTokens: 1500,
      effort: "high",
      think: true,
    });
    raw = parseClaudeJson(out.text);
  } catch (err) {
    logger.warn(
      {
        sequenceId,
        step,
        err: err instanceof Error ? err.message : String(err),
      },
      "draftPitch failed"
    );
    return { ok: false, reason: "claude_error" };
  }

  if (
    !raw.subject ||
    !raw.body ||
    raw.subject.trim().length === 0 ||
    raw.body.trim().length === 0
  ) {
    return { ok: false, reason: "empty_output" };
  }

  // Quality gate.
  const subjectLower = raw.subject.toLowerCase();
  if (subjectLower.startsWith("re:") && step !== 2) {
    return { ok: false, reason: "subject_starts_with_re" };
  }
  if (subjectLower.startsWith("fw:")) {
    return { ok: false, reason: "subject_starts_with_fw" };
  }
  if (/[\u{1F300}-\u{1FAFF}]/u.test(raw.subject)) {
    return { ok: false, reason: "subject_contains_emoji" };
  }
  if (/\b[A-Z]{4,}\b/.test(raw.subject)) {
    return { ok: false, reason: "subject_contains_all_caps_word" };
  }
  for (const re of QUALITY_TELLS) {
    if (re.test(raw.body)) {
      return { ok: false, reason: `body_contains_tell_${re.source}` };
    }
  }
  // Asset URL appears at most once.
  if (sequence.assetUrl) {
    const occ = raw.body.split(sequence.assetUrl).length - 1;
    if (occ > 1) {
      return { ok: false, reason: "asset_url_repeated" };
    }
  }

  // Word-count band per prompt.
  const wc = wordCount(raw.body);
  const bands: Record<typeof promptName, [number, number]> = {
    "broken-link": [60, 160],
    "resource-page": [70, 170],
    "guest-post": [120, 230],
    breakup: [25, 75],
  };
  const [lo, hi] = bands[promptName];
  if (wc < lo || wc > hi) {
    return {
      ok: false,
      reason: `body_word_count_${wc}_outside_${lo}_${hi}`,
    };
  }

  // Compute scheduled_for: step 0 = now, 1 = +5d, 2 = +12d.
  const now = new Date();
  const scheduledFor =
    step === 0
      ? now
      : step === 1
        ? new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);

  // Status: pending_approval until autopilot is on for this campaign.
  const status: "pending_approval" | "scheduled" = campaign.autopilot
    ? "scheduled"
    : "pending_approval";

  // Upsert into messages on (sequence_id, step).
  const existing = await db
    .select()
    .from(outreachMessages)
    .where(
      and(
        eq(outreachMessages.sequenceId, sequenceId),
        eq(outreachMessages.step, step)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const existingMsg = existing[0]!;
    await db
      .update(outreachMessages)
      .set({
        subject: raw.subject,
        bodyText: raw.body,
        status,
        scheduledFor,
        error: null,
      })
      .where(eq(outreachMessages.id, existingMsg.id));
    return {
      ok: true,
      messageId: existingMsg.id,
      subject: raw.subject,
      body: raw.body,
    };
  }

  const inserted = await db
    .insert(outreachMessages)
    .values({
      sequenceId,
      step,
      status,
      scheduledFor,
      subject: raw.subject,
      bodyText: raw.body,
    })
    .returning({ id: outreachMessages.id });

  return {
    ok: true,
    messageId: inserted[0]!.id,
    subject: raw.subject,
    body: raw.body,
  };
}

void schema;
