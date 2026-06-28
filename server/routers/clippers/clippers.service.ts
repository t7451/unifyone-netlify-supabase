import { TRPCError } from "@trpc/server";
import {
  createClippingJob,
  getClippingJobById,
  listClippingJobsForUser,
  listClipsForJob,
  incrementClippingUsage,
} from "./clippers.repo";
import { processClippingJob } from "../../lib/clipperWorker";

/**
 * Use-case layer for the AI video clipping feature. Holds the job
 * creation/processing orchestration; transport (zod, procedures) stays in
 * index.ts and data access in clippers.repo.ts. Side-effect order (create →
 * fire-and-forget process → increment usage) is identical to the original.
 */

interface CallerUser {
  id: number;
  tenantId: number | null;
}

interface CreateJobArgs {
  sourceUrl?: string;
  numClips: number;
  targetDuration: number;
  style: string;
  engine: "stub" | "basic";
}

export async function createJob(user: CallerUser, input: CreateJobArgs) {
  if (!user.tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A tenant is required to create clipping jobs.",
    });
  }

  const job = await createClippingJob({
    tenantId: user.tenantId,
    userId: user.id,
    sourceUrl: input.sourceUrl ?? null,
    sourceType: input.sourceUrl ? "url" : "upload",
    requestedClipCount: input.numClips,
    options: {
      captionStyle: "default",
      language: "en",
    },
  });

  // Fire-and-forget: process asynchronously so the mutation returns fast.
  // Any error is persisted in the job's errorMessage column.
  processClippingJob(job.id, user.tenantId, {
    videoUrl: input.sourceUrl,
    numClips: input.numClips,
    targetDuration: input.targetDuration,
    style: input.style,
    engine: input.engine,
  }).catch(() => {
    // Error already stored in DB by processClippingJob
  });

  await incrementClippingUsage(user.tenantId).catch((err: unknown) => {
    console.warn(
      `[clippers] incrementClippingUsage failed for tenant ${user.tenantId}: ` +
        `${err instanceof Error ? err.message : String(err)}`
    );
  });

  return { jobId: job.id, status: job.status } as const;
}

export async function getJob(user: CallerUser, id: number) {
  if (!user.tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A tenant is required.",
    });
  }
  const job = await getClippingJobById(id, user.tenantId);
  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
  }
  return job;
}

export async function listJobs(user: CallerUser) {
  if (!user.tenantId) return [];
  return listClippingJobsForUser(user.id, user.tenantId);
}

export async function listClips(user: CallerUser, jobId: number) {
  if (!user.tenantId) return [];
  return listClipsForJob(jobId, user.tenantId);
}

interface TestJobArgs {
  sourceUrl?: string;
  numClips: number;
  engine: "stub" | "basic";
}

export async function testJob(user: CallerUser, input: TestJobArgs) {
  // Fall back to tenant 1 for admin users without a tenant assignment
  const tenantId = user.tenantId ?? 1;

  const job = await createClippingJob({
    tenantId,
    userId: user.id,
    sourceUrl: input.sourceUrl ?? null,
    sourceType: input.sourceUrl ? "url" : "upload",
    requestedClipCount: input.numClips,
    options: {},
  });

  // Process synchronously so the caller gets the full result
  await processClippingJob(job.id, tenantId, {
    videoUrl: input.sourceUrl,
    numClips: input.numClips,
    engine: input.engine,
  });

  const [updatedJob, clips] = await Promise.all([
    getClippingJobById(job.id, tenantId),
    listClipsForJob(job.id, tenantId),
  ]);

  return {
    job: updatedJob,
    clipCount: clips.length,
    clips,
  } as const;
}
