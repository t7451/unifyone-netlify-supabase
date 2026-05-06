import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  achievements,
  userAchievements,
  challenges,
  challengeProgress,
  userPoints,
  pointsTransactions,
  users,
} from "../../drizzle/schema";
import { eq, desc, and, sql, lte, gte, inArray } from "drizzle-orm";
import {
  checkAndResolveFriendChallenges,
  resolveAllPendingFriendChallenges,
} from "../challengeCompletion";

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

export const gamificationRouter = router({
  // ── Achievements ─────────────────────────────────────────────────────────────
  getAchievements: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { all: [], unlocked: [] };

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

    const all = await db
      .select()
      .from(achievements)
      .where(eq(achievements.active, true));
    const unlocked = await db
      .select({
        achievementId: userAchievements.achievementId,
        unlockedAt: userAchievements.unlockedAt,
      })
      .from(userAchievements)
      .where(eq(userAchievements.userId, ctx.user.id));

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
  }),

  // ── Challenges ───────────────────────────────────────────────────────────────
  getActiveChallenges: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const active = await db
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

    if (active.length === 0) return [];

    const challengeIds = active.map(c => c.id);
    const progress = await db
      .select()
      .from(challengeProgress)
      .where(
        and(
          eq(challengeProgress.userId, ctx.user.id),
          inArray(challengeProgress.challengeId, challengeIds)
        )
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
  }),

  joinChallenge: protectedProcedure
    .input(z.object({ challengeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, input.challengeId))
        .limit(1);

      if (!challenge)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Challenge not found",
        });

      const [existing] = await db
        .select()
        .from(challengeProgress)
        .where(
          and(
            eq(challengeProgress.userId, ctx.user.id),
            eq(challengeProgress.challengeId, input.challengeId)
          )
        )
        .limit(1);

      if (existing)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already joined this challenge",
        });

      await db.insert(challengeProgress).values({
        userId: ctx.user.id,
        challengeId: input.challengeId,
        progress: 0,
        completed: false,
      });

      await db
        .update(challenges)
        .set({ participantCount: sql`${challenges.participantCount} + 1` })
        .where(eq(challenges.id, input.challengeId));

      await checkAndResolveFriendChallenges(input.challengeId, ctx.user.id);

      return { success: true };
    }),

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  getLeaderboard: protectedProcedure
    .input(z.object({ limit: z.number().min(5).max(50).default(10) }))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { leaderboard: [], myRank: null };

      const top = await db
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

      const myEntry = top.find(e => e.userId === ctx.user.id);
      const myRank = myEntry ? top.indexOf(myEntry) + 1 : null;

      return {
        leaderboard: top.map((e, i) => ({
          rank: i + 1,
          userId: e.userId,
          name: e.name ?? "Anonymous",
          totalPoints: e.totalPoints,
          lifetimePoints: e.lifetimePoints,
          level: e.level,
          isMe: e.userId === ctx.user.id,
        })),
        myRank,
      };
    }),

  // ── Points Summary ───────────────────────────────────────────────────────────
  getPointsSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      return {
        totalPoints: 0,
        lifetimePoints: 0,
        level: 1,
        streakDays: 0,
        nextLevelAt: 100,
        history: [],
      };

    const [pts] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, ctx.user.id))
      .limit(1);

    const history = await db
      .select()
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, ctx.user.id))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(10);

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
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const [existing] = await db
        .select()
        .from(challengeProgress)
        .where(
          and(
            eq(challengeProgress.userId, ctx.user.id),
            eq(challengeProgress.challengeId, input.challengeId)
          )
        )
        .limit(1);

      if (!existing)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Not joined this challenge",
        });
      if (existing.completed)
        return { alreadyCompleted: true, progress: existing.progress, goal: 0 };

      const [challengeDef] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, input.challengeId))
        .limit(1);

      if (!challengeDef)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Challenge not found",
        });

      const newProgress = Math.min(
        existing.progress + input.increment,
        challengeDef.goal
      );
      const nowCompleted = newProgress >= challengeDef.goal;

      await db
        .update(challengeProgress)
        .set({
          progress: newProgress,
          completed: nowCompleted,
          ...(nowCompleted ? { completedAt: new Date() } : {}),
        })
        .where(eq(challengeProgress.id, existing.id));

      await checkAndResolveFriendChallenges(input.challengeId, ctx.user.id);

      return {
        progress: newProgress,
        completed: nowCompleted,
        goal: challengeDef.goal,
      };
    }),

  // ── Admin: Resolve All Pending Friend Challenges ───────────────────────────
  /** Admin utility: scan and resolve all accepted friend challenges with undetected completions. */
  checkAllFriendChallenges: adminProcedure.mutation(async ({ ctx: _ctx }) => {
    const resolved = await resolveAllPendingFriendChallenges();
    return { resolved };
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
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      await db.insert(challenges).values({
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

      return { success: true };
    }),
});
