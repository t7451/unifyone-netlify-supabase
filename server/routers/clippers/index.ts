/**
 * server/routers/clippers/index.ts
 *
 * tRPC router for the AI video clipping feature.
 *
 * Procedures:
 *   createJob   — create a job and kick off async engine processing
 *   getJob      — poll a job's status and progress
 *   listJobs    — list the current user's clipping jobs
 *   listClips   — list generated clips for a completed job
 *   testJob     — admin: create + process a job synchronously (end-to-end test)
 *
 * Transport only: procedures + zod schemas live here; the job orchestration
 * lives in clippers.service.ts and data access in clippers.repo.ts.
 */

import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../../_core/trpc";
import * as service from "./clippers.service";

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
      return service.createJob(ctx.user, input);
    }),

  /**
   * Poll a single job's current status, progress, and stage.
   */
  getJob: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return service.getJob(ctx.user, input.id);
    }),

  /**
   * List all clipping jobs for the authenticated user (newest first).
   */
  listJobs: protectedProcedure.query(async ({ ctx }) => {
    return service.listJobs(ctx.user);
  }),

  /**
   * List generated clips for a completed job.
   */
  listClips: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return service.listClips(ctx.user, input.jobId);
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
      return service.testJob(ctx.user, input);
    }),
});
