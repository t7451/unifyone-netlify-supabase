import { eq } from "drizzle-orm";
import { connectNeon, loadEnv, logger, schema } from "@1commerce/spire";

// `spire submit complete <submission-id> --live-url <url>` — used for
// tier-1 manual entries (GBP, Bing, Apple) where Keith completes the work
// in the directory's own UI and then records the result. Moves the row
// from `rejected` (manual tier-1 default) → `sent` with the captured URL.

export async function completeSubmissionCommand(input: {
  submissionId: string;
  liveUrl: string | null;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const [row] = await db
      .update(schema.submissions)
      .set({
        status: "sent",
        sentAt: new Date(),
        liveUrl: input.liveUrl,
        error: null,
        response: {
          method: "manual_completion",
          completed_at: new Date().toISOString(),
        },
      })
      .where(eq(schema.submissions.id, input.submissionId))
      .returning({
        id: schema.submissions.id,
        siteId: schema.submissions.siteId,
      });
    if (!row) throw new Error(`Submission ${input.submissionId} not found`);
    logger.info(
      { submissionId: row.id, liveUrl: input.liveUrl },
      "Submission marked as sent (manual completion)"
    );
  } finally {
    await raw.end({ timeout: 5 });
  }
}
