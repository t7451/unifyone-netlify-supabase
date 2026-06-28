import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../../_core/trpc";
import * as service from "./gamification.service";

export const gamificationRouter = router({
  // ── Achievements ─────────────────────────────────────────────────────────────
  getAchievements: protectedProcedure.query(async ({ ctx }) => {
    return service.getAchievements(ctx.user.id);
  }),

  // ── Challenges ───────────────────────────────────────────────────────────────
  getActiveChallenges: protectedProcedure.query(async ({ ctx }) => {
    return service.getActiveChallenges(ctx.user.id);
  }),

  joinChallenge: protectedProcedure
    .input(z.object({ challengeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.joinChallenge(ctx.user.id, input.challengeId);
    }),

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  getLeaderboard: protectedProcedure
    .input(z.object({ limit: z.number().min(5).max(50).default(10) }))
    .query(async ({ ctx }) => {
      return service.getLeaderboard(ctx.user.id);
    }),

  // ── Points Summary ───────────────────────────────────────────────────────────
  getPointsSummary: protectedProcedure.query(async ({ ctx }) => {
    return service.getPointsSummary(ctx.user.id);
  }),

  // ── Update Challenge Progress ────────────────────────────────────────────────
  /** Increment a user's progress on a challenge they've joined. Auto-resolves friend challenges. */
  updateProgress: protectedProcedure
    .input(
      z.object({
        challengeId: z.number(),
        increment: z.number().min(1).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.updateProgress(
        ctx.user.id,
        input.challengeId,
        input.increment
      );
    }),

  // ── Admin: Resolve All Pending Friend Challenges ───────────────────────────
  /** Admin utility: scan and resolve all accepted friend challenges with undetected completions. */
  checkAllFriendChallenges: adminProcedure.mutation(async ({ ctx: _ctx }) => {
    return service.checkAllFriendChallenges();
  }),

  // ── Admin: Create Challenge ───────────────────────────────────────────────────
  createChallenge: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        type: z.enum(["daily", "weekly", "monthly", "one_time", "community"]),
        category: z.enum(["gig", "finance", "social", "platform"]),
        goal: z.number().min(1),
        unit: z.string().default("count"),
        pointsReward: z.number().min(1),
        bonusReward: z.string().optional(),
        startsAt: z.string(),
        endsAt: z.string(),
        maxParticipants: z.number().optional(),
      })
    )
    .mutation(async ({ ctx: _ctx, input }) => {
      return service.createChallenge(input);
    }),
});
