import { and, desc, eq, gte } from "drizzle-orm";
import { connectNeon, loadEnv, logger, schema } from "@1commerce/spire";

// HARO queue management. The webhook (`webhook-resend-haro.mts`) writes
// new opportunity rows; this CLI surfaces them for Keith's review and
// records send/win/lose decisions. No outbound automation — Keith
// composes from the drafted variations and sends from his own client.

export async function haroQueueCommand(input: {
  siteSlug?: string;
  minScore?: number;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const minScore = input.minScore ?? 70;
    const rows = await db
      .select({
        id: schema.prOpportunities.id,
        outlet: schema.prOpportunities.outlet,
        subject: schema.prOpportunities.querySubject,
        score: schema.prOpportunities.matchScore,
        deadline: schema.prOpportunities.deadline,
        status: schema.prOpportunities.status,
        rationale: schema.prOpportunities.matchRationale,
      })
      .from(schema.prOpportunities)
      .where(
        and(
          eq(schema.prOpportunities.status, "new"),
          gte(schema.prOpportunities.matchScore, minScore)
        )
      )
      .orderBy(desc(schema.prOpportunities.matchScore))
      .limit(30);

    if (rows.length === 0) {
      logger.info(
        { minScore },
        "No HARO opportunities meeting the score threshold in 'new' status"
      );
      return;
    }
    logger.info(
      { count: rows.length, minScore, rows },
      "HARO queue (review-ready)"
    );
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function haroViewCommand(opportunityId: string): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const [row] = await db
      .select()
      .from(schema.prOpportunities)
      .where(eq(schema.prOpportunities.id, opportunityId))
      .limit(1);
    if (!row) throw new Error(`Opportunity ${opportunityId} not found`);

    logger.info(
      {
        id: row.id,
        source: row.source,
        outlet: row.outlet,
        reporter: row.reporterName,
        subject: row.querySubject,
        deadline: row.deadline,
        status: row.status,
        match: {
          score: row.matchScore,
          clusters: row.matchedClusters,
          rationale: row.matchRationale,
        },
      },
      "HARO opportunity"
    );
    logger.info({ body: row.queryBody }, "Query body");
    logger.info(
      { drafted: row.draftedResponses ?? "(no drafts generated)" },
      "Drafted responses"
    );
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function haroMarkCommand(input: {
  opportunityId: string;
  status:
    | "qualified"
    | "ignored"
    | "drafted"
    | "sent"
    | "won"
    | "lost"
    | "expired";
  outcomeUrl?: string;
  outcomeDr?: number;
  usedDraftIndex?: number;
  decidedBy?: string;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const updateSet: Record<string, unknown> = {
      status: input.status,
      decidedAt: new Date(),
      decidedBy: input.decidedBy ?? "keith",
    };
    if (input.outcomeUrl) updateSet.outcomeUrl = input.outcomeUrl;
    if (input.outcomeDr !== undefined) updateSet.outcomeDr = input.outcomeDr;

    // Persist which variation Keith actually sent (informational; we don't
    // generate a stable UUID per draft variation, but the integer index is
    // enough to retrace which angle won).
    if (input.usedDraftIndex !== undefined) {
      const [row] = await db
        .select({ drafts: schema.prOpportunities.draftedResponses })
        .from(schema.prOpportunities)
        .where(eq(schema.prOpportunities.id, input.opportunityId))
        .limit(1);
      const drafts =
        (row?.drafts as unknown as { variations?: unknown[] } | null)
          ?.variations ?? [];
      if (input.usedDraftIndex >= 0 && input.usedDraftIndex < drafts.length) {
        updateSet.draftedResponses = {
          variations: drafts,
          used_index: input.usedDraftIndex,
        };
      }
    }

    const [updated] = await db
      .update(schema.prOpportunities)
      .set(updateSet)
      .where(eq(schema.prOpportunities.id, input.opportunityId))
      .returning({ id: schema.prOpportunities.id });
    if (!updated)
      throw new Error(`Opportunity ${input.opportunityId} not found`);
    logger.info(updateSet, `Opportunity marked ${input.status}`);
  } finally {
    await raw.end({ timeout: 5 });
  }
}
