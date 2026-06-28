/**
 * seo.service.ts — use-cases for the SEO content job router.
 *
 * Orchestrates the SEO generation batch and topic/stat aggregation on top of
 * the repo data access.
 */

import {
  runSeoGenerationBatch,
  SEO_TOPIC_POOL,
  type SeoTopic,
} from "../../seoContentGenerator";
import { selectAllJobSlugStatuses, selectAllJobStatuses } from "./seo.repo";

export {
  listPublished,
  getPublishedBySlug,
  listJobs,
  getJobById,
  publishJob,
  rejectJob,
} from "./seo.repo";

/**
 * Admin: manually trigger a generation batch.
 * Useful for testing or kick-starting fresh content outside the cron schedule.
 */
export async function triggerGeneration(input: { count: number }) {
  const runId = `manual-${new Date().toISOString()}`;
  const result = await runSeoGenerationBatch(input.count, runId);
  return result;
}

/** Admin: list all available topics in the topic pool with their current DB status. */
export async function listTopics() {
  const existing = await selectAllJobSlugStatuses();

  const statusMap = new Map<string, string>();
  if (existing) {
    for (const row of existing) statusMap.set(row.slug, row.status);
  }

  return SEO_TOPIC_POOL.map((t: SeoTopic) => ({
    ...t,
    dbStatus: statusMap.get(t.slug) ?? "not_created",
  }));
}

/** Admin: get summary stats about the SEO content pipeline. */
export async function getStats() {
  const rows = await selectAllJobStatuses();
  if (!rows)
    return {
      total: 0,
      pending: 0,
      generating: 0,
      generated: 0,
      published: 0,
      failed: 0,
      rejected: 0,
    };

  const counts = {
    total: rows.length,
    pending: 0,
    generating: 0,
    generated: 0,
    published: 0,
    failed: 0,
    rejected: 0,
  };

  for (const r of rows) {
    if (r.status in counts) (counts as Record<string, number>)[r.status]++;
  }

  return counts;
}
