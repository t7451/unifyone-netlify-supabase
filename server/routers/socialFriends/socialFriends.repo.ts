import {
  friendships,
  friendChallenges,
  users,
  userAchievements,
  achievements,
  challenges,
  userPoints,
  notifications,
} from "../../../drizzle/schema";
import { eq, and, or, desc, ne, like, sql } from "drizzle-orm";
import { getDb } from "../../db";

export { getDb };

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type FriendshipStatus = (typeof friendships.status.enumValues)[number];
type FriendChallengeInsert = typeof friendChallenges.$inferInsert;

// ── Notifications ────────────────────────────────────────────────────────────
export async function insertNotification(
  db: Db,
  opts: {
    userId: number;
    type: string;
    title: string;
    body?: string;
    link?: string;
  }
) {
  await db.insert(notifications).values({
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    link: opts.link,
    read: false,
  });
}

// ── Users ────────────────────────────────────────────────────────────────────
export async function searchUsers(db: Db, currentUserId: number, term: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(
      and(
        ne(users.id, currentUserId),
        or(like(users.name, term), like(users.email, term))
      )
    )
    .limit(20);
}

export async function getUserBasic(db: Db, userId: number) {
  const [u] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u;
}

export async function getUserName(db: Db, userId: number) {
  const [u] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u;
}

// ── Friendships ──────────────────────────────────────────────────────────────
export async function findFriendshipBetween(
  db: Db,
  userA: number,
  userB: number
) {
  return db
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, userA),
          eq(friendships.addresseeId, userB)
        ),
        and(
          eq(friendships.requesterId, userB),
          eq(friendships.addresseeId, userA)
        )
      )
    )
    .limit(1);
}

export async function findAcceptedFriendshipBetween(
  db: Db,
  userA: number,
  userB: number
) {
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          and(
            eq(friendships.requesterId, userA),
            eq(friendships.addresseeId, userB)
          ),
          and(
            eq(friendships.requesterId, userB),
            eq(friendships.addresseeId, userA)
          )
        ),
        eq(friendships.status, "accepted")
      )
    )
    .limit(1);
  return friendship;
}

export async function reactivateFriendship(
  db: Db,
  friendshipId: number,
  requesterId: number,
  addresseeId: number
) {
  await db
    .update(friendships)
    .set({
      status: "pending",
      requesterId,
      addresseeId,
      updatedAt: new Date(),
    })
    .where(eq(friendships.id, friendshipId));
}

export async function insertFriendship(
  db: Db,
  requesterId: number,
  addresseeId: number
) {
  await db.insert(friendships).values({
    requesterId,
    addresseeId,
    status: "pending",
  });
}

export async function findFriendshipByIdAndAddressee(
  db: Db,
  friendshipId: number,
  addresseeId: number
) {
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.id, friendshipId),
        eq(friendships.addresseeId, addresseeId)
      )
    )
    .limit(1);
  return friendship;
}

export async function setFriendshipStatus(
  db: Db,
  friendshipId: number,
  status: FriendshipStatus
) {
  await db
    .update(friendships)
    .set({ status, updatedAt: new Date() })
    .where(eq(friendships.id, friendshipId));
}

export async function findFriendshipByIdAndParticipant(
  db: Db,
  friendshipId: number,
  userId: number
) {
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.id, friendshipId),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        )
      )
    )
    .limit(1);
  return friendship;
}

export async function deleteFriendship(db: Db, friendshipId: number) {
  await db.delete(friendships).where(eq(friendships.id, friendshipId));
}

export async function listAcceptedFriendships(db: Db, userId: number) {
  return db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        ),
        eq(friendships.status, "accepted")
      )
    )
    .orderBy(desc(friendships.updatedAt));
}

export async function listAcceptedFriendshipsUnordered(db: Db, userId: number) {
  return db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        ),
        eq(friendships.status, "accepted")
      )
    );
}

export async function listIncomingPending(db: Db, userId: number) {
  return db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.addresseeId, userId),
        eq(friendships.status, "pending")
      )
    )
    .orderBy(desc(friendships.createdAt));
}

export async function listOutgoingPending(db: Db, userId: number) {
  return db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.requesterId, userId),
        eq(friendships.status, "pending")
      )
    )
    .orderBy(desc(friendships.createdAt));
}

// ── Points & Achievements ────────────────────────────────────────────────────
export async function getUserPointsSummary(db: Db, userId: number) {
  const [pts] = await db
    .select({
      totalPoints: userPoints.totalPoints,
      level: userPoints.level,
    })
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);
  return pts;
}

export async function getUserPoints(db: Db, userId: number) {
  const [pts] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);
  return pts;
}

