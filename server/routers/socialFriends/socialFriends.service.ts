import {
  checkAndResolveFriendChallenges,
  getChallengeScores,
  resolveAllPendingFriendChallenges,
} from "../../challengeCompletion";
import { TRPCError } from "@trpc/server";
import { getAppUrl } from "../../_core/env";
import * as repo from "./socialFriends.repo";

const { getDb } = repo;

type CtxUser = {
  id: number;
  name?: string | null;
  email?: string | null;
};

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
  await repo.insertNotification(db, opts);
}

export async function searchUsers(user: CtxUser, query: string) {
  const db = await getDb();
  if (!db) return [];
  const term = `%${query}%`;
  const results = await repo.searchUsers(db, user.id, term);

  // For each result, determine friendship status with the current user
  const enriched = await Promise.all(
    results.map(async u => {
      const existing = await repo.findFriendshipBetween(db, user.id, u.id);
      const friendship = existing[0] ?? null;
      return {
        ...u,
        friendshipStatus: friendship?.status ?? null,
        friendshipId: friendship?.id ?? null,
        isRequester: friendship?.requesterId === user.id,
      };
    })
  );
  return enriched;
}

export async function sendRequest(user: CtxUser, addresseeId: number) {
  if (addresseeId === user.id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot friend yourself",
    });
  }
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  // Check for existing friendship
  const existing = await repo.findFriendshipBetween(db, user.id, addresseeId);

  if (existing.length > 0) {
    const f = existing[0];
    if (f.status === "accepted")
      throw new TRPCError({ code: "CONFLICT", message: "Already friends" });
    if (f.status === "pending")
      throw new TRPCError({
        code: "CONFLICT",
        message: "Request already sent",
      });
    if (f.status === "blocked")
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot send request",
      });
    // Declined — allow re-request by updating
    await repo.reactivateFriendship(db, f.id, user.id, addresseeId);
    return { success: true };
  }

  await repo.insertFriendship(db, user.id, addresseeId);

  // Notify the addressee
  const senderName = user.name ?? "Someone";
  await createNotification(db, {
    userId: addresseeId,
    type: "social",
    title: "New Friend Request",
    body: `${senderName} sent you a friend request`,
    link: "/friends",
  });

  return { success: true };
}

export async function acceptRequest(user: CtxUser, friendshipId: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  const friendship = await repo.findFriendshipByIdAndAddressee(
    db,
    friendshipId,
    user.id
  );

  if (!friendship)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Friend request not found",
    });
  if (friendship.status !== "pending")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Request is not pending",
    });

  await repo.setFriendshipStatus(db, friendshipId, "accepted");

  // Notify the requester
  const acceptorName = user.name ?? "Someone";
  await createNotification(db, {
    userId: friendship.requesterId,
    type: "social",
    title: "Friend Request Accepted",
    body: `${acceptorName} accepted your friend request`,
    link: "/friends",
  });

  return { success: true };
}

export async function declineRequest(user: CtxUser, friendshipId: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  const friendship = await repo.findFriendshipByIdAndAddressee(
    db,
    friendshipId,
    user.id
  );

  if (!friendship)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Friend request not found",
    });

  await repo.setFriendshipStatus(db, friendshipId, "declined");
  return { success: true };
}

export async function removeFriend(user: CtxUser, friendshipId: number) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  const friendship = await repo.findFriendshipByIdAndParticipant(
    db,
    friendshipId,
    user.id
  );

  if (!friendship)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Friendship not found",
    });

  await repo.deleteFriendship(db, friendshipId);
  return { success: true };
}

