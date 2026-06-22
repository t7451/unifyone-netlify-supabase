import { z } from "zod";
import { isSurveyType, SURVEY_LIMITS, type SurveyType } from "@shared/surveys";
import {
  protectedProcedure,
  publicRateLimitedProcedure,
  router,
} from "../_core/trpc";
import { publicFormLimiter } from "../_core/rateLimiter";
import { TRPCError } from "@trpc/server";
import { getSurveyResults, insertSurveyResponse } from "../db";
import { resolveAnalyticsTenant } from "../lib/analyticsTenant";
import { logger } from "../_core/logger";

const daysInput = z.number().int().min(1).max(365);

/**
 * Voice-of-customer microsurveys (exit-intent, post-purchase).
 *
 * `submit` is public + rate-limited so anonymous storefront visitors can answer
 * (best-effort, never throws to the UI). `results` is the protected dashboard
 * aggregation. Tenant attribution mirrors tracking.ingest: authenticated users
 * are pinned to their own tenant; only anonymous callers may pass tenantId.
 */
export const surveysRouter = router({
  submit: publicRateLimitedProcedure(publicFormLimiter, "surveys:submit")
    .input(
      z.object({
        tenantId: z.number().int().positive().optional(),
        surveyType: z.string().refine(isSurveyType, "Unknown survey type"),
        question: z.string().min(1).max(SURVEY_LIMITS.question),
        answer: z.string().max(SURVEY_LIMITS.answer).optional(),
        rating: z.number().int().min(1).max(5).optional(),
        anonymousId: z.string().max(64).optional(),
        path: z.string().max(2048).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = resolveAnalyticsTenant({
          user: ctx.user,
          inputTenantId: input.tenantId,
        });
        if (!tenantId) return { ok: true, stored: false };
        // Require at least one of answer / rating so empty dismissals aren't
        // stored as responses.
        if (!input.answer && input.rating == null) {
          return { ok: true, stored: false };
        }

        await insertSurveyResponse(tenantId, {
          // Validated by the isSurveyType refine above.
          surveyType: input.surveyType as SurveyType,
          question: input.question,
          answer: input.answer ?? null,
          rating: input.rating ?? null,
          anonymousId: input.anonymousId ?? null,
          userId: ctx.user?.id ?? null,
          path: input.path ?? null,
        });
        return { ok: true, stored: true };
      } catch (err) {
        logger.error("[surveys.submit] failed to record response", {
          error: err instanceof Error ? err.message : String(err),
        });
        return { ok: false, stored: false };
      }
    }),

  results: protectedProcedure
    .input(z.object({ days: daysInput.default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active tenant.",
        });
      return getSurveyResults(tenantId, input?.days ?? 30);
    }),
});
