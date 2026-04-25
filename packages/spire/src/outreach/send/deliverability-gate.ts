import { and, eq, gt, gte, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../schema.js";
import {
  outreachCampaigns,
  outreachMessages,
  outreachProspects,
  outreachSequences,
  outreachSuppression,
  outreachVolumeDaily,
} from "../../schema.js";

type DB = PostgresJsDatabase<typeof schema>;

export interface GateInput {
  db: DB;
  campaignId: string;
  recipientEmail: string;
  recipientDomain: string;
}

export type GateReason =
  | "suppressed_email"
  | "suppressed_domain"
  | "cap_exceeded"
  | "domain_cooldown"
  | "campaign_inactive"
  | "campaign_not_found"
  | "missing_recipient";

export interface GateResult {
  ok: boolean;
  reason?: GateReason;
  /** When `ok=false`, machine-readable detail. */
  detail?: Record<string, unknown>;
}

const COOLDOWN_DAYS = 90;

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkDeliverabilityGate({
  db,
  campaignId,
  recipientEmail,
  recipientDomain,
}: GateInput): Promise<GateResult> {
  if (!recipientEmail || !recipientDomain) {
    return { ok: false, reason: "missing_recipient" };
  }

  const camp = await db
    .select()
    .from(outreachCampaigns)
    .where(eq(outreachCampaigns.id, campaignId))
    .limit(1);
  if (camp.length === 0) return { ok: false, reason: "campaign_not_found" };
  if (!camp[0]!.active) return { ok: false, reason: "campaign_inactive" };

  // Suppression — email-level.
  const supEmail = await db
    .select({ id: outreachSuppression.id })
    .from(outreachSuppression)
    .where(
      and(
        eq(outreachSuppression.email, recipientEmail.toLowerCase()),
        or(
          isNull(outreachSuppression.expiresAt),
          gt(outreachSuppression.expiresAt, new Date())
        )
      )
    )
    .limit(1);
  if (supEmail.length > 0) return { ok: false, reason: "suppressed_email" };

  // Suppression — domain-level.
  const supDomain = await db
    .select({ id: outreachSuppression.id })
    .from(outreachSuppression)
    .where(
      and(
        eq(outreachSuppression.domain, recipientDomain.toLowerCase()),
        or(
          isNull(outreachSuppression.expiresAt),
          gt(outreachSuppression.expiresAt, new Date())
        )
      )
    )
    .limit(1);
  if (supDomain.length > 0) return { ok: false, reason: "suppressed_domain" };

  // Volume cap (per campaign per day).
  const today = todayUtcDateString();
  const volRows = await db
    .select({ sentCount: outreachVolumeDaily.sentCount })
    .from(outreachVolumeDaily)
    .where(
      and(
        eq(outreachVolumeDaily.campaignId, campaignId),
        eq(outreachVolumeDaily.date, today)
      )
    )
    .limit(1);
  const sent = volRows[0]?.sentCount ?? 0;
  if (sent >= camp[0]!.dailySendCap) {
    return {
      ok: false,
      reason: "cap_exceeded",
      detail: { sent, cap: camp[0]!.dailySendCap },
    };
  }

  // 90-day domain cooldown across ALL campaigns.
  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const recent = await db
    .select({ id: outreachMessages.id })
    .from(outreachMessages)
    .innerJoin(
      outreachSequences,
      eq(outreachMessages.sequenceId, outreachSequences.id)
    )
    .innerJoin(
      outreachProspects,
      eq(outreachSequences.prospectId, outreachProspects.id)
    )
    .where(
      and(
        eq(outreachProspects.domain, recipientDomain.toLowerCase()),
        eq(outreachMessages.status, "sent"),
        gte(outreachMessages.sentAt, cutoff)
      )
    )
    .limit(1);
  if (recent.length > 0) return { ok: false, reason: "domain_cooldown" };

  return { ok: true };
}

export async function recordSent(
  db: DB,
  campaignId: string,
  date: string = todayUtcDateString()
): Promise<void> {
  await db
    .insert(outreachVolumeDaily)
    .values({ campaignId, date, sentCount: 1 })
    .onConflictDoUpdate({
      target: [outreachVolumeDaily.campaignId, outreachVolumeDaily.date],
      set: { sentCount: sql`${outreachVolumeDaily.sentCount} + 1` },
    });
}

void schema;