export async function listFriends(user: CtxUser) {
  const db = await getDb();
  if (!db) return [];

  const accepted = await repo.listAcceptedFriendships(db, user.id);

  // Resolve friend user details
  const friends = await Promise.all(
    accepted.map(async f => {
      const friendId =
        f.requesterId === user.id ? f.addresseeId : f.requesterId;
      const friendUser = await repo.getUserBasic(db, friendId);
      const pts = await repo.getUserPointsSummary(db, friendId);
      const unlockedCount = await repo.countUserAchievements(db, friendId);
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
}

export async function listPendingRequests(user: CtxUser) {
  const db = await getDb();
  if (!db) return { incoming: [], outgoing: [] };

  const incoming = await repo.listIncomingPending(db, user.id);
  const outgoing = await repo.listOutgoingPending(db, user.id);

  const enrichIncoming = await Promise.all(
    incoming.map(async f => {
      const u = await repo.getUserBasic(db, f.requesterId);
      return {
        friendshipId: f.id,
        userId: f.requesterId,
        name: u?.name ?? "Unknown",
        email: u?.email ?? "",
        sentAt: f.createdAt,
      };
    })
  );
  const enrichOutgoing = await Promise.all(
    outgoing.map(async f => {
      const u = await repo.getUserBasic(db, f.addresseeId);
      return {
        friendshipId: f.id,
        userId: f.addresseeId,
        name: u?.name ?? "Unknown",
        email: u?.email ?? "",
        sentAt: f.createdAt,
      };
    })
  );

  return { incoming: enrichIncoming, outgoing: enrichOutgoing };
}

export async function getFriendAchievementFeed(user: CtxUser) {
  const db = await getDb();
  if (!db) return [];

  // Get accepted friend IDs
  const accepted = await repo.listAcceptedFriendshipsUnordered(db, user.id);

  if (accepted.length === 0) return [];

  const friendIds = accepted.map(f =>
    f.requesterId === user.id ? f.addresseeId : f.requesterId
  );

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
    const friendUser = await repo.getUserName(db, friendId);
    const unlocks = await repo.listRecentUnlocks(db, friendId);

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
}

export async function getFriendStats(user: CtxUser, friendId: number) {
  const db = await getDb();
  if (!db) return null;

  // Verify they are actually friends
  const friendship = await repo.findAcceptedFriendshipBetween(
    db,
    user.id,
    friendId
  );

  if (!friendship)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not friends with this user",
    });

  const friendUser = await repo.getUserBasic(db, friendId);
  const pts = await repo.getUserPoints(db, friendId);
  const unlockedAchievements = await repo.listAllUnlocks(db, friendId);

  return {
    id: friendUser?.id ?? friendId,
    name: friendUser?.name ?? "Unknown",
    email: friendUser?.email ?? "",
    totalPoints: pts?.totalPoints ?? 0,
    level: pts?.level ?? 1,
    streak: pts?.streakDays ?? 0,
    achievements: unlockedAchievements,
  };
}

export async function challengeFriend(
  user: CtxUser,
  input: { friendId: number; challengeId: number; message?: string }
) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  // Verify friendship
  const friendship = await repo.findAcceptedFriendshipBetween(
    db,
    user.id,
    input.friendId
  );

  if (!friendship)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be friends to challenge someone",
    });

  // Verify challenge exists
  const challenge = await repo.getChallengeSummary(db, input.challengeId);
  if (!challenge)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Challenge not found",
    });

  // Check for existing pending challenge between these users for this challenge
  const existing = await repo.findPendingFriendChallenge(
    db,
    input.challengeId,
    user.id,
    input.friendId
  );

  if (existing)
    throw new TRPCError({
      code: "CONFLICT",
      message: "A pending challenge already exists for this challenge",
    });

  const inserted = await repo.insertFriendChallenge(db, {
    challengerId: user.id,
    challengeeId: input.friendId,
    challengeId: input.challengeId,
    message: input.message,
    status: "pending",
  });

  // Notify the challengee
  const challengerName = user.name ?? "Someone";
  await createNotification(db, {
    userId: input.friendId,
    type: "social",
    title: "You've Been Challenged!",
    body: `${challengerName} challenged you: "${challenge.name}"${input.message ? ` — "${input.message}"` : ""}`,

    link: "/friends?tab=challenges",
  });

  return { success: true, friendChallengeId: inserted.id };
}

