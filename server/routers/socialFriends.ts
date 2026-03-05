import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  friendships,
  friendChallenges,
  users,
  userAchievements,
  achievements,
  challenges,
  userPoints,
  notifications,
} from "../../drizzle/schema";
import { eq, and, or, desc, ne, like, sql } from "drizzle-orm";

// ── Helper: create an in-app notification for a user ─────────────────────────
async function createNotification(
  db: Awaited<ReturnType<typeof getDb>>,
  opts: {
    userId: number;
    type: string;
    title: string;
    body?: string;
    link?: string;
  }
) {
  if (!db) return;
  await db.insert(notifications).values({
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    link: opts.link,
    read: false,
  });
}

export const socialFriendsRouter = router({
  // ── User Search ─────────────────────────────────────────────────────────────
  /** Search for users by name or email to add as friends */
  searchUsers: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const term = `%${input.query}%`;
      const results = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(
          and(
            ne(users.id, ctx.user.id),
            or(like(users.name, term), like(users.email, term))
          )
        )
        .limit(20);

      // For each result, determine friendship status with the current user
      const enriched = await Promise.all(
        results.map(async (u) => {
          const existing = await db
            .select()
            .from(friendships)
            .where(
              or(
                and(eq(friendships.requesterId, ctx.user.id), eq(friendships.addresseeId, u.id)),
                and(eq(friendships.requesterId, u.id), eq(friendships.addresseeId, ctx.user.id))
              )
            )
            .limit(1);
          const friendship = existing[0] ?? null;
          return {
            ...u,
            friendshipStatus: friendship?.status ?? null,
            friendshipId: friendship?.id ?? null,
            isRequester: friendship?.requesterId === ctx.user.id,
          };
        })
      );
      return enriched;
    }),

  // ── Send Friend Request ──────────────────────────────────────────────────────
  sendRequest: protectedProcedure
    .input(z.object({ addresseeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (input.addresseeId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot friend yourself" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Check for existing friendship
      const existing = await db
        .select()
        .from(friendships)
        .where(
          or(
            and(eq(friendships.requesterId, ctx.user.id), eq(friendships.addresseeId, input.addresseeId)),
            and(eq(friendships.requesterId, input.addresseeId), eq(friendships.addresseeId, ctx.user.id))
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const f = existing[0];
        if (f.status === "accepted") throw new TRPCError({ code: "CONFLICT", message: "Already friends" });
        if (f.status === "pending") throw new TRPCError({ code: "CONFLICT", message: "Request already sent" });
        if (f.status === "blocked") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot send request" });
        // Declined — allow re-request by updating
        await db.update(friendships).set({ status: "pending", requesterId: ctx.user.id, addresseeId: input.addresseeId, updatedAt: new Date() }).where(eq(friendships.id, f.id));
        return { success: true };
      }

      await db.insert(friendships).values({
        requesterId: ctx.user.id,
        addresseeId: input.addresseeId,
        status: "pending",
      });

      // Notify the addressee
      const senderName = ctx.user.name ?? "Someone";
      await createNotification(db, {
        userId: input.addresseeId,
        type: "social",
        title: "New Friend Request",
        body: `${senderName} sent you a friend request`,
        link: "/friends",
      });

      return { success: true };
    }),

  // ── Accept Friend Request ────────────────────────────────────────────────────
  acceptRequest: protectedProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [friendship] = await db
        .select()
        .from(friendships)
        .where(and(eq(friendships.id, input.friendshipId), eq(friendships.addresseeId, ctx.user.id)))
        .limit(1);

      if (!friendship) throw new TRPCError({ code: "NOT_FOUND", message: "Friend request not found" });
      if (friendship.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Request is not pending" });

      await db.update(friendships).set({ status: "accepted", updatedAt: new Date() }).where(eq(friendships.id, input.friendshipId));

      // Notify the requester
      const acceptorName = ctx.user.name ?? "Someone";
      await createNotification(db, {
        userId: friendship.requesterId,
        type: "social",
        title: "Friend Request Accepted",
        body: `${acceptorName} accepted your friend request`,
        link: "/friends",
      });

      return { success: true };
    }),

  // ── Decline Friend Request ───────────────────────────────────────────────────
  declineRequest: protectedProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [friendship] = await db
        .select()
        .from(friendships)
        .where(and(eq(friendships.id, input.friendshipId), eq(friendships.addresseeId, ctx.user.id)))
        .limit(1);

      if (!friendship) throw new TRPCError({ code: "NOT_FOUND", message: "Friend request not found" });

      await db.update(friendships).set({ status: "declined", updatedAt: new Date() }).where(eq(friendships.id, input.friendshipId));
      return { success: true };
    }),

  // ── Remove Friend ────────────────────────────────────────────────────────────
  removeFriend: protectedProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [friendship] = await db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.id, input.friendshipId),
            or(eq(friendships.requesterId, ctx.user.id), eq(friendships.addresseeId, ctx.user.id))
          )
        )
        .limit(1);

      if (!friendship) throw new TRPCError({ code: "NOT_FOUND", message: "Friendship not found" });

      await db.delete(friendships).where(eq(friendships.id, input.friendshipId));
      return { success: true };
    }),

  // ── List Friends ─────────────────────────────────────────────────────────────
  listFriends: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const accepted = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(eq(friendships.requesterId, ctx.user.id), eq(friendships.addresseeId, ctx.user.id)),
          eq(friendships.status, "accepted")
        )
      )
      .orderBy(desc(friendships.updatedAt));

    // Resolve friend user details
    const friends = await Promise.all(
      accepted.map(async (f) => {
        const friendId = f.requesterId === ctx.user.id ? f.addresseeId : f.requesterId;
        const [friendUser] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, friendId)).limit(1);
        const [pts] = await db.select({ totalPoints: userPoints.totalPoints, level: userPoints.level }).from(userPoints).where(eq(userPoints.userId, friendId)).limit(1);
        const unlockedCount = await db.select({ count: sql<number>`count(*)` }).from(userAchievements).where(eq(userAchievements.userId, friendId));
        return {
          friendshipId: f.id,
          friendId,
          name: friendUser?.name ?? "Unknown",
          email: friendUser?.email ?? "",
          totalPoints: pts?.totalPoints ?? 0,
          level: pts?.level ?? 1,
          achievementsUnlocked: Number(unlockedCount[0]?.count ?? 0),
          friendsSince: f.updatedAt,
        };
      })
    );
    return friends;
  }),

  // ── List Pending Requests ────────────────────────────────────────────────────
  listPendingRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { incoming: [], outgoing: [] };

    const incoming = await db
      .select()
      .from(friendships)
      .where(and(eq(friendships.addresseeId, ctx.user.id), eq(friendships.status, "pending")))
      .orderBy(desc(friendships.createdAt));

    const outgoing = await db
      .select()
      .from(friendships)
      .where(and(eq(friendships.requesterId, ctx.user.id), eq(friendships.status, "pending")))
      .orderBy(desc(friendships.createdAt));

    const enrichIncoming = await Promise.all(
      incoming.map(async (f) => {
        const [u] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, f.requesterId)).limit(1);
        return { friendshipId: f.id, userId: f.requesterId, name: u?.name ?? "Unknown", email: u?.email ?? "", sentAt: f.createdAt };
      })
    );
    const enrichOutgoing = await Promise.all(
      outgoing.map(async (f) => {
        const [u] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, f.addresseeId)).limit(1);
        return { friendshipId: f.id, userId: f.addresseeId, name: u?.name ?? "Unknown", email: u?.email ?? "", sentAt: f.createdAt };
      })
    );

    return { incoming: enrichIncoming, outgoing: enrichOutgoing };
  }),

  // ── Friend Achievement Feed ──────────────────────────────────────────────────
  /** Returns the 50 most recent achievement unlocks from all friends */
  getFriendAchievementFeed: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    // Get accepted friend IDs
    const accepted = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(eq(friendships.requesterId, ctx.user.id), eq(friendships.addresseeId, ctx.user.id)),
          eq(friendships.status, "accepted")
        )
      );

    if (accepted.length === 0) return [];

    const friendIds = accepted.map((f) => (f.requesterId === ctx.user.id ? f.addresseeId : f.requesterId));

    // Fetch recent unlocks for all friends
    const feed: Array<{
      userId: number;
      userName: string;
      achievementId: number;
      achievementName: string;
      achievementIcon: string;
      rarity: string;
      pointsReward: number;
      unlockedAt: Date;
    }> = [];

    for (const friendId of friendIds) {
      const [friendUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, friendId)).limit(1);
      const unlocks = await db
        .select({
          achievementId: userAchievements.achievementId,
          unlockedAt: userAchievements.unlockedAt,
          name: achievements.name,
          icon: achievements.icon,
          rarity: achievements.rarity,
          pointsReward: achievements.pointsReward,
        })
        .from(userAchievements)
        .innerJoin(achievements, eq(achievements.id, userAchievements.achievementId))
        .where(eq(userAchievements.userId, friendId))
        .orderBy(desc(userAchievements.unlockedAt))
        .limit(10);

      for (const u of unlocks) {
        feed.push({
          userId: friendId,
          userName: friendUser?.name ?? "Unknown",
          achievementId: u.achievementId,
          achievementName: u.name,
          achievementIcon: u.icon ?? "Trophy",
          rarity: u.rarity,
          pointsReward: u.pointsReward,
          unlockedAt: u.unlockedAt ?? new Date(),
        });
      }
    }

    // Sort by most recent and cap at 50
    feed.sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime());
    return feed.slice(0, 50);
  }),

  // ── Get Friend Stats ─────────────────────────────────────────────────────────
  getFriendStats: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      // Verify they are actually friends
      const [friendship] = await db
        .select()
        .from(friendships)
        .where(
          and(
            or(
              and(eq(friendships.requesterId, ctx.user.id), eq(friendships.addresseeId, input.friendId)),
              and(eq(friendships.requesterId, input.friendId), eq(friendships.addresseeId, ctx.user.id))
            ),
            eq(friendships.status, "accepted")
          )
        )
        .limit(1);

      if (!friendship) throw new TRPCError({ code: "FORBIDDEN", message: "Not friends with this user" });

      const [friendUser] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, input.friendId)).limit(1);
      const [pts] = await db.select().from(userPoints).where(eq(userPoints.userId, input.friendId)).limit(1);
      const unlockedAchievements = await db
        .select({ achievementId: userAchievements.achievementId, unlockedAt: userAchievements.unlockedAt, name: achievements.name, icon: achievements.icon, rarity: achievements.rarity })
        .from(userAchievements)
        .innerJoin(achievements, eq(achievements.id, userAchievements.achievementId))
        .where(eq(userAchievements.userId, input.friendId))
        .orderBy(desc(userAchievements.unlockedAt));

      return {
        id: friendUser?.id ?? input.friendId,
        name: friendUser?.name ?? "Unknown",
        email: friendUser?.email ?? "",
        totalPoints: pts?.totalPoints ?? 0,
        level: pts?.level ?? 1,
        streak: pts?.streakDays ?? 0,
        achievements: unlockedAchievements,
      };
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
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify friendship
      const [friendship] = await db
        .select()
        .from(friendships)
        .where(
          and(
            or(
              and(eq(friendships.requesterId, ctx.user.id), eq(friendships.addresseeId, input.friendId)),
              and(eq(friendships.requesterId, input.friendId), eq(friendships.addresseeId, ctx.user.id))
            ),
            eq(friendships.status, "accepted")
          )
        )
        .limit(1);

      if (!friendship) throw new TRPCError({ code: "FORBIDDEN", message: "You must be friends to challenge someone" });

      // Verify challenge exists
      const [challenge] = await db.select({ id: challenges.id, name: challenges.name, pointsReward: challenges.pointsReward }).from(challenges).where(eq(challenges.id, input.challengeId)).limit(1);
      if (!challenge) throw new TRPCError({ code: "NOT_FOUND", message: "Challenge not found" });

      // Check for existing pending challenge between these users for this challenge
      const [existing] = await db
        .select()
        .from(friendChallenges)
        .where(
          and(
            eq(friendChallenges.challengeId, input.challengeId),
            or(
              and(eq(friendChallenges.challengerId, ctx.user.id), eq(friendChallenges.challengeeId, input.friendId)),
              and(eq(friendChallenges.challengerId, input.friendId), eq(friendChallenges.challengeeId, ctx.user.id))
            ),
            eq(friendChallenges.status, "pending")
          )
        )
        .limit(1);

      if (existing) throw new TRPCError({ code: "CONFLICT", message: "A pending challenge already exists for this challenge" });

      const [inserted] = await db.insert(friendChallenges).values({
        challengerId: ctx.user.id,
        challengeeId: input.friendId,
        challengeId: input.challengeId,
        message: input.message,
        status: "pending",
      }).$returningId();

      // Notify the challengee
      const challengerName = ctx.user.name ?? "Someone";
      await createNotification(db, {
        userId: input.friendId,
        type: "social",
        title: "You've Been Challenged!",
        body: `${challengerName} challenged you: "${challenge.name}"${input.message ? ` — "${input.message}"` : ""}`,

        link: "/friends?tab=challenges",
      });

      return { success: true, friendChallengeId: inserted.id };
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
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [fc] = await db
        .select()
        .from(friendChallenges)
        .where(and(eq(friendChallenges.id, input.friendChallengeId), eq(friendChallenges.challengeeId, ctx.user.id)))
        .limit(1);

      if (!fc) throw new TRPCError({ code: "NOT_FOUND", message: "Challenge not found" });
      if (fc.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Challenge is no longer pending" });

      const newStatus = input.action === "accept" ? "accepted" : "declined";
      await db
        .update(friendChallenges)
        .set({ status: newStatus, acceptedAt: input.action === "accept" ? new Date() : undefined, updatedAt: new Date() })
        .where(eq(friendChallenges.id, input.friendChallengeId));

      // Notify the challenger
      const [challenge] = await db.select({ name: challenges.name }).from(challenges).where(eq(challenges.id, fc.challengeId)).limit(1);
      const responderName = ctx.user.name ?? "Someone";
      await createNotification(db, {
        userId: fc.challengerId,
        type: "social",
        title: input.action === "accept" ? "Challenge Accepted!" : "Challenge Declined",
        body: `${responderName} ${input.action === "accept" ? "accepted" : "declined"} your challenge: "${challenge?.name ?? "Unknown"}"`,

        link: "/friends?tab=challenges",
      });

      return { success: true };
    }),

  // ── List Friend Challenges ───────────────────────────────────────────────────
  listFriendChallenges: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { sent: [], received: [] };

    const sent = await db
      .select()
      .from(friendChallenges)
      .where(eq(friendChallenges.challengerId, ctx.user.id))
      .orderBy(desc(friendChallenges.createdAt))
      .limit(50);

    const received = await db
      .select()
      .from(friendChallenges)
      .where(eq(friendChallenges.challengeeId, ctx.user.id))
      .orderBy(desc(friendChallenges.createdAt))
      .limit(50);

    const enrichChallenge = async (fc: typeof sent[0], otherUserId: number) => {
      const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, otherUserId)).limit(1);
      const [ch] = await db.select({ name: challenges.name, description: challenges.description, pointsReward: challenges.pointsReward }).from(challenges).where(eq(challenges.id, fc.challengeId)).limit(1);
      return {
        ...fc,
        otherUserName: u?.name ?? "Unknown",
        challengeTitle: ch?.name ?? "Unknown Challenge",
        challengeDescription: ch?.description ?? "",
        pointsReward: ch?.pointsReward ?? 0,
        challengeIcon: "Trophy",
      };
    };

    const enrichedSent = await Promise.all(sent.map((fc) => enrichChallenge(fc, fc.challengeeId)));
    const enrichedReceived = await Promise.all(received.map((fc) => enrichChallenge(fc, fc.challengerId)));

    return { sent: enrichedSent, received: enrichedReceived };
  }),
});
