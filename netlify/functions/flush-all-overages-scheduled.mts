/**
 * flush-all-overages-scheduled.mts
 *
 * Scheduled Function — runs daily at 02:00 UTC to flush every queued
 * credit overage across all tenants to Stripe as invoice line items.
 *
 * This is the safety-net sweep: catches any overages that were not
 * flushed by the per-user background function (e.g., during outages).
 *
 * Schedule: daily at 02:00 UTC
 * Timeout:  30 seconds (scheduled function limit)
 */
import type { Config } from "@netlify/functions";
import { flushAllOverages } from "../../server/creditMeter";

export default async (req: Request) => {
  const { next_run } = await req.json().catch(() => ({ next_run: "unknown" }));
  console.log(`[flush-all-overages] Starting daily sweep. Next run: ${next_run}`);

  try {
    await flushAllOverages();
    console.log("[flush-all-overages] Sweep complete");
  } catch (err) {
    console.error("[flush-all-overages] Sweep error:", err);
  }
};

export const config: Config = {
  schedule: "0 2 * * *", // 02:00 UTC daily
};
