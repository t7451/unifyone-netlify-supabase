/**
 * Challenge Completion Engine
 *
 * Detects when a friend challenge is resolved (one or both participants
 * complete the underlying challenge goal), determines the winner using
 * first-to-complete tie-breaking, awards bonus points, and fires in-app
 * notifications to both participants.
 *
 * Call `checkAndResolveFriendChallenge(db, challengeId, userId)` after any
 * action that could advance a user's challenge progress (shift end, mileage
 * log, rule create, etc.).
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  friendChallenges,
  challengeProgress,
  challenges,
  userPoints,
  pointsTransactions,
  notifications,
  users,
} from "../drizzle/schema";

// Bonus points awarded to the winner of a friend challenge
const WINNER_BONUS_POINTS = 50;

// ── Internal helpers ──────────────────────────────────────────────────────────

type Db = Awaited<ReturnType<typeof getDb>>;

async function createNotification(
  db: NonNullable<Db>,
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

async function awardBonusPoints(
  db: NonNullable<Db>,
  userId: number,
  points: number,
  description: string,
  referenceId: string
) {
  const [existing] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  const currentBalance = existing?.totalPoints ?? 0;
  const newBalance = currentBalance + points;
  const newLifetime = (existing?.lifetimePoints ?? 0) + points;
  const newLevel = Math.floor(1 + Math.sqrt(newLifetime / 50));

  if (existing) {
    await db
      .update(userPoints)
      .set({
        totalPoints: newBalance,
        lifetimePoints: newLifetime,
        level: newLevel,
        lastActivityAt: new Date(),
      })
      .where(eq(userPoints.userId, userId));
  } else {
    await db.insert(userPoints).values({
      userId,
      totalPoints: newBalance,
      lifetimePoints: newLifetime,
      level: newLevel,
      lastActivityAt: new Date(),
    });
  }

  await db.insert(pointsTransactions).values({
    userId,
    points,
    action: "challenge_winner_bonus",
    description,
    referenceId,
    balanceAfter: newBalance,
  });
}

// ── Core resolution logic ─────────────────────────────────────────────────────

export interface ResolutionResult {
  resolved: boolean;
  winnerId: number | null;
  isTie: boolean;
  friendChallengeId: number;
}

/**
 * Check if a specific friend challenge can be resolved after a participant
 * has made progress. This is the primary entry point called from mutations.
 *
 * @param challengeId  - The gamification challenge ID (from challenges table)
 * @param actingUserId - The user who just completed an action
 */
export async function checkAndResolveFriendChallenge(
  challengeId: number,
  actingUserId: number
): Promise<ResolutionResult[]> {
  const db = await getDb();
  if (!db) return [];

  // Find all active (accepted) friend challenges for this challenge that
  // involve the acting user and haven't been resolved yet
  const activeFriendChallenges = await db
    .select()
    .from(friendChallenges)
    .where(
      and(
        eq(friendChallenges.challengeId, challengeId),
        eq(friendChallenges.status, "accepted")
      )
    );

  // Filter to only those involving the acting user
  const relevantChallenges = activeFriendChallenges.filter(
    (fc) => fc.challengerId === actingUserId || fc.challengeeId === actingUserId
  );

  if (relevantChallenges.length === 0) return [];

  // Fetch the challenge definition for the goal threshold
  const [challengeDef] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!challengeDef) return [];

  const results: ResolutionResult[] = [];

  for (const fc of relevantChallenges) {
    const result = await resolveOneFriendChallenge(db, fc, challengeDef);
    if (result) results.push(result);
  }

  return results;
}

/**
 * Resolve a single friend challenge record.
 * Returns null if the challenge cannot be resolved yet.
 */
