/**
 * server/routers/clippers.ts
 *
 * tRPC router for the AI video clipping feature.
 *
 * Procedures:
 *   createJob   — create a job and kick off async engine processing
 *   getJob      — poll a job's status and progress
 *   listJobs    — list the current user's clipping jobs
 *   listClips   — list generated clips for a completed job
 *   testJob     — admin: create + process a job synchronously (end-to-end test)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createClippingJob,
  getClippingJobById,
  listClippingJobsForUser,
  listClipsForJob,
  incrementClippingUsage,
} from "../db";
import { processClippingJob } from "../lib/clipperWorker";

// ── Input schemas ─────────────────────────────────────────────────────────────

const createJobInput = z.object({
  /** Remote video URL (optional; omit to use a synthetic test source). */
  sourceUrl: z.string().url().optional(),
  /** Number of clips to generate (1–20). */
  numClips: z.number().int().min(1).max(20).default(3),
  /** Target clip duration in seconds (15–60). */
  targetDuration: z.number().int().min(15).max(60).default(45),
  /** Output style preset. */
  style: z.string().default("default"),
  /**
   * Clipper engine adapter to use.
   * "basic" runs the real transcription + highlight-scoring pipeline.
   * "stub" produces synthetic clips fast for end-to-end testing without
   * heavy ML deps — pass it explicitly when smoke-testing.
   */
  engine: z.enum(["stub", "basic"]).default("basic"),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const clippersRouter = router({
  /**
   * Create a clipping job and kick off engine processing in the background.
   * Returns immediately with the new job ID and initial status.
   */
  createJob: protectedProcedure
    .input(createJobInput)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
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
    }),

  /**
   * Poll a single job's current status, progress, and stage.
   */
  getJob: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user.tenantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A tenant is required.",
        });
      }
      const job = await getClippingJobById(input.id, ctx.user.tenantId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
      }
      return job;
    }),

  /**
   * List all clipping jobs for the authenticated user (newest first).
   */
  listJobs: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.tenantId) return [];
    return listClippingJobsForUser(ctx.user.id, ctx.user.tenantId);
  }),

  /**
   * List generated clips for a completed job.
   */
  listClips: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user.tenantId) return [];
      return listClipsForJob(input.jobId, ctx.user.tenantId);
    }),

  /**
   * Admin: create a job and process it synchronously, then return the
   * completed job and generated clips.  Use this route for end-to-end
   * smoke-testing the full Layer 1 + Layer 2 pipeline.
   *
   * POST /trpc/clippers.testJob
   */
  testJob: adminProcedure
    .input(
      z.object({
        sourceUrl: z.string().url().optional(),
        numClips: z.number().int().min(1).max(5).default(2),
        engine: z.enum(["stub", "basic"]).default("stub"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fall back to tenant 1 for admin users without a tenant assignment
      const tenantId = ctx.user.tenantId ?? 1;

      const job = await createClippingJob({
        tenantId,
        userId: ctx.user.id,
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
    }),
});
