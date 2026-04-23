/**
 * seo.ts — tRPC router for SEO content job management.
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
 */

import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { seoContentJobs } from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  runSeoGenerationBatch,
  SEO_TOPIC_POOL,
  type SeoTopic,
} from "../seoContentGenerator";

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
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { posts: [], total: 0 };

      const conditions = [eq(seoContentJobs.status, "published")];
      if (input.type) conditions.push(eq(seoContentJobs.type, input.type));

      const rows = await db
        .select({
          id: seoContentJobs.id,
          slug: seoContentJobs.slug,
          type: seoContentJobs.type,
          title: seoContentJobs.title,
          h1: seoContentJobs.h1,
          tagline: seoContentJobs.tagline,
          description: seoContentJobs.description,
          keywords: seoContentJobs.keywords,
          publishedAt: seoContentJobs.publishedAt,
          createdAt: seoContentJobs.createdAt,
        })
        .from(seoContentJobs)
        .where(and(...conditions))
        .orderBy(desc(seoContentJobs.publishedAt))
        .limit(input.limit)
        .offset(input.offset);

      return { posts: rows };
    }),

  /** Get a single published post by slug (used by the dynamic blog reader page). */
  getPublished: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(255) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [row] = await db
        .select()
        .from(seoContentJobs)
        .where(
          and(
            eq(seoContentJobs.slug, input.slug),
            inArray(seoContentJobs.status, ["published"])
          )
        )
        .limit(1);

      return row ?? null;
    }),

  // ── Admin ──────────────────────────────────────────────────────────────────

  /** List all SEO content jobs with optional status filter. */
  listJobs: adminProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "generating", "generated", "published", "failed", "rejected"])
          .optional(),
        type: z.enum(["blog_post", "seo_landing", "faq_expansion"]).optional(),
        limit: z.number().min(1).max(100).default(30),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { jobs: [] };

      const conditions = [];
      if (input.status) conditions.push(eq(seoContentJobs.status, input.status));
      if (input.type) conditions.push(eq(seoContentJobs.type, input.type));

      const rows = await db
        .select()
        .from(seoContentJobs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(seoContentJobs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { jobs: rows };
    }),

  /** Get full detail of a single SEO content job. */
  getJob: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [row] = await db
        .select()
        .from(seoContentJobs)
        .where(eq(seoContentJobs.id, input.id))
        .limit(1);

      return row ?? null;
    }),

  /** Approve and publish a generated SEO content job. */
  publishJob: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [updated] = await db
        .update(seoContentJobs)
        .set({
          status: "published",
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(seoContentJobs.id, input.id),
            inArray(seoContentJobs.status, ["generated", "rejected"])
          )
        )
        .returning({ id: seoContentJobs.id, slug: seoContentJobs.slug });

      if (!updated) throw new Error("Job not found or not in a publishable state");
      return { success: true, slug: updated.slug };
    }),

  /** Reject (remove from publish queue) a generated SEO content job. */
  rejectJob: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().max(500).optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [updated] = await db
        .update(seoContentJobs)
        .set({
          status: "rejected",
          errorMessage: input.reason ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(seoContentJobs.id, input.id),
            inArray(seoContentJobs.status, ["generated", "published"])
          )
        )
        .returning({ id: seoContentJobs.id });

      if (!updated) throw new Error("Job not found or not in a rejectable state");
      return { success: true };
    }),

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
    .mutation(async ({ input }) => {
      const runId = `manual-${new Date().toISOString()}`;
      const result = await runSeoGenerationBatch(input.count, runId);
      return result;
    }),

  /** Admin: list all available topics in the topic pool with their current DB status. */
  listTopics: adminProcedure.query(async () => {
    const db = await getDb();

    const statusMap = new Map<string, string>();
    if (db) {
      const existing = await db
        .select({ slug: seoContentJobs.slug, status: seoContentJobs.status })
        .from(seoContentJobs);
      for (const row of existing) statusMap.set(row.slug, row.status);
    }

    return SEO_TOPIC_POOL.map((t: SeoTopic) => ({
      ...t,
      dbStatus: statusMap.get(t.slug) ?? "not_created",
    }));
  }),

  /** Admin: get summary stats about the SEO content pipeline. */
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, pending: 0, generating: 0, generated: 0, published: 0, failed: 0, rejected: 0 };

    const rows = await db.select({ status: seoContentJobs.status }).from(seoContentJobs);

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
  }),
});