async function resolveOneFriendChallenge(
  db: NonNullable<Db>,
  fc: typeof friendChallenges.$inferSelect,
  challengeDef: typeof challenges.$inferSelect
): Promise<ResolutionResult | null> {
  // Fetch progress for both participants
  const [challengerProgress] = await db
    .select()
    .from(challengeProgress)
    .where(
      and(
        eq(challengeProgress.userId, fc.challengerId),
        eq(challengeProgress.challengeId, fc.challengeId)
      )
    )
    .limit(1);

  const [challengeeProgress] = await db
    .select()
    .from(challengeProgress)
    .where(
      and(
        eq(challengeProgress.userId, fc.challengeeId),
        eq(challengeProgress.challengeId, fc.challengeId)
      )
    )
    .limit(1);

  const challengerDone = challengerProgress?.completed === true;
  const challengeeDone = challengeeProgress?.completed === true;

  // Neither participant has finished — nothing to resolve yet
  if (!challengerDone && !challengeeDone) return null;

  const now = new Date();
  let winnerId: number | null = null;
  let isTie = false;

  if (challengerDone && challengeeDone) {
    // Both finished — compare completedAt timestamps for tie-break
    const cTime = challengerProgress?.completedAt?.getTime() ?? 0;
    const eTime = challengeeProgress?.completedAt?.getTime() ?? 0;
    const TOLERANCE_MS = 60_000; // within 60 s counts as a tie

    if (Math.abs(cTime - eTime) <= TOLERANCE_MS) {
      isTie = true;
      winnerId = null; // tie — both get winner treatment
    } else {
      winnerId = cTime < eTime ? fc.challengerId : fc.challengeeId;
    }
  } else {
    // Only one has finished — they win
    winnerId = challengerDone ? fc.challengerId : fc.challengeeId;
  }

  // Persist resolution
  await db
    .update(friendChallenges)
    .set({
      status: "completed",
      winnerId: isTie ? null : winnerId,
      completedAt: now,
      resolvedAt: now,
    })
    .where(eq(friendChallenges.id, fc.id));

  // Fetch user names for notification bodies
  const participantIds = [fc.challengerId, fc.challengeeId];
  const participantUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      participantIds.length === 2
        ? and(
            eq(users.id, participantIds[0]),
            eq(users.id, participantIds[1])
          )
        : eq(users.id, participantIds[0])
    )
    .limit(2);

  // Build a name lookup
  const nameMap = new Map<number, string>();
  // Fetch both users individually since OR isn't trivially available here
  const [u1] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, fc.challengerId)).limit(1);
  const [u2] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, fc.challengeeId)).limit(1);
  if (u1) nameMap.set(u1.id, u1.name ?? "Your opponent");
  if (u2) nameMap.set(u2.id, u2.name ?? "Your opponent");

  const challengerName = nameMap.get(fc.challengerId) ?? "Your opponent";
  const challengeeName = nameMap.get(fc.challengeeId) ?? "Your opponent";
  const challengeName = challengeDef.name;

  if (isTie) {
    // Notify both as co-winners
    for (const participantId of [fc.challengerId, fc.challengeeId]) {
      const opponentName = participantId === fc.challengerId ? challengeeName : challengerName;
      await createNotification(db, {
        userId: participantId,
        type: "challenge_tie",
        title: "It's a Tie! 🤝",
        body: `You and ${opponentName} both completed "${challengeName}" at the same time. You both earn the full reward!`,
        link: "/friends",
      });
      await awardBonusPoints(
        db,
        participantId,
        WINNER_BONUS_POINTS,
        `Tie in friend challenge: ${challengeName}`,
        String(fc.id)
      );
    }

    // Mark both as notified
    await db
      .update(friendChallenges)
      .set({ winnerNotified: true, loserNotified: true })
      .where(eq(friendChallenges.id, fc.id));
  } else if (winnerId !== null) {
    const loserId = winnerId === fc.challengerId ? fc.challengeeId : fc.challengerId;
    const winnerName = nameMap.get(winnerId) ?? "You";
    const loserOpponentName = nameMap.get(winnerId) ?? "Your opponent";

    // Notify winner
    if (!fc.winnerNotified) {
      await createNotification(db, {
        userId: winnerId,
        type: "challenge_won",
        title: "You Won! 🏆",
        body: `You beat ${loserOpponentName} in the "${challengeName}" challenge! +${WINNER_BONUS_POINTS} bonus points awarded.`,
        link: "/friends",
      });
      await awardBonusPoints(
        db,
        winnerId,
        WINNER_BONUS_POINTS,
        `Won friend challenge: ${challengeName}`,
        String(fc.id)
      );
      await db
        .update(friendChallenges)
        .set({ winnerNotified: true })
        .where(eq(friendChallenges.id, fc.id));
    }

    // Notify loser
    if (!fc.loserNotified) {
      await createNotification(db, {
        userId: loserId,
        type: "challenge_lost",
        title: "Challenge Complete",
        body: `${winnerName} completed "${challengeName}" before you. Keep going — you can challenge them again!`,
        link: "/friends",
      });
      await db
        .update(friendChallenges)
        .set({ loserNotified: true })
        .where(eq(friendChallenges.id, fc.id));
    }
  }

  return {
    resolved: true,
    winnerId: isTie ? null : winnerId,
    isTie,
    friendChallengeId: fc.id,
  };
}

/**
 * Admin/cron utility: scan ALL accepted friend challenges and resolve any
 * that have undetected completions. Safe to call repeatedly (idempotent).
 */
export async function resolveAllPendingFriendChallenges(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const accepted = await db
    .select()
    .from(friendChallenges)
    .where(eq(friendChallenges.status, "accepted"));

  if (accepted.length === 0) return 0;

  let resolved = 0;

  for (const fc of accepted) {
    const [challengeDef] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, fc.challengeId))
      .limit(1);

    if (!challengeDef) continue;

    const result = await resolveOneFriendChallenge(db, fc, challengeDef);
    if (result?.resolved) resolved++;
  }

  return resolved;
}
