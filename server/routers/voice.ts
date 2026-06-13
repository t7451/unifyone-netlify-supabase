/**
 * server/routers/voice.ts
 *
 * tRPC router exposing voice transcription (Speech-to-Text) to the frontend.
 *
 * Wraps the `transcribeAudio` helper in `server/_core/voiceTranscription.ts`.
 * Protected (requires auth) and metered against the user's credit balance,
 * consistent with the platform's other AI endpoints.
 *
 * Frontend usage:
 *   const transcribe = trpc.voice.transcribe.useMutation();
 *   transcribe.mutate({ audioUrl, language: "en" });
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { meterCredits } from "../creditMeter";

// Credit cost per transcription call.
const VOICE_TRANSCRIBE_CREDIT_COST = 1;

export const voiceRouter = router({
  /**
   * Transcribe an uploaded audio file (referenced by URL) to text.
   * Metered: 1 credit per call.
   */
  transcribe: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        language: z.string().min(2).max(10).optional(),
        prompt: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Meter the call against the user's credit balance.
      try {
        const metered = await meterCredits({
          userId,
          tenantId: ctx.user.tenantId ?? undefined,
          amount: VOICE_TRANSCRIBE_CREDIT_COST,
          source: "ai_completion",
          action: "voice.transcribe",
        });
        if (!metered.success) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Insufficient credits. Please top up to continue.",
          });
        }
      } catch (e: unknown) {
        if (e instanceof TRPCError) throw e;
        // Don't block transcription on billing-infra failures.
        console.warn(
          "[voice.transcribe] Metering failed (non-blocking):",
          e instanceof Error ? e.message : String(e)
        );
      }

      const result = await transcribeAudio(input);

      if ("error" in result) {
        const code =
          result.code === "FILE_TOO_LARGE" || result.code === "INVALID_FORMAT"
            ? "BAD_REQUEST"
            : "INTERNAL_SERVER_ERROR";
        throw new TRPCError({ code, message: result.error, cause: result });
      }

      return result;
    }),
});
