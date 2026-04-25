import { and, eq } from "drizzle-orm";
import type Anthropic from "@anthropic-ai/sdk";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../schema.js";
import {
  outreachCampaigns,
  outreachProspects,
  outreachSequences,
} from "../../schema.js";
import { draftPitch } from "../pitch/draft.js";
import { selectAsset } from "../pitch/select-asset.js";

type DB = PostgresJsDatabase<typeof schema>;

export interface ScheduleSequenceInput {
  db: DB;
  anthropic: Anthropic;
  model: string;
  campaignId: string;
  prospectId: string;
  // Optional override — caller may have already chosen the asset (e.g.
  // broken-link crawler match). If omitted, selectAsset() picks one.
  assetUrl?: string;
  assetTitle?: string;
  pitchAngle?: string;
}

export interface ScheduleSequenceResult {
  ok: boolean;
  sequenceId?: string;
  step0MessageId?: string;
  reason?: string;
  rationale?: string;
}

export async function scheduleSequence({
  db,
  anthropic,
  model,
  campaignId,
  prospectId,
  assetUrl,
  assetTitle,
  pitchAngle,
}: ScheduleSequenceInput): Promise<ScheduleSequenceResult> {
  const campRows = await db
    .select()
    .from(outreachCampaigns)
    .where(eq(outreachCampaigns.id, campaignId))
    .limit(1);
  const campaign = campRows[0];
  if (!campaign) return { ok: false, reason: "campaign_not_found" };
  if (!campaign.active) return { ok: false, reason: "campaign_inactive" };

  // De-dupe.
  const existing = await db
    .select()
    .from(outreachSequences)
    .where(
      and(
        eq(outreachSequences.campaignId, campaignId),
        eq(outreachSequences.prospectId, prospectId)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    return {
      ok: false,
      sequenceId: existing[0]!.id,
      reason: "sequence_exists",
    };
  }

  const prosRows = await db
    .select()
    .from(outreachProspects)
    .where(eq(outreachProspects.id, prospectId))
    .limit(1);
  const prospect = prosRows[0];
  if (!prospect) return { ok: false, reason: "prospect_not_found" };
  if (!prospect.prospectContactEmail) {
    return { ok: false, reason: "no_contact_email" };
  }

  // Asset selection.
  let resolvedAssetUrl = assetUrl ?? null;
  let resolvedAssetTitle = assetTitle ?? null;
  let rationale = pitchAngle ?? "";
  if (!resolvedAssetUrl) {
    const sel = await selectAsset({
      db,
      prospectId,
      campaignType: campaign.campaignType as
        | "broken_link"
        | "guest_post"
        | "resource_page",
    });
    if (!sel.ok) {
      return {
        ok: false,
        reason: sel.reason ?? "asset_selection_failed",
        rationale: sel.rationale,
      };
    }
    resolvedAssetUrl = sel.assetUrl;
    resolvedAssetTitle = sel.assetTitle;
    rationale = sel.rationale;
  }

  const inserted = await db
    .insert(outreachSequences)
    .values({
      campaignId,
      prospectId,
      status: "active",
      currentStep: 0,
      assetUrl: resolvedAssetUrl,
      assetTitle: resolvedAssetTitle,
      pitchAngle: rationale,
      contextSnapshot: {
        prospectStatusAtDraft: prospect.status,
        prospectDr: prospect.estimatedDr,
        domain: prospect.domain,
      },
    })
    .returning({ id: outreachSequences.id });
  const sequenceId = inserted[0]!.id;

  // Draft step 0 immediately. Steps 1 and 2 are drafted lazily by advance().
  const draft = await draftPitch({
    db,
    anthropic,
    model,
    sequenceId,
    step: 0,
  });
  if (!draft.ok) {
    // Roll back: kill the sequence so we don't strand it.
    await db
      .update(outreachSequences)
      .set({ status: "killed", updatedAt: new Date() })
      .where(eq(outreachSequences.id, sequenceId));
    return { ok: false, reason: draft.reason ?? "draft_failed" };
  }

  return {
    ok: true,
    sequenceId,
    step0MessageId: draft.messageId,
    rationale,
  };
}

void schema;
