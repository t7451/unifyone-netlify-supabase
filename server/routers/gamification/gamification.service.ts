import { TRPCError } from "@trpc/server";
import {
  checkAndResolveFriendChallenges,
  resolveAllPendingFriendChallenges,
} from "../../challengeCompletion";
import * as repo from "./gamification.repo";

/**
 * Use-case / business-logic layer for the gamification router. Orchestrates the
 * repo data-access functions and the friend-challenge resolution helpers,
 * preserving the exact side-effect order and error semantics of the original
 * router.
 */

function dbUnavailable(): TRPCError {
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "DB unavailable",
  });
}

export async function getAchievements(userId: number) {
  const all = await repo.seedAndGetActiveAchievements();
  if (all === null) return { all: [], unlocked: [] };

  const unlocked = await repo.getUnlockedAchievements(userId);

  const unlockedIds = new Set(unlocked.map(u => u.achievementId));

  return {
    all: all.map(a => ({
      ...a,
      unlocked: unlockedIds.has(a.id),
      unlockedAt:
        unlocked.find(u => u.achievementId === a.id)?.unlockedAt ?? null,
    })),
    unlocked: unlocked.length,
    total: all.length,
  };
}

export async function getActiveChallenges(userId: number) {
  const now = new Date();
  const active = await repo.getActiveChallenges(now);
  if (active === null) return [];

  if (active.length === 0) return [];

  const challengeIds = active.map(c => c.id);
  const progress = await repo.getChallengeProgressForChallenges(
    userId,
    challengeIds
  );

  const progressMap = new Map(progress.map(p => [p.challengeId, p]));

  return active.map(c => ({
    ...c,
    userProgress: progressMap.get(c.id) ?? null,
    percentComplete: progressMap.get(c.id)
      ? Math.min(
          100,
          Math.round((progressMap.get(c.id)!.progress / c.goal) * 100)
        )
      : 0,
  }));
}

export async function joinChallenge(userId: number, challengeId: number) {
  if (!(await repo.isDbAvailable())) throw dbUnavailable();

  const challenge = await repo.getChallengeById(challengeId);

  if (!challenge)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Challenge not found",
    });

  const existing = await repo.getUserChallengeProgress(userId, challengeId);

  if (existing)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Already joined this challenge",
    });

  await repo.insertChallengeProgress({
    userId,
    challengeId,
    progress: 0,
    completed: false,
  });

  await repo.incrementChallengeParticipantCount(challengeId);

  await checkAndResolveFriendChallenges(challengeId, userId);

  return { success: true };
}

export async function getLeaderboard(userId: number) {
  const top = await repo.getTopLeaderboard();
  if (top === null) return { leaderboard: [], myRank: null };

  const myEntry = top.find(e => e.userId === userId);
  const myRank = myEntry ? top.indexOf(myEntry) + 1 : null;

  return {
    leaderboard: top.map((e, i) => ({
      rank: i + 1,
      userId: e.userId,
      name: e.name ?? "Anonymous",
      totalPoints: e.totalPoints,
      lifetimePoints: e.lifetimePoints,
      level: e.level,
      isMe: e.userId === userId,
    })),
    myRank,
  };
}

export async function getPointsSummary(userId: number) {
  if (!(await repo.isDbAvailable()))
    return {
      totalPoints: 0,
      lifetimePoints: 0,
      level: 1,
      streakDays: 0,
      nextLevelAt: 100,
      history: [],
    };

  const pts = await repo.getUserPoints(userId);

  const history = await repo.getPointsHistory(userId);

  const level = pts?.level ?? 1;
  const nextLevelAt = Math.pow(level, 2) * 50;

  return {
    totalPoints: pts?.totalPoints ?? 0,
    lifetimePoints: pts?.lifetimePoints ?? 0,
    level,
    streakDays: pts?.streakDays ?? 0,
    nextLevelAt,
    history,
  };
}

export async function updateProgress(
  userId: number,
  challengeId: number,
  increment: number
) {
  if (!(await repo.isDbAvailable())) throw dbUnavailable();

  const existing = await repo.getUserChallengeProgress(userId, challengeId);

  if (!existing)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Not joined this challenge",
    });
  if (existing.completed)
    return { alreadyCompleted: true, progress: existing.progress, goal: 0 };

  const challengeDef = await repo.getChallengeById(challengeId);

  if (!challengeDef)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Challenge not found",
    });

  const newProgress = Math.min(
    existing.progress + increment,
    challengeDef.goal
  );
  const nowCompleted = newProgress >= challengeDef.goal;

  await repo.updateChallengeProgress(existing.id, {
    progress: newProgress,
    completed: nowCompleted,
    ...(nowCompleted ? { completedAt: new Date() } : {}),
  });

  await checkAndResolveFriendChallenges(challengeId, userId);

  return {
    progress: newProgress,
    completed: nowCompleted,
    goal: challengeDef.goal,
  };
}

export async function checkAllFriendChallenges() {
  const resolved = await resolveAllPendingFriendChallenges();
  return { resolved };
}

export async function createChallenge(input: {
  name: string;
  description?: string;
  type: "daily" | "weekly" | "monthly" | "one_time" | "community";
  category: "gig" | "finance" | "social" | "platform";
  goal: number;
  unit: string;
  pointsReward: number;
  bonusReward?: string;
  startsAt: string;
  endsAt: string;
  maxParticipants?: number;
}) {
  const created = await repo.insertChallenge({
    name: input.name,
    description: input.description,
    type: input.type,
    category: input.category,
    goal: input.goal,
    unit: input.unit,
    pointsReward: input.pointsReward,
    bonusReward: input.bonusReward,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    maxParticipants: input.maxParticipants,
  });
  if (!created) throw dbUnavailable();

  return { success: true };
}
