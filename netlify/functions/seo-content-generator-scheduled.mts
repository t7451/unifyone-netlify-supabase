/**
 * seo-content-generator-scheduled.mts
 *
 * Netlify Scheduled Function — runs every Monday at 06:00 UTC to generate
 * fresh SEO content using the AI-powered seoContentGenerator service.
 *
 * Each run generates up to 3 new pieces of content (blog posts, SEO landing
 * pages, or FAQ expansions) drawn from the rotating SEO_TOPIC_POOL. Results
 * are stored in the `seo_content_jobs` table with status "generated", ready
 * for admin review and publishing via the SEO router (seo.publishJob).
 *
 * Topics that already have a non-failed/non-rejected entry in the DB are
 * skipped automatically, so the same content is never duplicated.
 *
 * Requires BUILT_IN_FORGE_API_KEY and DATABASE_URL to be configured.
 *
 * Schedule: every Monday at 06:00 UTC
 * Timeout:  30 seconds (scheduled function limit — generation is batched serially)
 */
import type { Config } from "@netlify/functions";
import { runSeoGenerationBatch } from "../../server/seoContentGenerator";

export default async (req: Request) => {
  const { next_run } = await req.json().catch(() => ({ next_run: "unknown" }));
  const runId = new Date().toISOString();

  console.log(
    `[seo-content-generator] Starting weekly SEO content generation run. RunId: ${runId}. Next run: ${next_run}`
  );

  try {
    const result = await runSeoGenerationBatch(3, runId);

    console.log(
      `[seo-content-generator] Complete — attempted: ${result.attempted}, generated: ${result.generated}, failed: ${result.failed}, skipped: ${result.skipped}`
    );

    if (result.errors.length > 0) {
      console.warn("[seo-content-generator] Errors:", result.errors.join(" | "));
    }
  } catch (err) {
    console.error("[seo-content-generator] Fatal error:", err);
  }
};

export const config: Config = {
  schedule: "0 6 * * 1", // Every Monday at 06:00 UTC
};
