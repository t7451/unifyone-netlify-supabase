/**
 * seo.repo.ts — data access for the SEO content job router.
 *
 * Wraps the Drizzle queries against `seoContentJobs`.
 */

import { getDb } from "../../db";
import { seoContentJobs } from "../../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

type PublishedType = "blog_post" | "seo_landing" | "faq_expansion";
type JobStatus =
  | "pending"
  | "generating"
  | "generated"
  | "published"
  | "failed"
  | "rejected";

export async function listPublished(input: {
  type?: PublishedType;
  limit: number;
  offset: number;
}) {
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
}

export async function getPublishedBySlug(input: { slug: string }) {
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
}

export async function listJobs(input: {
  status?: JobStatus;
  type?: PublishedType;
  limit: number;
  offset: number;
}) {
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
}

export async function getJobById(input: { id: number }) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(seoContentJobs)
    .where(eq(seoContentJobs.id, input.id))
    .limit(1);

  return row ?? null;
}

export async function publishJob(input: { id: number }) {
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
}

export async function rejectJob(input: { id: number; reason?: string }) {
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
}

export async function selectAllJobSlugStatuses() {
  const db = await getDb();
  if (!db) return null;
  return db
    .select({ slug: seoContentJobs.slug, status: seoContentJobs.status })
    .from(seoContentJobs);
}

export async function selectAllJobStatuses() {
  const db = await getDb();
  if (!db) return null;
  return db.select({ status: seoContentJobs.status }).from(seoContentJobs);
}
