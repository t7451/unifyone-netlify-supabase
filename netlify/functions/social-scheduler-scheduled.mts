/**
 * social-scheduler-scheduled.mts
 *
 * Netlify Scheduled Function — publishes social posts whose scheduledAt time
 * has arrived. Runs the same publish core as the manual `social.publish`
 * mutation (native dispatch to connected accounts + the social.post.published
 * automation event), so scheduled and manual publishing behave identically.
 *
 * Schedule: every 5 minutes.
 * Timeout:  scheduled-function limit (30s) — keep per-run work bounded.
 */
import type { Config } from "@netlify/functions";
import { processScheduledSocialPosts } from "../../server/lib/socialScheduler";

export default async (req: Request) => {
  const { next_run } = await req
    .json()
    .catch(() => ({ next_run: "unknown" }));
  console.log(
    `[social-scheduler] Starting scheduled publish run. Next run: ${next_run}`
  );

  try {
    const result = await processScheduledSocialPosts();
    console.log(
      `[social-scheduler] Complete — processed: ${result.processed}, published: ${result.published}`
    );
  } catch (err) {
    console.error("[social-scheduler] Fatal error:", err);
  }
};

export const config: Config = {
  schedule: "*/5 * * * *", // every 5 minutes
};
