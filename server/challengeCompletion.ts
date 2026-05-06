import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  challengeProgress,
  challenges,
  financialRules,
  friendChallenges,
  gigShifts,
  mileageLogs,
  notifications,
  pointsTransactions,
  userPoints,
  users,
} from "../drizzle/schema";

const WINNER_BONUS_POINTS = 50;

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type ChallengeDefinition = typeof challenges.$inferSelect;
type FriendChallengeRecord = typeof friendChallenges.$inferSelect;
type ChallengeMetric = "earnings" | "miles" | "rules" | "shifts" | "progress";

type ProgressEvent = {
  occurredAt: Date;
  value: number;
};

export type ChallengeProgressSnapshot = {
  userId: number;
  progress: number;
  goalReachedAt: Date | null;
  updatedAt: Date | null;
};

export type ChallengeResolutionOutcome = {
  winnerUserId: number | null;
  winnerUserIds: number[];
  loserUserIds: number[];
  isTie: boolean;
  resolvedAt: Date;
};

function normalizeProgress(value: number, metric: ChallengeMetric): number {
  if (metric === "earnings" || metric === "miles") {
    return Math.round(value * 100) / 100;
  }

  return Math.round(value);
}

function inferChallengeMetric(challenge: ChallengeDefinition): ChallengeMetric {
  const haystack = [challenge.unit, challenge.name, challenge.description ?? ""]
    .join(" ")
    .toLowerCase();

  if (haystack.includes("mile")) return "miles";
  if (
    haystack.includes("earn") ||
    haystack.includes("dollar") ||
    haystack.includes("revenue") ||
    haystack.includes("$")
  ) {
    return "earnings";
  }
  if (haystack.includes("rule")) return "rules";
  if (haystack.includes("shift") || haystack.includes("trip")) return "shifts";
  return "progress";
}

