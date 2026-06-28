/**
 * seo/index.ts — tRPC router for SEO content job management.
 *
 * Admin procedures:
 *  - listJobs       — paginated list of all SEO content jobs
 *  - getJob         — full job detail including generated content
 *  - publishJob     — approve a generated job (status → published)
 *  - rejectJob      — reject a generated job (status → rejected)
 *  - triggerGeneration — manually kick off a generation batch (admin only)
 *
 * Public procedures:
 *  - listPublished  — paginated list of published blog posts / SEO pages
 *  - getPublished   — get a single published piece by slug (for dynamic rendering)
 *
 * Transport layer: procedures, zod schemas, middleware. Use-cases live in
 * seo.service.ts; data access lives in seo.repo.ts.
 */

import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../../_core/trpc";
import * as service from "./seo.service";

export const seoRouter = router({
  // ── Public ─────────────────────────────────────────────────────────────────

  /** List all published SEO content jobs (for the blog index / sitemaps). */
  listPublished: publicProcedure
    .input(
      z.object({
        type: z.enum(["blog_post", "seo_landing", "faq_expansion"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => service.listPublished(input)),

  /** Get a single published post by slug (used by the dynamic blog reader page). */
  getPublished: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(255) }))
    .query(async ({ input }) => service.getPublishedBySlug(input)),

  // ── Admin ──────────────────────────────────────────────────────────────────

  /** List all SEO content jobs with optional status filter. */
  listJobs: adminProcedure
    .input(
      z.object({
        status: z
          .enum([
            "pending",
            "generating",
            "generated",
            "published",
            "failed",
            "rejected",
          ])
          .optional(),
        type: z.enum(["blog_post", "seo_landing", "faq_expansion"]).optional(),
        limit: z.number().min(1).max(100).default(30),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => service.listJobs(input)),

  /** Get full detail of a single SEO content job. */
  getJob: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => service.getJobById(input)),

  /** Approve and publish a generated SEO content job. */
  publishJob: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => service.publishJob(input)),

  /** Reject (remove from publish queue) a generated SEO content job. */
  rejectJob: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().max(500).optional() }))
    .mutation(async ({ input }) => service.rejectJob(input)),

  /**
   * Admin: manually trigger a generation batch.
   * Useful for testing or kick-starting fresh content outside the cron schedule.
   */
  triggerGeneration: adminProcedure
    .input(
      z.object({
        count: z.number().min(1).max(10).default(3),
      })
    )
    .mutation(async ({ input }) => service.triggerGeneration(input)),

  /** Admin: list all available topics in the topic pool with their current DB status. */
  listTopics: adminProcedure.query(async () => service.listTopics()),

  /** Admin: get summary stats about the SEO content pipeline. */
  getStats: adminProcedure.query(async () => service.getStats()),
});
