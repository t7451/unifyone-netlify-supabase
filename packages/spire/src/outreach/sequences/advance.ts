import { and, eq, lte, or, sql } from "drizzle-orm";
import type Anthropic from "@anthropic-ai/sdk";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../schema.js";
import {
  outreachCampaigns,
  outreachMessages,
  outreachProspects,
  outreachSequences,
} from "../../schema.js";
import { checkDeliverabilityGate } from "../send/deliverability-gate.js";
import { draftPitch } from "../pitch/draft.js";

type DB = PostgresJsDatabase<typeof schema>;

export interface AdvanceInput {
  db: DB;
  anthropic: Anthropic;
  model: string;
  /** How many to consider this tick. */
  limit?: number;
}

export interface AdvanceResult {
  scanned: number;
  promoted: number;
  drafted: number;
  blocked: { byReason: Record<string, number> };
}

// Promote scheduled messages whose time has come into ready_to_send. Draft
// step 1 / step 2 lazily when the matching sequence advances.
export async function advanceSequences({
  db,
  anthropic,
  model,
  limit = 50,
}: AdvanceInput): Promise<AdvanceResult> {
  const dueMessages = await db
    .select({
      messageId: outreachMessages.id,
      step: outreachMessages.step,
      status: outreachMessages.status,
      sequenceId: outreachMessages.sequenceId,
      campaignId: outreachSequences.campaignId,
      prospectId: outreachSequences.prospectId,
      seqStatus: outreachSequences.status,
    })
    .from(outreachMessages)
    .innerJoin(
      outreachSequences,
      eq(outreachMessages.sequenceId, outreachSequences.id)
    )
    .where(
      and(
        or(
          eq(outreachMessages.status, "scheduled"),
          eq(outreachMessages.status, "pending_approval")
        ),
        lte(outreachMessages.scheduledFor, new Date()),
        eq(outreachSequences.status, "active")
      )
    )
    .limit(limit);

  let promoted = 0;
  let drafted = 0;
  const byReason: Record<string, number> = {};
  const bump = (k: string) => {
    byReason[k] = (byReason[k] ?? 0) + 1;
  };

  for (const m of dueMessages) {
    // Pending-approval (autopilot off) can't be auto-promoted — leave alone.
    if (m.status === "pending_approval") {
      bump("awaiting_approval");
      continue;
    }

    // Look up campaign + prospect for the gate.
    const camp = await db
      .select()
      .from(outreachCampaigns)
      .where(eq(outreachCampaigns.id, m.campaignId))
      .limit(1);
    const prospect = await db
      .select()
      .from(outreachProspects)
      .where(eq(outreachProspects.id, m.prospectId))
      .limit(1);
    if (camp.length === 0 || prospect.length === 0) {
      bump("missing_context");
      continue;
    }
    const gate = await checkDeliverabilityGate({
      db,
      campaignId: m.campaignId,
      recipientEmail: prospect[0]!.prospectContactEmail ?? "",
      recipientDomain: prospect[0]!.domain,
    });
    if (!gate.ok) {
      bump(gate.reason ?? "gate_blocked");
      continue;
    }

    await db
      .update(outreachMessages)
      .set({ status: "ready_to_send" })
      .where(eq(outreachMessages.id, m.messageId));
    promoted += 1;
  }

  // Lazy-draft step 1 / step 2 for sequences whose previous step has been
  // sent but whose next step has no row yet.
  const sentSteps = await db
    .select({
      sequenceId: outreachMessages.sequenceId,
      step: outreachMessages.step,
      sentAt: outreachMessages.sentAt,
      seqStatus: outreachSequences.status,
      subject: outreachMessages.subject,
    })
    .from(outreachMessages)
    .innerJoin(
      outreachSequences,
      eq(outreachMessages.sequenceId, outreachSequences.id)
    )
    .where(
      and(
        eq(outreachMessages.status, "sent"),
        eq(outreachSequences.status, "active")
      )
    );

  for (const s of sentSteps) {
    if (s.step >= 2) continue;
    const nextStep = s.step + 1;
    const existing = await db
      .select()
      .from(outreachMessages)
      .where(
        and(
          eq(outreachMessages.sequenceId, s.sequenceId),
          eq(outreachMessages.step, nextStep)
        )
      )
      .limit(1);
    if (existing.length > 0) continue;

    const breakup =
      nextStep === 2
        ? {
            originalSubject: s.subject,
            oneLineAsk:
              "the original ask still stands; closing the loop today.",
          }
        : undefined;

    const result = await draftPitch({
      db,
      anthropic,
      model,
      sequenceId: s.sequenceId,
      step: nextStep,
      breakupContext: breakup,
    });
    if (result.ok) drafted += 1;
    else bump(`draft_failed_step_${nextStep}_${result.reason ?? "unknown"}`);
  }

  return {
    scanned: dueMessages.length,
    promoted,
    drafted,
    blocked: { byReason },
  };
}

void sql;
void schema;
