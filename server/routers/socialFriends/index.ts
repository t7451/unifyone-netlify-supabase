import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../../_core/trpc";
import * as service from "./socialFriends.service";

export const socialFriendsRouter = router({
  // ── User Search ─────────────────────────────────────────────────────────────
  /** Search for users by name or email to add as friends */
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      return service.searchUsers(ctx.user, input.query);
    }),

  // ── Send Friend Request ──────────────────────────────────────────────────────
  sendRequest: protectedProcedure
    .input(z.object({ addresseeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.sendRequest(ctx.user, input.addresseeId);
    }),

  // ── Accept Friend Request ────────────────────────────────────────────────────
  acceptRequest: protectedProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.acceptRequest(ctx.user, input.friendshipId);
    }),

  // ── Decline Friend Request ───────────────────────────────────────────────────
  declineRequest: protectedProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.declineRequest(ctx.user, input.friendshipId);
    }),

  // ── Remove Friend ────────────────────────────────────────────────────────────
  removeFriend: protectedProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return service.removeFriend(ctx.user, input.friendshipId);
    }),

  // ── List Friends ─────────────────────────────────────────────────────────────
  listFriends: protectedProcedure.query(async ({ ctx }) => {
    return service.listFriends(ctx.user);
  }),

  // ── List Pending Requests ────────────────────────────────────────────────────
  listPendingRequests: protectedProcedure.query(async ({ ctx }) => {
    return service.listPendingRequests(ctx.user);
  }),

  // ── Friend Achievement Feed ──────────────────────────────────────────────────
  /** Returns the 50 most recent achievement unlocks from all friends */
  getFriendAchievementFeed: protectedProcedure.query(async ({ ctx }) => {
    return service.getFriendAchievementFeed(ctx.user);
  }),

  // ── Get Friend Stats ─────────────────────────────────────────────────────────
  getFriendStats: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ ctx, input }) => {
      return service.getFriendStats(ctx.user, input.friendId);
    }),

  // ── Challenge a Friend ───────────────────────────────────────────────────────
  challengeFriend: protectedProcedure
    .input(
      z.object({
        friendId: z.number(),
        challengeId: z.number(),
        message: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.challengeFriend(ctx.user, input);
    }),

  // ── Respond to Friend Challenge ──────────────────────────────────────────────
  respondToChallenge: protectedProcedure
    .input(
      z.object({
        friendChallengeId: z.number(),
        action: z.enum(["accept", "decline"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return service.respondToChallenge(ctx.user, input);
    }),

  // ── List Friend Challenges ───────────────────────────────────────────────────
  listFriendChallenges: protectedProcedure.query(async ({ ctx }) => {
    return service.listFriendChallenges(ctx.user);
  }),

  // ── Get Resolved Challenge Results ───────────────────────────────────────────────────
  /** Returns completed friend challenges with winner info for the current user. */
  getChallengeResults: protectedProcedure.query(async ({ ctx }) => {
    return service.getChallengeResults(ctx.user);
  }),

  // ── Admin: check and resolve all pending friend challenges ───────────────────
  /**
   * Scans all accepted (unresolved) friend challenges and resolves any that
   * have detectable completions. Safe to call repeatedly (idempotent).
   */
  checkAllChallenges: adminProcedure.mutation(async () => {
    return service.checkAllChallenges();
  }),
});