export async function respondToChallenge(
  user: CtxUser,
  input: { friendChallengeId: number; action: "accept" | "decline" }
) {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  const fc = await repo.findFriendChallengeForChallengee(
    db,
    input.friendChallengeId,
    user.id
  );

  if (!fc)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Challenge not found",
    });
  if (fc.status !== "pending")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Challenge is no longer pending",
    });

  const newStatus = input.action === "accept" ? "accepted" : "declined";
  await repo.updateFriendChallengeResponse(
    db,
    input.friendChallengeId,
    newStatus,
    input.action === "accept" ? new Date() : undefined
  );

  // Notify the challenger
  const challenge = await repo.getChallengeName(db, fc.challengeId);
  const responderName = user.name ?? "Someone";
  await createNotification(db, {
    userId: fc.challengerId,
    type: "social",
    title:
      input.action === "accept" ? "Challenge Accepted!" : "Challenge Declined",
    body: `${responderName} ${input.action === "accept" ? "accepted" : "declined"} your challenge: "${challenge?.name ?? "Unknown"}"`,

    link: "/friends?tab=challenges",
  });

  // Fire Meta CAPI FriendChallengeAccepted event when accepted (non-blocking).
  // Intentionally skips DB logging — fire-and-forget so CAPI failures never block the acceptance flow.
  if (input.action === "accept") {
    try {
      const { capi } = await import("../../meta/capi");
      const capiEventId = `challenge-accepted-${input.friendChallengeId}-${Date.now()}`;
      await capi.custom(
        "FriendChallengeAccepted",
        capiEventId,
        {
          externalId: String(user.id),
          email: user.email ?? undefined,
        },
        `${getAppUrl()}/friends`,
        {
          challenge_id: fc.challengeId,
          challenge_name: challenge?.name ?? "Unknown",
        }
      );
    } catch {
      /* CAPI failure is non-critical */
    }

    await checkAndResolveFriendChallenges(fc.challengeId, user.id);
  }

  return { success: true };
}

export async function listFriendChallenges(user: CtxUser) {
  const db = await getDb();
  if (!db) return { sent: [], received: [] };

  const sent = await repo.listSentChallenges(db, user.id);
  const received = await repo.listReceivedChallenges(db, user.id);

  const enrichChallenge = async (fc: (typeof sent)[0], otherUserId: number) => {
    const u = await repo.getUserName(db, otherUserId);
    const ch = await repo.getChallengeForEnrich(db, fc.challengeId);
    return {
      ...fc,
      otherUserName: u?.name ?? "Unknown",
      challengeTitle: ch?.name ?? "Unknown Challenge",
      challengeDescription: ch?.description ?? "",
      pointsReward: ch?.pointsReward ?? 0,
      challengeIcon: "Trophy",
    };
  };

  const enrichedSent = await Promise.all(
    sent.map(fc => enrichChallenge(fc, fc.challengeeId))
  );
  const enrichedReceived = await Promise.all(
    received.map(fc => enrichChallenge(fc, fc.challengerId))
  );

  return { sent: enrichedSent, received: enrichedReceived };
}

export async function getChallengeResults(user: CtxUser) {
  const db = await getDb();
  if (!db) return [];

  const completed = await repo.listCompletedChallenges(db, user.id);

  const enriched = await Promise.all(
    completed.map(async fc => {
      const opponentId =
        fc.challengerId === user.id ? fc.challengeeId : fc.challengerId;
      const u = await repo.getUserName(db, opponentId);
      const ch = await repo.getChallengeForResult(db, fc.challengeId);
      const scores = await getChallengeScores(fc.challengeId, [
        user.id,
        opponentId,
      ]);

      const iWon = fc.winnerId === user.id;
      const isTie = fc.status === "completed" && fc.winnerId === null;

      return {
        id: fc.id,
        challengeId: fc.challengeId,
        challengeName: ch?.name ?? "Unknown Challenge",
        pointsReward: ch?.pointsReward ?? 0,
        opponentName: u?.name ?? "Unknown",
        opponentId,
        winnerId: fc.winnerId,
        winnerUserId: fc.winnerId,
        iWon,
        isTie,
        goal: ch?.goal ?? 0,
        unit: ch?.unit ?? "count",
        myScore: scores[user.id]?.progress ?? 0,
        opponentScore: scores[opponentId]?.progress ?? 0,
        resolvedAt: fc.resolvedAt,
        completedAt: fc.completedAt,
        myRole:
          fc.challengerId === user.id
            ? ("challenger" as const)
            : ("challengee" as const),
      };
    })
  );

  return enriched;
}

export async function checkAllChallenges() {
  const db = await getDb();
  if (!db) return { checked: 0, resolved: 0 };

  const accepted = await repo.listAcceptedChallengeIds(db);

  const checked = accepted.length;
  const resolved = await resolveAllPendingFriendChallenges();

  return { checked, resolved };
}
