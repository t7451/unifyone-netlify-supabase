import { type SurveyType } from "@shared/surveys";
import { TRPCError } from "@trpc/server";
import { resolveAnalyticsTenant } from "../../lib/analyticsTenant";
import { logger } from "../../_core/logger";
import * as repo from "./surveys.repo";

/**
 * Use-case / business-logic layer for the surveys router. Handles tenant
 * attribution, dismissal filtering, and best-effort recording, preserving the
 * exact behavior and error semantics of the original router.
 */

type SurveyUser = { id: number; tenantId: number | null } | null | undefined;

export async function submit(
  user: SurveyUser,
  input: {
    tenantId?: number;
    surveyType: string;
    question: string;
    answer?: string;
    rating?: number;
    anonymousId?: string;
    path?: string;
  }
): Promise<{ ok: boolean; stored: boolean }> {
  try {
    const tenantId = resolveAnalyticsTenant({
      user,
      inputTenantId: input.tenantId,
    });
    if (!tenantId) return { ok: true, stored: false };
    // Require at least one of answer / rating so empty dismissals aren't
    // stored as responses.
    if (!input.answer && input.rating == null) {
      return { ok: true, stored: false };
    }

    await repo.insertResponse(tenantId, {
      // Validated by the isSurveyType refine above.
      surveyType: input.surveyType as SurveyType,
      question: input.question,
      answer: input.answer ?? null,
      rating: input.rating ?? null,
      anonymousId: input.anonymousId ?? null,
      userId: user?.id ?? null,
      path: input.path ?? null,
    });
    return { ok: true, stored: true };
  } catch (err) {
    logger.error("[surveys.submit] failed to record response", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, stored: false };
  }
}

export async function results(
  tenantId: number | null | undefined,
  days: number
) {
  if (!tenantId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active tenant.",
    });
  return repo.getResults(tenantId, days);
}
