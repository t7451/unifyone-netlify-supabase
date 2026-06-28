import { TRPCError } from "@trpc/server";
import { transcribeAudio } from "../../_core/voiceTranscription";
import { meterCredits } from "../../creditMeter";

/**
 * Use-case layer for the voice router. Holds the credit-metering + STT
 * dispatch logic; transport (zod, procedure) stays in index.ts. Behaviour and
 * side-effect order are identical to the original single-file router.
 */

// Credit cost per transcription call.
export const VOICE_TRANSCRIBE_CREDIT_COST = 1;

interface TranscribeArgs {
  audioUrl: string;
  language?: string;
  prompt?: string;
}

export async function transcribe(
  user: { id: number; tenantId: number | null },
  input: TranscribeArgs
) {
  const userId = user.id;

  // Meter the call against the user's credit balance.
  try {
    const metered = await meterCredits({
      userId,
      tenantId: user.tenantId ?? undefined,
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
}
