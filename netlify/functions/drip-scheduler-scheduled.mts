/**
 * drip-scheduler-scheduled.mts
 *
 * Netlify Scheduled Function — runs every hour to process pending drip emails.
 *
 * The drip scheduler checks all email subscribers and sends any drip emails
 * that are due based on elapsed time since subscription (welcome, overview,
 * getting started, success stories, limited offer).
 *
 * Requires RESEND_API_KEY to be configured — skips silently when absent.
 *
 * Schedule: every hour at :00
 * Timeout:  30 seconds (scheduled function limit)
 */
import type { Config } from "@netlify/functions";
import { processPendingDrips } from "../../server/_core/dripScheduler";

export default async (req: Request) => {
  const { next_run } = await req.json().catch(() => ({ next_run: "unknown" }));
  console.log(`[drip-scheduler] Starting hourly drip processing. Next run: ${next_run}`);

  try {
    const result = await processPendingDrips();
    console.log(
      `[drip-scheduler] Complete — processed: ${result.processed}, sent: ${result.sent}, errors: ${result.errors}`
    );
  } catch (err) {
    console.error("[drip-scheduler] Fatal error:", err);
  }
};

export const config: Config = {
  schedule: "0 * * * *", // every hour at :00
};
