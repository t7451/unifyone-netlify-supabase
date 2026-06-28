import { getDb } from "../../db";
import {
  achievements,
  userAchievements,
  challenges,
  challengeProgress,
  userPoints,
  pointsTransactions,
  users,
} from "../../../drizzle/schema";
import { eq, desc, and, sql, lte, gte, inArray } from "drizzle-orm";

/**
 * Data-access layer for the gamification router. Wraps the shared `getDb()`
 * Drizzle client; queries are relocated verbatim from the original router so
 * behavior and SQL are identical.
 */

// Seed achievements on first call if table is empty
const SEED_ACHIEVEMENTS = [
  {
    key: "first_shift",
    name: "First Shift",
    description: "Complete your first gig shift",
    icon: "Zap",
    category: "gig" as const,
    pointsReward: 50,
    rarity: "common" as const,
    requirement: { type: "shifts_completed", threshold: 1 },
  },
  {
    key: "shift_5",
    name: "Getting Momentum",
    description: "Complete 5 gig shifts",
    icon: "TrendingUp",
    category: "gig" as const,
    pointsReward: 100,
    rarity: "common" as const,
    requirement: { type: "shifts_completed", threshold: 5 },
  },
  {
    key: "shift_25",
    name: "Road Warrior",
    description: "Complete 25 gig shifts",
    icon: "Car",
    category: "gig" as const,
    pointsReward: 250,
    rarity: "uncommon" as const,
    requirement: { type: "shifts_completed", threshold: 25 },
  },
  {
    key: "shift_100",
    name: "Century Driver",
    description: "Complete 100 gig shifts",
    icon: "Award",
    category: "gig" as const,
    pointsReward: 500,
    rarity: "rare" as const,
    requirement: { type: "shifts_completed", threshold: 100 },
  },
  {
    key: "mileage_100",
    name: "100 Mile Club",
    description: "Log 100 business miles",
    icon: "MapPin",
    category: "gig" as const,
    pointsReward: 75,
    rarity: "common" as const,
    requirement: { type: "miles_logged", threshold: 100 },
  },
  {
    key: "mileage_1000",
    name: "Road Scholar",
    description: "Log 1,000 business miles",
    icon: "Navigation",
    category: "gig" as const,
    pointsReward: 300,
    rarity: "uncommon" as const,
    requirement: { type: "miles_logged", threshold: 1000 },
  },
  {
    key: "first_rule",
    name: "Rule Maker",
    description: "Create your first financial rule",
    icon: "Settings",
    category: "finance" as const,
    pointsReward: 50,
    rarity: "common" as const,
    requirement: { type: "rules_created", threshold: 1 },
  },
  {
    key: "rules_5",
    name: "Money Manager",
    description: "Create 5 financial rules",
    icon: "DollarSign",
    category: "finance" as const,
    pointsReward: 150,
    rarity: "uncommon" as const,
    requirement: { type: "rules_created", threshold: 5 },
  },
  {
    key: "earnings_100",
    name: "First Hundred",
    description: "Earn $100 in gig shifts",
    icon: "Banknote",
    category: "finance" as const,
    pointsReward: 100,
    rarity: "common" as const,
    requirement: { type: "total_earnings", threshold: 100 },
  },
  {
    key: "earnings_1000",
    name: "Four Figures",
    description: "Earn $1,000 in gig shifts",
    icon: "TrendingUp",
    category: "finance" as const,
    pointsReward: 500,
    rarity: "rare" as const,
    requirement: { type: "total_earnings", threshold: 1000 },
  },
  {
    key: "level_5",
    name: "Rising Star",
    description: "Reach Level 5",
    icon: "Star",
    category: "milestone" as const,
    pointsReward: 200,
    rarity: "uncommon" as const,
    requirement: { type: "level_reached", threshold: 5 },
  },
  {
    key: "level_10",
    name: "Elite Operator",
    description: "Reach Level 10",
    icon: "Crown",
    category: "milestone" as const,
    pointsReward: 1000,
    rarity: "legendary" as const,
    requirement: { type: "level_reached", threshold: 10 },
  },
];

/** Whether the shared Drizzle client is available (mirrors `if (!db)` guards). */
export async function isDbAvailable(): Promise<boolean> {
  return (await getDb()) != null;
}

/** Seed the achievements table if it is empty, then return active achievements. */
export async function seedAndGetActiveAchievements() {
  const db = await getDb();
  if (!db) return null;

  // Seed if empty
  const existing = await db
    .select({ id: achievements.id })
    .from(achievements)
    .limit(1);
  if (existing.length === 0) {
    await db.insert(achievements).values(
      SEED_ACHIEVEMENTS.map(a => ({
        ...a,
        requirement: a.requirement,
      }))
    );
  }

  return db.select().from(achievements).where(eq(achievements.active, true));
}

export async function getUnlockedAchievements(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
    })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
}

export async function getActiveChallenges(now: Date) {
  const db = await getDb();
  if (!db) return null;

  return db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.active, true),
        lte(challenges.startsAt, now),
        gte(challenges.endsAt, now)
      )
    )
    .orderBy(challenges.endsAt);
}

export async function getChallengeProgressForChallenges(
  userId: number,
  challengeIds: number[]
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(challengeProgress)
    .where(
      and(
        eq(challengeProgress.userId, userId),
        inArray(challengeProgress.challengeId, challengeIds)
      )
    );
}

export async function getChallengeById(challengeId: number) {
  const db = await getDb();
  if (!db) return null;

  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  return challenge ?? null;
}

export async function getUserChallengeProgress(
  userId: number,
  challengeId: number
) {
  const db = await getDb();
  if (!db) return null;

  const [existing] = await db
    .select()
    .from(challengeProgress)
    .where(
      and(
        eq(challengeProgress.userId, userId),
        eq(challengeProgress.challengeId, challengeId)
      )
    )
    .limit(1);

  return existing ?? null;
}

export async function insertChallengeProgress(values: {
  userId: number;
  challengeId: number;
  progress: number;
  completed: boolean;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(challengeProgress).values(values);
}

export async function incrementChallengeParticipantCount(challengeId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(challenges)
    .set({ participantCount: sql`${challenges.participantCount} + 1` })
    .where(eq(challenges.id, challengeId));
}

export async function updateChallengeProgress(
  progressId: number,
  values: { progress: number; completed: boolean; completedAt?: Date }
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(challengeProgress)
    .set(values)
    .where(eq(challengeProgress.id, progressId));
}

export async function getTopLeaderboard() {
  const db = await getDb();
  if (!db) return null;

  return db
    .select({
      userId: userPoints.userId,
      totalPoints: userPoints.totalPoints,
      lifetimePoints: userPoints.lifetimePoints,
      level: userPoints.level,
      name: users.name,
    })
    .from(userPoints)
    .leftJoin(users, eq(userPoints.userId, users.id))
    .orderBy(desc(userPoints.lifetimePoints))
    .limit(10);
}

export async function getUserPoints(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [pts] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  return pts ?? null;
}

export async function getPointsHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId))
    .orderBy(desc(pointsTransactions.createdAt))
    .limit(10);
}

export async function insertChallenge(values: {
  name: string;
  description: string | undefined;
  type: "daily" | "weekly" | "monthly" | "one_time" | "community";
  category: "gig" | "finance" | "social" | "platform";
  goal: number;
  unit: string;
  pointsReward: number;
  bonusReward: string | undefined;
  startsAt: Date;
  endsAt: Date;
  maxParticipants: number | undefined;
}) {
  const db = await getDb();
  if (!db) return false;

  await db.insert(challenges).values(values);
  return true;
}
