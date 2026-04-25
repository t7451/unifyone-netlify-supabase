import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../schema.js";
import {
  outreachProspects,
  outreachSequences,
  outreachSuppression,
} from "../../schema.js";

type DB = PostgresJsDatabase<typeof schema>;

// Promotes prospects from status='new' → status='qualified' for a given
// (site, campaignType). The campaign-type compatibility table reflects what
// works in practice — we don't pitch broken-link replacements to directories,
// don't ask blogs for resource-page additions, etc.

export type CampaignType = "broken_link" | "guest_post" | "resource_page";

const COMPAT: Record<CampaignType, string[]> = {
  broken_link: ["resource_page", "editorial", "blog", "unknown"],
  resource_page: ["resource_page", "directory"],
  guest_post: ["blog", "editorial"],
};

export interface QualifyInput {
  db: DB;
  siteId: string;
  campaignType: CampaignType;
  limit?: number;
}

void schema;

export interface QualifyResult {
  qualified: number;
  disqualified: { byReason: Record<string, number> };
  scanned: number;
}

export async function qualifyProspects({
  db,
  siteId,
  campaignType,
  limit = 50,
}: QualifyInput): Promise<QualifyResult> {
  const compatTypes = COMPAT[campaignType];
  const rows = await db
    .select()
    .from(outreachProspects)
    .where(
      and(
        eq(outreachProspects.siteId, siteId),
        eq(outreachProspects.status, "new")
      )
    )
    .limit(limit);

  let qualified = 0;
  const byReason: Record<string, number> = {};
  const bump = (k: string) => {
    byReason[k] = (byReason[k] ?? 0) + 1;
  };

  for (const p of rows) {
    // Suppression check (email or domain).
    const supRows = await db
      .select({ id: outreachSuppression.id })
      .from(outreachSuppression)
      .where(
        sql`(${outreachSuppression.email} = ${p.prospectContactEmail ?? ""}
             or ${outreachSuppression.domain} = ${p.domain})
            and (${outreachSuppression.expiresAt} is null
                 or ${outreachSuppression.expiresAt} > now())`
      )
      .limit(1);
    if (supRows.length > 0) {
      bump("suppressed");
      continue;
    }

    if (p.estimatedDr !== null && p.estimatedDr < 20) {
      bump("dr_too_low");
      continue;
    }
    if (p.estimatedDr !== null && p.estimatedDr > 90) {
      bump("dr_too_high_warm_intro_only");
      continue;
    }

    const ptype = p.prospectType ?? "unknown";
    if (!compatTypes.includes(ptype)) {
      bump(`type_mismatch_${ptype}`);
      continue;
    }

    // Already-active sequence?
    const existing = await db
      .select({ id: outreachSequences.id })
      .from(outreachSequences)
      .where(
        and(
          eq(outreachSequences.prospectId, p.id),
          sql`${outreachSequences.status} not in ('killed', 'completed')`
        )
      )
      .limit(1);
    if (existing.length > 0) {
      bump("active_sequence_exists");
      continue;
    }

    await db
      .update(outreachProspects)
      .set({ status: "qualified", updatedAt: new Date() })
      .where(eq(outreachProspects.id, p.id));
    qualified += 1;
  }

  return { qualified, disqualified: { byReason }, scanned: rows.length };
}