export async function countUserAchievements(db: Db, userId: number) {
  return db
    .select({ count: sql<number>`count(*)` })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
}

export async function listRecentUnlocks(db: Db, userId: number) {
  return db
    .select({
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
      name: achievements.name,
      icon: achievements.icon,
      rarity: achievements.rarity,
      pointsReward: achievements.pointsReward,
    })
    .from(userAchievements)
    .innerJoin(
      achievements,
      eq(achievements.id, userAchievements.achievementId)
    )
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt))
    .limit(10);
}

export async function listAllUnlocks(db: Db, userId: number) {
  return db
    .select({
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
      name: achievements.name,
      icon: achievements.icon,
      rarity: achievements.rarity,
    })
    .from(userAchievements)
    .innerJoin(
      achievements,
      eq(achievements.id, userAchievements.achievementId)
    )
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt));
}

// ── Challenges ───────────────────────────────────────────────────────────────
export async function getChallengeSummary(db: Db, challengeId: number) {
  const [challenge] = await db
    .select({
      id: challenges.id,
      name: challenges.name,
      pointsReward: challenges.pointsReward,
    })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  return challenge;
}

export async function getChallengeName(db: Db, challengeId: number) {
  const [challenge] = await db
    .select({ name: challenges.name })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  return challenge;
}

export async function getChallengeForEnrich(db: Db, challengeId: number) {
  const [ch] = await db
    .select({
      name: challenges.name,
      description: challenges.description,
      pointsReward: challenges.pointsReward,
    })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  return ch;
}

export async function getChallengeForResult(db: Db, challengeId: number) {
  const [ch] = await db
    .select({
      name: challenges.name,
      pointsReward: challenges.pointsReward,
      unit: challenges.unit,
      goal: challenges.goal,
    })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  return ch;
}

// ── Friend Challenges ────────────────────────────────────────────────────────
export async function findPendingFriendChallenge(
  db: Db,
  challengeId: number,
  userA: number,
  userB: number
) {
  const [existing] = await db
    .select()
    .from(friendChallenges)
    .where(
      and(
        eq(friendChallenges.challengeId, challengeId),
        or(
          and(
            eq(friendChallenges.challengerId, userA),
            eq(friendChallenges.challengeeId, userB)
          ),
          and(
            eq(friendChallenges.challengerId, userB),
            eq(friendChallenges.challengeeId, userA)
          )
        ),
        eq(friendChallenges.status, "pending")
      )
    )
    .limit(1);
  return existing;
}

export async function insertFriendChallenge(
  db: Db,
  values: FriendChallengeInsert
) {
  const [inserted] = await db
    .insert(friendChallenges)
    .values(values)
    .returning({ id: friendChallenges.id });
  return inserted;
}

export async function findFriendChallengeForChallengee(
  db: Db,
  friendChallengeId: number,
  challengeeId: number
) {
  const [fc] = await db
    .select()
    .from(friendChallenges)
    .where(
      and(
        eq(friendChallenges.id, friendChallengeId),
        eq(friendChallenges.challengeeId, challengeeId)
      )
    )
    .limit(1);
  return fc;
}

export async function updateFriendChallengeResponse(
  db: Db,
  friendChallengeId: number,
  status: "accepted" | "declined",
  acceptedAt: Date | undefined
) {
  await db
    .update(friendChallenges)
    .set({
      status,
      acceptedAt,
      updatedAt: new Date(),
    })
    .where(eq(friendChallenges.id, friendChallengeId));
}

export async function listSentChallenges(db: Db, userId: number) {
  return db
    .select()
    .from(friendChallenges)
    .where(eq(friendChallenges.challengerId, userId))
    .orderBy(desc(friendChallenges.createdAt))
    .limit(50);
}

export async function listReceivedChallenges(db: Db, userId: number) {
  return db
    .select()
    .from(friendChallenges)
    .where(eq(friendChallenges.challengeeId, userId))
    .orderBy(desc(friendChallenges.createdAt))
    .limit(50);
}

export async function listCompletedChallenges(db: Db, userId: number) {
  return db
    .select()
    .from(friendChallenges)
    .where(
      and(
        eq(friendChallenges.status, "completed"),
        or(
          eq(friendChallenges.challengerId, userId),
          eq(friendChallenges.challengeeId, userId)
        )
      )
    )
    .orderBy(desc(friendChallenges.resolvedAt))
    .limit(20);
}

export async function listAcceptedChallengeIds(db: Db) {
  return db
    .select({ id: friendChallenges.id })
    .from(friendChallenges)
    .where(eq(friendChallenges.status, "accepted"));
}