function buildSnapshotFromEvents(
  userId: number,
  goal: number,
  metric: ChallengeMetric,
  events: ProgressEvent[]
): ChallengeProgressSnapshot {
  const sortedEvents = [...events].sort(
    (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime()
  );

  let runningTotal = 0;
  let goalReachedAt: Date | null = null;

  for (const event of sortedEvents) {
    runningTotal += event.value;
    if (goalReachedAt === null && runningTotal >= goal) {
      goalReachedAt = event.occurredAt;
    }
  }

  return {
    userId,
    progress: normalizeProgress(runningTotal, metric),
    goalReachedAt,
    updatedAt: sortedEvents.at(-1)?.occurredAt ?? null,
  };
}

async function createNotification(
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

async function awardWinnerBonus(
  db: Db,
  userId: number,
  friendChallengeId: number,
  challengeName: string
) {
  const referenceId = `friend-challenge:${friendChallengeId}:winner:${userId}`;
  const [existingAward] = await db
    .select({ id: pointsTransactions.id })
    .from(pointsTransactions)
    .where(
      and(
        eq(pointsTransactions.userId, userId),
        eq(pointsTransactions.action, "friend_challenge_win"),
        eq(pointsTransactions.referenceId, referenceId)
      )
    )
    .limit(1);

  if (existingAward) {
    return;
  }

  const [currentPoints] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  const totalPoints = (currentPoints?.totalPoints ?? 0) + WINNER_BONUS_POINTS;
  const lifetimePoints =
    (currentPoints?.lifetimePoints ?? 0) + WINNER_BONUS_POINTS;
  const level = Math.max(1, Math.floor(1 + Math.sqrt(lifetimePoints / 50)));
  const now = new Date();

  if (currentPoints) {
    await db
      .update(userPoints)
      .set({
        totalPoints,
        lifetimePoints,
        level,
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(userPoints.userId, userId));
  } else {
    await db.insert(userPoints).values({
      userId,
      totalPoints,
      lifetimePoints,
      level,
      lastActivityAt: now,
      updatedAt: now,
    });
  }

  await db.insert(pointsTransactions).values({
    userId,
    points: WINNER_BONUS_POINTS,
    action: "friend_challenge_win",
    description: `Won friend challenge: ${challengeName}`,
    referenceId,
    balanceAfter: totalPoints,
  });
}

async function loadProgressEvents(
  db: Db,
  challenge: ChallengeDefinition,
  userId: number,
  metric: ChallengeMetric
): Promise<ProgressEvent[]> {
  const startsAt = challenge.startsAt;
  const endsAt = challenge.endsAt;

  if (metric === "earnings") {
    const shifts = await db
      .select({
        grossEarnings: gigShifts.grossEarnings,
        tips: gigShifts.tips,
        bonuses: gigShifts.bonuses,
        endTime: gigShifts.endTime,
      })
      .from(gigShifts)
      .where(
        and(
          eq(gigShifts.userId, userId),
          eq(gigShifts.status, "completed"),
          gte(gigShifts.endTime, startsAt),
          lte(gigShifts.endTime, endsAt)
        )
      );

    return shifts
      .filter(shift => shift.endTime !== null)
      .map(shift => ({
        occurredAt: shift.endTime as Date,
        value:
          Number(shift.grossEarnings) +
          Number(shift.tips) +
          Number(shift.bonuses),
      }));
  }

  if (metric === "miles") {
    const logs = await db
      .select({ date: mileageLogs.date, miles: mileageLogs.miles })
      .from(mileageLogs)
      .where(
        and(
          eq(mileageLogs.userId, userId),
          gte(mileageLogs.date, startsAt),
          lte(mileageLogs.date, endsAt)
        )
      );

    return logs.map(log => ({
      occurredAt: log.date,
      value: Number(log.miles),
    }));
  }

  if (metric === "rules") {
    const rules = await db
      .select({ createdAt: financialRules.createdAt })
      .from(financialRules)
      .where(
        and(
          eq(financialRules.userId, userId),
          gte(financialRules.createdAt, startsAt),
          lte(financialRules.createdAt, endsAt)
        )
      );

    return rules.map(rule => ({
      occurredAt: rule.createdAt,
      value: 1,
    }));
  }

  if (metric === "shifts") {
    const shifts = await db
      .select({ endTime: gigShifts.endTime })
      .from(gigShifts)
      .where(
        and(
          eq(gigShifts.userId, userId),
          eq(gigShifts.status, "completed"),
          gte(gigShifts.endTime, startsAt),
          lte(gigShifts.endTime, endsAt)
        )
      );

    return shifts
      .filter(shift => shift.endTime !== null)
      .map(shift => ({
        occurredAt: shift.endTime as Date,
        value: 1,
      }));
  }

  const [progressRecord] = await db
    .select({
      progress: challengeProgress.progress,
      completed: challengeProgress.completed,
      completedAt: challengeProgress.completedAt,
      updatedAt: challengeProgress.updatedAt,
      joinedAt: challengeProgress.joinedAt,
    })
    .from(challengeProgress)
    .where(
      and(
        eq(challengeProgress.userId, userId),
        eq(challengeProgress.challengeId, challenge.id)
      )
    )
    .limit(1);

  if (!progressRecord) {
    return [];
  }

  return [
    {
      occurredAt:
        progressRecord.completedAt ??
        progressRecord.updatedAt ??
        progressRecord.joinedAt,
      value: progressRecord.progress,
    },
  ];
}

async function loadProgressSnapshot(
  db: Db,
  challenge: ChallengeDefinition,
  userId: number
): Promise<ChallengeProgressSnapshot> {
  const metric = inferChallengeMetric(challenge);
  const events = await loadProgressEvents(db, challenge, userId, metric);

  return buildSnapshotFromEvents(userId, challenge.goal, metric, events);
}

export function determineChallengeOutcome(
  challenger: ChallengeProgressSnapshot,
  challengee: ChallengeProgressSnapshot,
  goal: number,
  resolvedAt = new Date()
): ChallengeResolutionOutcome | null {
  const challengerReached = challenger.progress >= goal;
  const challengeeReached = challengee.progress >= goal;

  if (!challengerReached && !challengeeReached) {
    return null;
  }

  if (challengerReached && challengeeReached) {
    const challengerReachedAt =
      challenger.goalReachedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const challengeeReachedAt =
      challengee.goalReachedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;

    if (challengerReachedAt === challengeeReachedAt) {
      return {
        winnerUserId: null,
        winnerUserIds: [challenger.userId, challengee.userId],
        loserUserIds: [],
        isTie: true,
        resolvedAt,
      };
    }

    const winnerUserId =
      challengerReachedAt < challengeeReachedAt
        ? challenger.userId
        : challengee.userId;
    const loserUserId =
      winnerUserId === challenger.userId
        ? challengee.userId
        : challenger.userId;

    return {
      winnerUserId,
      winnerUserIds: [winnerUserId],
      loserUserIds: [loserUserId],
      isTie: false,
      resolvedAt,
    };
  }

  const winnerUserId = challengerReached
    ? challenger.userId
    : challengee.userId;
  const loserUserId =
    winnerUserId === challenger.userId ? challengee.userId : challenger.userId;

  return {
    winnerUserId,
    winnerUserIds: [winnerUserId],
    loserUserIds: [loserUserId],
    isTie: false,
    resolvedAt,
  };
}

export async function resolveFriendChallengeRecord(
  db: Db,
  friendChallenge: FriendChallengeRecord,
  challenge: ChallengeDefinition
): Promise<boolean> {
  if (friendChallenge.resolvedAt) {
    return false;
  }

  const [challengerProgress, challengeeProgress] = await Promise.all([
    loadProgressSnapshot(db, challenge, friendChallenge.challengerId),
    loadProgressSnapshot(db, challenge, friendChallenge.challengeeId),
  ]);

  const resolution = determineChallengeOutcome(
    challengerProgress,
    challengeeProgress,
    challenge.goal
  );

  if (!resolution) {
    return false;
  }

  const participantIds = [
    friendChallenge.challengerId,
    friendChallenge.challengeeId,
  ];
  const participantUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, participantIds));

  const participantNames = new Map<number, string>();
  for (const participant of participantUsers) {
    participantNames.set(participant.id, participant.name ?? "Your friend");
  }

  const now = resolution.resolvedAt;
  const completedAt = resolution.isTie
    ? (challengerProgress.goalReachedAt ??
      challengeeProgress.goalReachedAt ??
      now)
    : resolution.winnerUserId === challengerProgress.userId
      ? (challengerProgress.goalReachedAt ?? now)
      : (challengeeProgress.goalReachedAt ?? now);

  await db
    .update(friendChallenges)
    .set({
      status: "completed",
      winnerId: resolution.winnerUserId,
      completedAt,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(friendChallenges.id, friendChallenge.id));

  if (resolution.isTie) {
    for (const participantId of resolution.winnerUserIds) {
      const opponentId =
        participantId === friendChallenge.challengerId
          ? friendChallenge.challengeeId
          : friendChallenge.challengerId;
      await createNotification(db, {
        userId: participantId,
        type: "friend_challenge_tied",
        title: "You won the challenge! 🏆",
        body: `You and ${participantNames.get(opponentId) ?? "your friend"} finished ${challenge.name} at the same time. You both win!`,
        link: "/friends?tab=challenges",
      });
      await awardWinnerBonus(
        db,
        participantId,
        friendChallenge.id,
        challenge.name
      );
    }

    await db
      .update(friendChallenges)
      .set({ winnerNotified: true, loserNotified: true, updatedAt: new Date() })
      .where(eq(friendChallenges.id, friendChallenge.id));

    return true;
  }

  const winnerUserId = resolution.winnerUserId;
  if (!winnerUserId) {
    return true;
  }

  const loserUserId =
    winnerUserId === friendChallenge.challengerId
      ? friendChallenge.challengeeId
      : friendChallenge.challengerId;

  if (!friendChallenge.winnerNotified) {
    await createNotification(db, {
      userId: winnerUserId,
      type: "friend_challenge_won",
      title: "You won the challenge! 🏆",
      body: `You beat ${participantNames.get(loserUserId) ?? "your friend"} in ${challenge.name}.`,
      link: "/friends?tab=challenges",
    });
    await awardWinnerBonus(
      db,
      winnerUserId,
      friendChallenge.id,
      challenge.name
    );
    await db
      .update(friendChallenges)
      .set({ winnerNotified: true, updatedAt: new Date() })
      .where(eq(friendChallenges.id, friendChallenge.id));
  }

  if (!friendChallenge.loserNotified) {
    await createNotification(db, {
      userId: loserUserId,
      type: "friend_challenge_lost",
      title: "Challenge complete — better luck next time",
      body: `${participantNames.get(winnerUserId) ?? "Your friend"} reached the ${challenge.name} goal first.`,
      link: "/friends?tab=challenges",
    });
    await db
      .update(friendChallenges)
      .set({ loserNotified: true, updatedAt: new Date() })
      .where(eq(friendChallenges.id, friendChallenge.id));
  }

  return true;
}

async function getAcceptedFriendChallenges(
  db: Db,
  filters?: { challengeId?: number; userId?: number }
): Promise<FriendChallengeRecord[]> {
  const conditions = [
    eq(friendChallenges.status, "accepted"),
    isNull(friendChallenges.resolvedAt),
  ];

  if (typeof filters?.challengeId === "number") {
    conditions.push(eq(friendChallenges.challengeId, filters.challengeId));
  }

  if (typeof filters?.userId === "number") {
    const userCondition = or(
      eq(friendChallenges.challengerId, filters.userId),
      eq(friendChallenges.challengeeId, filters.userId)
    );
    if (userCondition) conditions.push(userCondition);
  }

  return db
    .select()
    .from(friendChallenges)
    .where(and(...conditions));
}

async function resolveFriendChallenges(
  db: Db,
  activeChallenges: FriendChallengeRecord[]
): Promise<void> {
  for (const friendChallenge of activeChallenges) {
    try {
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, friendChallenge.challengeId))
        .limit(1);

      if (!challenge) {
        continue;
      }

      await resolveFriendChallengeRecord(db, friendChallenge, challenge);
    } catch (error) {
      console.error(
        "[challengeCompletion] Failed to resolve friend challenge",
        friendChallenge.id,
        error
      );
    }
  }
}

