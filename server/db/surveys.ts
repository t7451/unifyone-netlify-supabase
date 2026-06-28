import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { surveyResponses } from "../../drizzle/schema";
import { getDb } from "./connection";

// ── WHY: voice-of-customer microsurveys ───────────────────────────────────────

export type SurveyResponseInput = {
  surveyType: "exit_intent" | "post_purchase" | "custom";
  question: string;
  answer?: string | null;
  rating?: number | null;
  anonymousId?: string | null;
  userId?: number | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
};

/** Record a single microsurvey response. No-ops when the DB is unavailable. */
export async function insertSurveyResponse(
  tenantId: number,
  input: SurveyResponseInput
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(surveyResponses).values({
    tenantId,
    surveyType: input.surveyType,
    question: input.question,
    answer: input.answer ?? undefined,
    rating: input.rating ?? undefined,
    anonymousId: input.anonymousId ?? undefined,
    userId: input.userId ?? undefined,
    path: input.path ?? undefined,
    metadata: input.metadata,
  });
}

/**
 * Aggregated survey results for the dashboard: response counts per survey type,
 * the most common answers, and recent verbatim responses.
 */
export async function getSurveyResults(
  tenantId: number,
  days = 30,
  limit = 20
) {
  const db = await getDb();
  const empty = {
    total: 0,
    byType: [] as Array<{ surveyType: string; responses: number }>,
    topAnswers: [] as Array<{
      surveyType: string;
      answer: string;
      count: number;
    }>,
    recent: [] as Array<{
      id: number;
      surveyType: string;
      question: string;
      answer: string | null;
      rating: number | null;
      createdAt: Date;
    }>,
  };
  if (!db) return empty;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [byType, topAnswers, recent] = await Promise.all([
    db
      .select({
        surveyType: surveyResponses.surveyType,
        responses: count(),
      })
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.tenantId, tenantId),
          gte(surveyResponses.createdAt, since)
        )
      )
      .groupBy(surveyResponses.surveyType),
    db
      .select({
        surveyType: surveyResponses.surveyType,
        answer: surveyResponses.answer,
        count: count(),
      })
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.tenantId, tenantId),
          gte(surveyResponses.createdAt, since),
          sql`coalesce(${surveyResponses.answer}, '') <> ''`
        )
      )
      .groupBy(surveyResponses.surveyType, surveyResponses.answer)
      .orderBy(desc(count()))
      .limit(limit),
    db
      .select({
        id: surveyResponses.id,
        surveyType: surveyResponses.surveyType,
        question: surveyResponses.question,
        answer: surveyResponses.answer,
        rating: surveyResponses.rating,
        createdAt: surveyResponses.createdAt,
      })
      .from(surveyResponses)
      .where(
        and(
          eq(surveyResponses.tenantId, tenantId),
          gte(surveyResponses.createdAt, since)
        )
      )
      .orderBy(desc(surveyResponses.createdAt))
      .limit(limit),
  ]);

  return {
    total: byType.reduce((s, r) => s + Number(r.responses), 0),
    byType: byType.map(r => ({
      surveyType: r.surveyType,
      responses: Number(r.responses),
    })),
    topAnswers: topAnswers.map(r => ({
      surveyType: r.surveyType,
      answer: r.answer ?? "",
      count: Number(r.count),
    })),
    recent,
  };
}
