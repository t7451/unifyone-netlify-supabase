import { and, desc, eq } from "drizzle-orm";
import {
  InsertClip,
  InsertClippingJob,
  InsertClippingSubscription,
  clippingJobs,
  clippingSubscriptions,
  clips,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ── Clippers ────────────────────────────────────────────────────────────────────
export async function createClippingJob(data: InsertClippingJob) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.insert(clippingJobs).values(data).returning();
  return rows[0];
}

export async function getClippingJobById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(clippingJobs)
    .where(and(eq(clippingJobs.id, id), eq(clippingJobs.tenantId, tenantId)))
    .limit(1);
  return rows[0];
}

export async function listClippingJobsForUser(
  userId: number,
  tenantId: number,
  opts?: { limit?: number; offset?: number }
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(clippingJobs)
    .where(
      and(eq(clippingJobs.userId, userId), eq(clippingJobs.tenantId, tenantId))
    )
    .orderBy(desc(clippingJobs.createdAt))
    .limit(opts?.limit ?? 20)
    .offset(opts?.offset ?? 0);
}

export async function listAllClippingJobs(opts?: {
  tenantId?: number;
  status?: (typeof clippingJobs.$inferSelect)["status"];
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.tenantId !== undefined)
    conditions.push(eq(clippingJobs.tenantId, opts.tenantId));
  if (opts?.status) conditions.push(eq(clippingJobs.status, opts.status));

  return db
    .select()
    .from(clippingJobs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(clippingJobs.createdAt))
    .limit(opts?.limit ?? 100)
    .offset(opts?.offset ?? 0);
}

export async function updateClippingJobStatus(
  id: number,
  tenantId: number,
  data: Partial<InsertClippingJob>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(clippingJobs)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(clippingJobs.id, id), eq(clippingJobs.tenantId, tenantId)));
}

export async function insertClip(data: InsertClip) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db.insert(clips).values(data).returning();
  return rows[0];
}

export async function listClipsForJob(jobId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(clips)
    .where(and(eq(clips.jobId, jobId), eq(clips.tenantId, tenantId)))
    .orderBy(clips.index);
}

export async function getClippingSubscriptionForTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(clippingSubscriptions)
    .where(eq(clippingSubscriptions.tenantId, tenantId))
    .limit(1);
  return rows[0];
}

export async function upsertClippingSubscription(
  data: InsertClippingSubscription
) {
  const db = await getDb();
  if (!db) return;

  await db
    .insert(clippingSubscriptions)
    .values(data)
    .onConflictDoUpdate({
      target: clippingSubscriptions.tenantId,
      set: {
        userId: data.userId,
        plan: data.plan,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripeCustomerId: data.stripeCustomerId,
        stripePriceId: data.stripePriceId,
        status: data.status,
        monthlyJobQuota: data.monthlyJobQuota,
        jobsUsedThisPeriod: data.jobsUsedThisPeriod,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        updatedAt: new Date(),
      },
    });
}

export async function incrementClippingUsage(
  tenantId: number,
  now = new Date()
) {
  const db = await getDb();
  if (!db) return;

  const current = await getClippingSubscriptionForTenant(tenantId);
  if (!current) return;

  const isNewPeriod = current.periodEnd <= now;
  const nextPeriodStart = isNewPeriod
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    : current.periodStart;
  const nextPeriodEnd = isNewPeriod
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    : current.periodEnd;
  const nextUsage = isNewPeriod ? 1 : current.jobsUsedThisPeriod + 1;

  await db
    .update(clippingSubscriptions)
    .set({
      jobsUsedThisPeriod: nextUsage,
      periodStart: nextPeriodStart,
      periodEnd: nextPeriodEnd,
      updatedAt: now,
    })
    .where(eq(clippingSubscriptions.tenantId, tenantId));
}