export async function checkAndResolveFriendChallenges(
  challengeId: number,
  userId: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const activeChallenges = await getAcceptedFriendChallenges(db, {
      challengeId,
      userId,
    });

    if (activeChallenges.length === 0) {
      return;
    }

    await resolveFriendChallenges(db, activeChallenges);
  } catch (error) {
    console.error(
      "[challengeCompletion] checkAndResolveFriendChallenges failed",
      { challengeId, userId },
      error
    );
  }
}

export const checkAndResolveFriendChallenge = checkAndResolveFriendChallenges;

export async function checkAndResolveFriendChallengesForUser(
  userId: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const activeChallenges = await getAcceptedFriendChallenges(db, { userId });
    if (activeChallenges.length === 0) {
      return;
    }

    await resolveFriendChallenges(db, activeChallenges);
  } catch (error) {
    console.error(
      "[challengeCompletion] checkAndResolveFriendChallengesForUser failed",
      { userId },
      error
    );
  }
}

export async function resolveAllPendingFriendChallenges(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;

    const activeChallenges = await getAcceptedFriendChallenges(db);
    if (activeChallenges.length === 0) {
      return 0;
    }

    let resolved = 0;
    for (const friendChallenge of activeChallenges) {
      try {
        const [challenge] = await db
          .select()
          .from(challenges)
          .where(eq(challenges.id, friendChallenge.challengeId))
          .limit(1);

        if (!challenge) {
          continue;
        }

        if (
          await resolveFriendChallengeRecord(db, friendChallenge, challenge)
        ) {
          resolved += 1;
        }
      } catch (error) {
        console.error(
          "[challengeCompletion] Failed to resolve pending challenge",
          friendChallenge.id,
          error
        );
      }
    }

    return resolved;
  } catch (error) {
    console.error(
      "[challengeCompletion] resolveAllPendingFriendChallenges failed",
      error
    );
    return 0;
  }
}

export async function getChallengeScores(
  challengeId: number,
  userIds: number[]
): Promise<Record<number, ChallengeProgressSnapshot>> {
  const db = await getDb();
  if (!db) {
    return {};
  }

  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!challenge) {
    return {};
  }

  const snapshots = await Promise.all(
    userIds.map(userId => loadProgressSnapshot(db, challenge, userId))
  );

  return Object.fromEntries(
    snapshots.map(snapshot => [snapshot.userId, snapshot])
  );
}

export const challengeCompletionInternals = {
  inferChallengeMetric,
  buildSnapshotFromEvents,
  determineChallengeOutcome,
};
