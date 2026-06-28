import { z } from "zod";
import { isSurveyType, SURVEY_LIMITS } from "@shared/surveys";
import {
  protectedProcedure,
  publicRateLimitedProcedure,
  router,
} from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import * as service from "./surveys.service";

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
      return service.submit(ctx.user, input);
    }),

  results: protectedProcedure
    .input(z.object({ days: daysInput.default(30) }).optional())
    .query(async ({ ctx, input }) => {
      return service.results(ctx.user.tenantId, input?.days ?? 30);
    }),
});
