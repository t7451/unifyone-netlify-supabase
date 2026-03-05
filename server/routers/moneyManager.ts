import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  gigShifts, mileageLogs, financialRules, subscriptionEntitlements,
  userPoints, pointsTransactions,
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// IRS 2025 standard mileage rate (cents per mile)
const IRS_RATE_CENTS = 70;

// Points awarded per action
const POINTS = {
  shift_completed: 25,
  mileage_logged: 10,
  rule_created: 15,
  rule_triggered: 5,
};

async function awardPoints(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: number,
  action: string,
  points: number,
  description: string,
  referenceId?: string
) {
  if (!db) return;
  // Get or create user_points row
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
    action,
    description,
    referenceId,
    balanceAfter: newBalance,
  });

  return newBalance;
}

export const moneyManagerRouter = router({
  // ── Gig Shifts ──────────────────────────────────────────────────────────────
  startShift: protectedProcedure
    .input(z.object({
      platform: z.string().min(1).max(100),
      startLat: z.number().optional(),
      startLng: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [shift] = await db.insert(gigShifts).values({
        userId: ctx.user.id,
        platform: input.platform,
        startTime: new Date(),
        startLat: input.startLat?.toFixed(7),
        startLng: input.startLng?.toFixed(7),
        status: "active",
      }).$returningId();

      return { id: shift.id, startTime: new Date() };
    }),

  endShift: protectedProcedure
    .input(z.object({
      shiftId: z.number(),
      grossEarnings: z.number().min(0),
      tips: z.number().min(0).default(0),
      bonuses: z.number().min(0).default(0),
      totalMiles: z.number().min(0).default(0),
      endLat: z.number().optional(),
      endLng: z.number().optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [existing] = await db
        .select()
        .from(gigShifts)
        .where(and(eq(gigShifts.id, input.shiftId), eq(gigShifts.userId, ctx.user.id)))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
      if (existing.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Shift already ended" });

      const endTime = new Date();
      const durationMinutes = Math.round(
        (endTime.getTime() - new Date(existing.startTime).getTime()) / 60000
      );

      await db.update(gigShifts).set({
        endTime,
        durationMinutes,
        grossEarnings: input.grossEarnings.toFixed(2),
        tips: input.tips.toFixed(2),
        bonuses: input.bonuses.toFixed(2),
        totalMiles: input.totalMiles.toFixed(2),
        endLat: input.endLat?.toFixed(7),
        endLng: input.endLng?.toFixed(7),
        notes: input.notes,
        status: "completed",
      }).where(eq(gigShifts.id, input.shiftId));

      // Auto-log mileage if provided
      if (input.totalMiles > 0) {
        const deductionCents = Math.round(input.totalMiles * IRS_RATE_CENTS);
        await db.insert(mileageLogs).values({
          userId: ctx.user.id,
          shiftId: input.shiftId,
          date: endTime,
          miles: input.totalMiles.toFixed(2),
          purpose: "business",
          irsRateCents: IRS_RATE_CENTS,
          deductionCents,
        });
      }

      // Award points
      await awardPoints(
        db, ctx.user.id,
        "shift_completed",
        POINTS.shift_completed,
        `Completed ${existing.platform} shift — $${input.grossEarnings.toFixed(2)} earned`,
        String(input.shiftId)
      );

      return { success: true, durationMinutes };
    }),

  listShifts: protectedProcedure
    .input(z.object({
      platform: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { shifts: [], total: 0 };

      const conditions = [eq(gigShifts.userId, ctx.user.id)];
      if (input.platform) conditions.push(eq(gigShifts.platform, input.platform));
      if (input.startDate) conditions.push(gte(gigShifts.startTime, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(gigShifts.startTime, new Date(input.endDate)));

      const shifts = await db
        .select()
        .from(gigShifts)
        .where(and(...conditions))
        .orderBy(desc(gigShifts.startTime))
        .limit(input.limit)
        .offset(input.offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(gigShifts)
        .where(and(...conditions));

      return { shifts, total: Number(count) };
    }),

  getShiftStats: protectedProcedure
    .input(z.object({
      period: z.enum(["week", "month", "year", "all"]).default("month"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { totalEarnings: 0, totalMiles: 0, totalShifts: 0, totalHours: 0, avgPerHour: 0, taxDeduction: 0 };

      const now = new Date();
      let startDate: Date;
      if (input.period === "week") startDate = new Date(now.getTime() - 7 * 86400000);
      else if (input.period === "month") startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (input.period === "year") startDate = new Date(now.getFullYear(), 0, 1);
      else startDate = new Date(0);

      const shifts = await db
        .select()
        .from(gigShifts)
        .where(and(
          eq(gigShifts.userId, ctx.user.id),
          eq(gigShifts.status, "completed"),
          gte(gigShifts.startTime, startDate)
        ));

      const totalEarnings = shifts.reduce((s, r) =>
        s + Number(r.grossEarnings) + Number(r.tips) + Number(r.bonuses), 0);
      const totalMiles = shifts.reduce((s, r) => s + Number(r.totalMiles), 0);
      const totalMinutes = shifts.reduce((s, r) => s + (r.durationMinutes ?? 0), 0);
      const totalHours = totalMinutes / 60;
      const taxDeduction = (totalMiles * IRS_RATE_CENTS) / 100;

      return {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalMiles: Math.round(totalMiles * 10) / 10,
        totalShifts: shifts.length,
        totalHours: Math.round(totalHours * 10) / 10,
        avgPerHour: totalHours > 0 ? Math.round((totalEarnings / totalHours) * 100) / 100 : 0,
        taxDeduction: Math.round(taxDeduction * 100) / 100,
      };
    }),

  // ── Mileage Logs ────────────────────────────────────────────────────────────
  logMileage: protectedProcedure
    .input(z.object({
      miles: z.number().min(0.1),
      purpose: z.string().default("business"),
      date: z.string().optional(),
      startAddress: z.string().max(500).optional(),
      endAddress: z.string().max(500).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const deductionCents = Math.round(input.miles * IRS_RATE_CENTS);
      await db.insert(mileageLogs).values({
        userId: ctx.user.id,
        date: input.date ? new Date(input.date) : new Date(),
        miles: input.miles.toFixed(2),
        purpose: input.purpose,
        irsRateCents: IRS_RATE_CENTS,
        deductionCents,
        startAddress: input.startAddress,
        endAddress: input.endAddress,
        notes: input.notes,
      });

      await awardPoints(db, ctx.user.id, "mileage_logged", POINTS.mileage_logged,
        `Logged ${input.miles} miles — $${(deductionCents / 100).toFixed(2)} deduction`);

      return { deductionCents, deductionDollars: deductionCents / 100 };
    }),

  getMileageSummary: protectedProcedure
    .input(z.object({ year: z.number().default(new Date().getFullYear()) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { totalMiles: 0, totalDeduction: 0, logs: [] };

      const startOfYear = new Date(input.year, 0, 1);
      const endOfYear = new Date(input.year, 11, 31, 23, 59, 59);

      const logs = await db
        .select()
        .from(mileageLogs)
        .where(and(
          eq(mileageLogs.userId, ctx.user.id),
          gte(mileageLogs.date, startOfYear),
          lte(mileageLogs.date, endOfYear)
        ))
        .orderBy(desc(mileageLogs.date));

      const totalMiles = logs.reduce((s, r) => s + Number(r.miles), 0);
      const totalDeduction = logs.reduce((s, r) => s + r.deductionCents, 0) / 100;

      return { totalMiles: Math.round(totalMiles * 10) / 10, totalDeduction, logs };
    }),

  // ── Financial Rules ──────────────────────────────────────────────────────────
  listRules: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(financialRules)
      .where(eq(financialRules.userId, ctx.user.id))
      .orderBy(desc(financialRules.createdAt));
  }),

  createRule: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      type: z.enum(["auto_save", "budget_cap", "alert", "allocation", "goal"]),
      triggerType: z.enum(["income_received", "expense_over", "balance_below", "balance_above", "scheduled", "manual"]),
      triggerValue: z.number().optional(),
      actionType: z.enum(["transfer", "notify", "block", "tag", "save"]),
      actionValue: z.number().optional(),
      actionPercent: z.number().min(0).max(100).optional(),
      category: z.string().optional(),
      platform: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.insert(financialRules).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        type: input.type,
        triggerType: input.triggerType,
        triggerValue: input.triggerValue?.toFixed(2),
        actionType: input.actionType,
        actionValue: input.actionValue?.toFixed(2),
        actionPercent: input.actionPercent?.toFixed(2),
        category: input.category,
        platform: input.platform,
      });

      await awardPoints(db, ctx.user.id, "rule_created", POINTS.rule_created,
        `Created financial rule: ${input.name}`);

      return { success: true };
    }),

  toggleRule: protectedProcedure
    .input(z.object({ ruleId: z.number(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(financialRules)
        .set({ enabled: input.enabled })
        .where(and(eq(financialRules.id, input.ruleId), eq(financialRules.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteRule: protectedProcedure
    .input(z.object({ ruleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(financialRules)
        .where(and(eq(financialRules.id, input.ruleId), eq(financialRules.userId, ctx.user.id)));
      return { success: true };
    }),

  // ── Subscription Entitlements ────────────────────────────────────────────────
  getEntitlement: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [ent] = await db
      .select()
      .from(subscriptionEntitlements)
      .where(and(
        eq(subscriptionEntitlements.userId, ctx.user.id),
        eq(subscriptionEntitlements.status, "active")
      ))
      .orderBy(desc(subscriptionEntitlements.createdAt))
      .limit(1);
    return ent ?? null;
  }),

  // ── Points Balance ───────────────────────────────────────────────────────────
  getPointsBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalPoints: 0, lifetimePoints: 0, level: 1, streakDays: 0 };
    const [pts] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, ctx.user.id))
      .limit(1);
    return pts ?? { totalPoints: 0, lifetimePoints: 0, level: 1, streakDays: 0 };
  }),

  getPointsHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(pointsTransactions)
        .where(eq(pointsTransactions.userId, ctx.user.id))
        .orderBy(desc(pointsTransactions.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),
});
