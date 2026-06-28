/**
 * server/routers/voice/index.ts
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
 *
 * Transport only: the procedure + zod schema live here; the metering and STT
 * dispatch live in voice.service.ts.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { transcribe } from "./voice.service";

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
      return transcribe(ctx.user, input);
    }),
});
