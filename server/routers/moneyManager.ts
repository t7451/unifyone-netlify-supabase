import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  gigShifts,
  mileageLogs,
  financialRules,
  subscriptionEntitlements,
  userPoints,
  pointsTransactions,
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { checkAndResolveFriendChallenge } from "../challengeCompletion";
import { getAppUrl } from "../_core/env";
import { invokeLLM } from "../_core/llm";

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
    .input(
      z.object({
        platform: z.string().min(1).max(100),
        startLat: z.number().optional(),
        startLng: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const [shift] = await db
        .insert(gigShifts)
        .values({
          userId: ctx.user.id,
          platform: input.platform,
          startTime: new Date(),
          startLat: input.startLat?.toFixed(7),
          startLng: input.startLng?.toFixed(7),
          status: "active",
        })
        .returning({ id: gigShifts.id });

      return { id: shift.id, startTime: new Date() };
    }),

  endShift: protectedProcedure
    .input(
      z.object({
        shiftId: z.number(),
        grossEarnings: z.number().min(0),
        tips: z.number().min(0).default(0),
        bonuses: z.number().min(0).default(0),
        totalMiles: z.number().min(0).default(0),
        endLat: z.number().optional(),
        endLng: z.number().optional(),
        notes: z.string().max(1000).optional(),
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
        .from(gigShifts)
        .where(
          and(
            eq(gigShifts.id, input.shiftId),
            eq(gigShifts.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
      if (existing.status !== "active")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Shift already ended",
        });

      const endTime = new Date();
      const durationMinutes = Math.round(
        (endTime.getTime() - new Date(existing.startTime).getTime()) / 60000
      );

      await db
        .update(gigShifts)
        .set({
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
        })
        .where(eq(gigShifts.id, input.shiftId));

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
        db,
        ctx.user.id,
        "shift_completed",
        POINTS.shift_completed,
        `Completed ${existing.platform} shift — $${input.grossEarnings.toFixed(2)} earned`,
        String(input.shiftId)
      );

      // Auto-detect friend challenge completion for any challenge the user has joined
      try {
        const { challengeProgress: cpTable } = await import(
          "../../drizzle/schema"
        );
        const joined = await db
          .select({ challengeId: cpTable.challengeId })
          .from(cpTable)
          .where(eq(cpTable.userId, ctx.user.id));
        for (const { challengeId } of joined) {
          await checkAndResolveFriendChallenge(challengeId, ctx.user.id);
        }
      } catch {
        /* non-critical: don't fail shift end if completion check errors */
      }

      // Fire Meta CAPI GigShiftCompleted event (non-blocking)
      try {
        const { capi } = await import("../meta/capi");
        const capiEventId = `shift-${input.shiftId}-${Date.now()}`;
        await capi.custom(
          "GigShiftCompleted",
          capiEventId,
          {
            externalId: String(ctx.user.id),
            email: ctx.user.email ?? undefined,
          },
          `${getAppUrl()}/gig-command`,
          {
            duration_minutes: durationMinutes,
            gross_earnings: input.grossEarnings,
            platform: existing.platform,
          }
        );
      } catch {
        /* CAPI failure is non-critical */
      }

      // Evaluate user financial rules against this income event (non-blocking)
      try {
        const totalEarningsCents = Math.round(
          (Number(input.grossEarnings) +
            Number(input.tips) +
            Number(input.bonuses)) *
            100
        );
        if (totalEarningsCents > 0) {
          const { evaluateRulesForEvent } = await import("../lib/ruleEngine");
          await evaluateRulesForEvent({
            userId: ctx.user.id,
            event: {
              type: "income_received",
              amountCents: totalEarningsCents,
              platform: existing.platform,
            },
          });
        }
      } catch (e) {
        console.error("[moneyManager.endShift] Rule engine failed:", e);
        // Non-blocking: shift still completes successfully
      }

      return { success: true, durationMinutes };
    }),

  listShifts: protectedProcedure
    .input(
      z.object({
        platform: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { shifts: [], total: 0 };

      const conditions = [eq(gigShifts.userId, ctx.user.id)];
      if (input.platform)
        conditions.push(eq(gigShifts.platform, input.platform));
      if (input.startDate)
        conditions.push(gte(gigShifts.startTime, new Date(input.startDate)));
      if (input.endDate)
        conditions.push(lte(gigShifts.startTime, new Date(input.endDate)));

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
    .input(
      z.object({
        period: z.enum(["week", "month", "year", "all"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return {
          totalEarnings: 0,
          totalMiles: 0,
          totalShifts: 0,
          totalHours: 0,
          avgPerHour: 0,
          taxDeduction: 0,
        };

      const now = new Date();
      let startDate: Date;
      if (input.period === "week")
        startDate = new Date(now.getTime() - 7 * 86400000);
      else if (input.period === "month")
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (input.period === "year")
        startDate = new Date(now.getFullYear(), 0, 1);
      else startDate = new Date(0);

      const shifts = await db
        .select()
        .from(gigShifts)
        .where(
          and(
            eq(gigShifts.userId, ctx.user.id),
            eq(gigShifts.status, "completed"),
            gte(gigShifts.startTime, startDate)
          )
        );

      const totalEarnings = shifts.reduce(
        (s, r) =>
          s + Number(r.grossEarnings) + Number(r.tips) + Number(r.bonuses),
        0
      );
      const totalMiles = shifts.reduce((s, r) => s + Number(r.totalMiles), 0);
      const totalMinutes = shifts.reduce(
        (s, r) => s + (r.durationMinutes ?? 0),
        0
      );
      const totalHours = totalMinutes / 60;
      const taxDeduction = (totalMiles * IRS_RATE_CENTS) / 100;

      return {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalMiles: Math.round(totalMiles * 10) / 10,
        totalShifts: shifts.length,
        totalHours: Math.round(totalHours * 10) / 10,
        avgPerHour:
          totalHours > 0
            ? Math.round((totalEarnings / totalHours) * 100) / 100
            : 0,
        taxDeduction: Math.round(taxDeduction * 100) / 100,
      };
    }),

  // ── Mileage Logs ────────────────────────────────────────────────────────────
  logMileage: protectedProcedure
    .input(
      z.object({
        miles: z.number().min(0.1),
        purpose: z.string().default("business"),
        date: z.string().optional(),
        startAddress: z.string().max(500).optional(),
        endAddress: z.string().max(500).optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

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

      await awardPoints(
        db,
        ctx.user.id,
        "mileage_logged",
        POINTS.mileage_logged,
        `Logged ${input.miles} miles — $${(deductionCents / 100).toFixed(2)} deduction`
      );

      // Auto-detect friend challenge completion for mileage-based challenges
      try {
        const { challengeProgress: cpTable } = await import(
          "../../drizzle/schema"
        );
        const joined = await db
          .select({ challengeId: cpTable.challengeId })
          .from(cpTable)
          .where(eq(cpTable.userId, ctx.user.id));
        for (const { challengeId } of joined) {
          await checkAndResolveFriendChallenge(challengeId, ctx.user.id);
        }
      } catch {
        /* non-critical */
      }

      // Fire Meta CAPI MileageLogged event (non-blocking)
      try {
        const { capi } = await import("../meta/capi");
        const capiEventId = `mileage-${ctx.user.id}-${Date.now()}`;
        await capi.custom(
          "MileageLogged",
          capiEventId,
          {
            externalId: String(ctx.user.id),
            email: ctx.user.email ?? undefined,
          },
          `${getAppUrl()}/gig-command`,
          { miles: input.miles, deduction_dollars: deductionCents / 100 }
        );
      } catch {
        /* CAPI failure is non-critical */
      }

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
        .where(
          and(
            eq(mileageLogs.userId, ctx.user.id),
            gte(mileageLogs.date, startOfYear),
            lte(mileageLogs.date, endOfYear)
          )
        )
        .orderBy(desc(mileageLogs.date));

      const totalMiles = logs.reduce((s, r) => s + Number(r.miles), 0);
      const totalDeduction =
        logs.reduce((s, r) => s + r.deductionCents, 0) / 100;

      return {
        totalMiles: Math.round(totalMiles * 10) / 10,
        totalDeduction,
        logs,
      };
    }),

  // ── Financial Rules ──────────────────────────────────────────────────────────
  listRules: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(financialRules)
      .where(eq(financialRules.userId, ctx.user.id))
      .orderBy(desc(financialRules.createdAt));
  }),

  createRule: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        type: z.enum([
          "auto_save",
          "budget_cap",
          "alert",
          "allocation",
          "goal",
        ]),
        triggerType: z.enum([
          "income_received",
          "expense_over",
          "balance_below",
          "balance_above",
          "scheduled",
          "manual",
        ]),
        triggerValue: z.number().optional(),
        actionType: z.enum(["transfer", "notify", "block", "tag", "save"]),
        actionValue: z.number().optional(),
        actionPercent: z.number().min(0).max(100).optional(),
        category: z.string().optional(),
        platform: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

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

      await awardPoints(
        db,
        ctx.user.id,
        "rule_created",
        POINTS.rule_created,
        `Created financial rule: ${input.name}`
      );

      // Auto-detect friend challenge completion for rule-based challenges
      try {
        const { challengeProgress: cpTable } = await import(
          "../../drizzle/schema"
        );
        const joined = await db
          .select({ challengeId: cpTable.challengeId })
          .from(cpTable)
          .where(eq(cpTable.userId, ctx.user.id));
        for (const { challengeId } of joined) {
          await checkAndResolveFriendChallenge(challengeId, ctx.user.id);
        }
      } catch {
        /* non-critical */
      }

      return { success: true };
    }),

  toggleRule: protectedProcedure
    .input(z.object({ ruleId: z.number(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db
        .update(financialRules)
        .set({ enabled: input.enabled })
        .where(
          and(
            eq(financialRules.id, input.ruleId),
            eq(financialRules.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  deleteRule: protectedProcedure
    .input(z.object({ ruleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      await db
        .delete(financialRules)
        .where(
          and(
            eq(financialRules.id, input.ruleId),
            eq(financialRules.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // ── Subscription Entitlements ────────────────────────────────────────────────
  getEntitlement: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [ent] = await db
      .select()
      .from(subscriptionEntitlements)
      .where(
        and(
          eq(subscriptionEntitlements.userId, ctx.user.id),
          eq(subscriptionEntitlements.status, "active")
        )
      )
      .orderBy(desc(subscriptionEntitlements.createdAt))
      .limit(1);
    return ent ?? null;
  }),

  // ── Points Balance ───────────────────────────────────────────────────────────
  getPointsBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      return { totalPoints: 0, lifetimePoints: 0, level: 1, streakDays: 0 };
    const [pts] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, ctx.user.id))
      .limit(1);
    return (
      pts ?? { totalPoints: 0, lifetimePoints: 0, level: 1, streakDays: 0 }
    );
  }),

  getPointsHistory: protectedProcedure
    .input(
      z.object({ limit: z.number().default(20), offset: z.number().default(0) })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, ctx.user.id))
        .orderBy(desc(pointsTransactions.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // ── Gig Command: GPS & Route ─────────────────────────────────────────────────
  getActiveShift: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [shift] = await db
      .select()
      .from(gigShifts)
      .where(
        and(eq(gigShifts.userId, ctx.user.id), eq(gigShifts.status, "active"))
      )
      .orderBy(desc(gigShifts.startTime))
      .limit(1);
    return shift ?? null;
  }),

  updateShiftGPS: protectedProcedure
    .input(
      z.object({
        shiftId: z.number(),
        lat: z.number(),
        lng: z.number(),
        appendWaypoint: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [shift] = await db
        .select()
        .from(gigShifts)
        .where(
          and(
            eq(gigShifts.id, input.shiftId),
            eq(gigShifts.userId, ctx.user.id),
            eq(gigShifts.status, "active")
          )
        )
        .limit(1);

      if (!shift)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active shift not found",
        });

      const waypoints: Array<{ lat: number; lng: number; ts: number }> =
        (shift.routeWaypoints as Array<{
          lat: number;
          lng: number;
          ts: number;
        }>) ?? [];

      if (input.appendWaypoint) {
        waypoints.push({ lat: input.lat, lng: input.lng, ts: Date.now() });
      }

      await db
        .update(gigShifts)
        .set({ routeWaypoints: waypoints })
        .where(eq(gigShifts.id, input.shiftId));

      return { ok: true, waypointCount: waypoints.length };
    }),

  getRouteIntelligence: protectedProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        platform: z.string().default("any"),
        radiusMiles: z.number().default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      // Pull user's last 30 shifts for context
      const recentShifts = await db
        .select()
        .from(gigShifts)
        .where(
          and(
            eq(gigShifts.userId, ctx.user.id),
            eq(gigShifts.status, "completed")
          )
        )
        .orderBy(desc(gigShifts.startTime))
        .limit(30);

      const avgEarnings =
        recentShifts.length > 0
          ? recentShifts.reduce(
              (s, r) => s + parseFloat(r.grossEarnings as string),
              0
            ) / recentShifts.length
          : 0;
      const avgMiles =
        recentShifts.length > 0
          ? recentShifts.reduce(
              (s, r) => s + parseFloat(r.totalMiles as string),
              0
            ) / recentShifts.length
          : 0;

      const hour = new Date().getHours();
      const dayOfWeek = new Date().toLocaleDateString("en-US", {
        weekday: "long",
      });

      const prompt = `You are a gig economy route intelligence assistant. Based on the following data, provide actionable zone recommendations and tips.

Current location: lat ${input.lat.toFixed(4)}, lng ${input.lng.toFixed(4)}
Platform: ${input.platform}
Radius: ${input.radiusMiles} miles
Time: ${hour}:00 ${dayOfWeek}
User's avg earnings per shift: $${avgEarnings.toFixed(2)}
User's avg miles per shift: ${avgMiles.toFixed(1)} miles
Total completed shifts: ${recentShifts.length}

Provide a JSON response with:
1. hotZones: array of 3 recommended zone names near this location with demand level (high/medium/low) and reason
2. timingTip: one sentence about optimal timing right now
3. earningsTip: one sentence to improve earnings based on their history
4. weatherAlert: null or a brief weather-related tip
5. estimatedDemand: "high" | "medium" | "low" for current time/location`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a gig economy intelligence assistant. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "route_intelligence",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  hotZones: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        demand: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                        reason: { type: "string" },
                      },
                      required: ["name", "demand", "reason"],
                      additionalProperties: false,
                    },
                  },
                  timingTip: { type: "string" },
                  earningsTip: { type: "string" },
                  weatherAlert: { type: ["string", "null"] },
                  estimatedDemand: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                  },
                },
                required: [
                  "hotZones",
                  "timingTip",
                  "earningsTip",
                  "weatherAlert",
                  "estimatedDemand",
                ],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response?.choices?.[0]?.message?.content;
        const contentStr = typeof content === "string" ? content : null;
        return contentStr ? JSON.parse(contentStr) : null;
      } catch {
        return null;
      }
    }),
  generateAIShortcuts: protectedProcedure
    .input(z.object({ platform: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const recentShifts = await db
        .select()
        .from(gigShifts)
        .where(
          and(
            eq(gigShifts.userId, ctx.user.id),
            eq(gigShifts.status, "completed")
          )
        )
        .orderBy(desc(gigShifts.startTime))
        .limit(20);

      const recentMileage = await db
        .select()
        .from(mileageLogs)
        .where(eq(mileageLogs.userId, ctx.user.id))
        .orderBy(desc(mileageLogs.date))
        .limit(10);

      const totalEarnings = recentShifts.reduce(
        (s, r) => s + parseFloat(r.grossEarnings as string),
        0
      );
      const totalMiles = recentMileage.reduce(
        (s, r) => s + parseFloat(r.miles as string),
        0
      );
      const totalHours =
        recentShifts.reduce((s, r) => s + (r.durationMinutes ?? 0), 0) / 60;
      const earningsPerHour = totalHours > 0 ? totalEarnings / totalHours : 0;

      const prompt = `You are a gig economy coach. Based on this driver's recent performance, generate 5 specific, actionable shortcuts or tips.

Platform: ${input.platform ?? "multi-platform"}
Recent shifts: ${recentShifts.length}
Total earnings (last 20 shifts): $${totalEarnings.toFixed(2)}
Total miles logged: ${totalMiles.toFixed(1)}
Avg earnings/hour: $${earningsPerHour.toFixed(2)}

Generate 5 shortcuts as a JSON array. Each shortcut has:
- title: short action title (max 6 words)
- description: one sentence explaining the tip
- category: "earnings" | "efficiency" | "tax" | "timing" | "safety"
- impact: "high" | "medium" | "low"
- emoji: single relevant emoji`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a gig economy performance coach. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ai_shortcuts",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  shortcuts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        category: {
                          type: "string",
                          enum: [
                            "earnings",
                            "efficiency",
                            "tax",
                            "timing",
                            "safety",
                          ],
                        },
                        impact: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                        emoji: { type: "string" },
                      },
                      required: [
                        "title",
                        "description",
                        "category",
                        "impact",
                        "emoji",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["shortcuts"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response?.choices?.[0]?.message?.content;
        const contentStr = typeof content === "string" ? content : null;
        if (!contentStr) return [];
        const parsed = JSON.parse(contentStr);
        return parsed.shortcuts ?? [];
      } catch {
        return [];
      }
    }),

  // ── GigIQ Intelligence Layer ──────────────────────────────────────────────
  // These procedures power the shift intelligence + deduction dashboard.
  // They read from existing gigShifts + mileageLogs data — no new tables needed.

  /**
   * Per-platform, per-hour, per-day breakdown.
   * Returns the data Kai needs to give dollar-specific recommendations:
   * "Your Thursday 5–9pm shifts average $31.20/hr vs $21.90/hr Monday mornings."
   */
  getShiftBreakdown: protectedProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "year", "all"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return {
          byPlatform: [],
          byHour: [],
          byDayOfWeek: [],
          topInsight: null,
        };

      const now = new Date();
      let startDate: Date;
      if (input.period === "week")
        startDate = new Date(now.getTime() - 7 * 86400000);
      else if (input.period === "month")
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (input.period === "year")
        startDate = new Date(now.getFullYear(), 0, 1);
      else startDate = new Date(0);

      const shifts = await db
        .select()
        .from(gigShifts)
        .where(
          and(
            eq(gigShifts.userId, ctx.user.id),
            eq(gigShifts.status, "completed"),
            gte(gigShifts.startTime, startDate)
          )
        )
        .orderBy(desc(gigShifts.startTime));

      if (shifts.length === 0) {
        return {
          byPlatform: [],
          byHour: [],
          byDayOfWeek: [],
          topInsight: null,
        };
      }

      // Per-platform aggregation
      const platformMap: Record<
        string,
        { earnings: number; hours: number; shifts: number; miles: number }
      > = {};
      for (const s of shifts) {
        const p = s.platform;
        if (!platformMap[p])
          platformMap[p] = { earnings: 0, hours: 0, shifts: 0, miles: 0 };
        const totalEarned =
          Number(s.grossEarnings) + Number(s.tips) + Number(s.bonuses);
        const hours = (s.durationMinutes ?? 0) / 60;
        platformMap[p].earnings += totalEarned;
        platformMap[p].hours += hours;
        platformMap[p].shifts += 1;
        platformMap[p].miles += Number(s.totalMiles);
      }
      const byPlatform = Object.entries(platformMap)
        .map(([platform, v]) => ({
          platform,
          totalEarnings: Math.round(v.earnings * 100) / 100,
          totalHours: Math.round(v.hours * 10) / 10,
          avgPerHour:
            v.hours > 0 ? Math.round((v.earnings / v.hours) * 100) / 100 : 0,
          totalShifts: v.shifts,
          totalMiles: Math.round(v.miles * 10) / 10,
        }))
        .sort((a, b) => b.avgPerHour - a.avgPerHour);

      // Per-hour-of-day aggregation (0-23)
      const hourMap: Record<
        number,
        { earnings: number; hours: number; count: number }
      > = {};
      for (const s of shifts) {
        const h = s.startTime.getHours();
        if (!hourMap[h]) hourMap[h] = { earnings: 0, hours: 0, count: 0 };
        hourMap[h].earnings +=
          Number(s.grossEarnings) + Number(s.tips) + Number(s.bonuses);
        hourMap[h].hours += (s.durationMinutes ?? 0) / 60;
        hourMap[h].count += 1;
      }
      const byHour = Object.entries(hourMap)
        .map(([hour, v]) => ({
          hour: Number(hour),
          label: `${Number(hour) % 12 || 12}${Number(hour) < 12 ? "am" : "pm"}`,
          avgPerHour:
            v.hours > 0 ? Math.round((v.earnings / v.hours) * 100) / 100 : 0,
          totalEarnings: Math.round(v.earnings * 100) / 100,
          shiftCount: v.count,
        }))
        .sort((a, b) => a.hour - b.hour);

      // Per-day-of-week aggregation (0=Sun, 6=Sat)
      const DAYS = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayMap: Record<
        number,
        { earnings: number; hours: number; count: number }
      > = {};
      for (const s of shifts) {
        const d = s.startTime.getDay();
        if (!dayMap[d]) dayMap[d] = { earnings: 0, hours: 0, count: 0 };
        dayMap[d].earnings +=
          Number(s.grossEarnings) + Number(s.tips) + Number(s.bonuses);
        dayMap[d].hours += (s.durationMinutes ?? 0) / 60;
        dayMap[d].count += 1;
      }
      const byDayOfWeek = Object.entries(dayMap)
        .map(([day, v]) => ({
          day: Number(day),
          label: DAYS[Number(day)],
          avgPerHour:
            v.hours > 0 ? Math.round((v.earnings / v.hours) * 100) / 100 : 0,
          totalEarnings: Math.round(v.earnings * 100) / 100,
          shiftCount: v.count,
        }))
        .sort((a, b) => a.day - b.day);

      // Top insight: best vs worst platform/time for Kai context
      let topInsight: string | null = null;
      if (byPlatform.length >= 2) {
        const best = byPlatform[0];
        const worst = byPlatform[byPlatform.length - 1];
        if (best.avgPerHour > 0 && worst.avgPerHour > 0) {
          const diff = best.avgPerHour - worst.avgPerHour;
          topInsight = `Your ${best.platform} shifts average $${best.avgPerHour}/hr vs $${worst.avgPerHour}/hr on ${worst.platform} — a $${diff.toFixed(2)}/hr gap.`;
        }
      } else if (byHour.length >= 2) {
        const bestHour = [...byHour].sort(
          (a, b) => b.avgPerHour - a.avgPerHour
        )[0];
        topInsight = `Your best earning hour is ${bestHour.label} at $${bestHour.avgPerHour}/hr average.`;
      }

      return { byPlatform, byHour, byDayOfWeek, topInsight };
    }),

  /**
   * YTD deduction widget — the "aha moment" stat.
   * Returns current year mileage deduction, quarterly estimate,
   * and whether the user should be prompted to upgrade.
   */
  getYTDDeduction: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const IRS_RATE = 0.7; // 2025
    if (!db)
      return {
        ytdMiles: 0,
        ytdDeduction: 0,
        projectedYearlyDeduction: 0,
        projectedYearlyMiles: 0,
        quarterlyEstimate: 0,
        missedDeduction: 0,
        shouldUpgradePrompt: false,
      };

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Pull completed shifts for miles from gigShifts (more accurate than mileageLogs)
    const shifts = await db
      .select({
        totalMiles: gigShifts.totalMiles,
        startTime: gigShifts.startTime,
      })
      .from(gigShifts)
      .where(
        and(
          eq(gigShifts.userId, ctx.user.id),
          eq(gigShifts.status, "completed"),
          gte(gigShifts.startTime, startOfYear)
        )
      );

    // Also pull mileageLogs for manually logged miles
    const { mileageLogs } = await import("../../drizzle/schema");
    const manualLogs = await db
      .select({ miles: mileageLogs.miles })
      .from(mileageLogs)
      .where(
        and(
          eq(mileageLogs.userId, ctx.user.id),
          gte(mileageLogs.date, startOfYear)
        )
      );

    const shiftMiles = shifts.reduce((s, r) => s + Number(r.totalMiles), 0);
    const manualMiles = manualLogs.reduce((s, r) => s + Number(r.miles), 0);
    const ytdMiles = Math.round((shiftMiles + manualMiles) * 10) / 10;
    const ytdDeduction = Math.round(ytdMiles * IRS_RATE * 100) / 100;

    // Project to year end based on pace so far
    const dayOfYear = Math.ceil(
      (now.getTime() - startOfYear.getTime()) / 86400000
    );
    const daysInYear = now.getFullYear() % 4 === 0 ? 366 : 365;
    const dailyRate = dayOfYear > 0 ? ytdMiles / dayOfYear : 0;
    const projectedYearlyMiles = Math.round(dailyRate * daysInYear * 10) / 10;
    const projectedYearlyDeduction =
      Math.round(projectedYearlyMiles * IRS_RATE * 100) / 100;

    // Quarterly estimate (simple: YTD / quarters elapsed * 4)
    const quarterElapsed = Math.ceil((now.getMonth() + 1) / 3);
    const quarterlyEstimate =
      Math.round((ytdDeduction / Math.max(quarterElapsed, 1)) * 100) / 100;

    // Missed deduction estimate: average gig worker claims $3,200/yr
    // If they're on track for less than $1,000, prompt upgrade for full tracking
    const missedDeduction = Math.max(
      0,
      Math.round((3200 - projectedYearlyDeduction) * 100) / 100
    );
    const shouldUpgradePrompt =
      shifts.length >= 5 && projectedYearlyDeduction < 1000;

    return {
      ytdMiles,
      ytdDeduction,
      projectedYearlyMiles,
      projectedYearlyDeduction,
      quarterlyEstimate,
      missedDeduction,
      shouldUpgradePrompt,
    };
  }),

  /**
   * Comprehensive tax estimate: SE tax, federal income tax, quarterly payment due.
   * Uses YTD gigShifts gross + mileageLogs deductions to project annual obligations.
   */
  getTaxEstimate: protectedProcedure
    .input(
      z
        .object({ bracketRate: z.number().min(0).max(0.5).optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return null;
      }
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const dayOfYear = Math.ceil(
        (now.getTime() - startOfYear.getTime()) / 86400000
      );
      const daysInYear = now.getFullYear() % 4 === 0 ? 366 : 365;

      const shifts = await db
        .select({
          grossEarnings: gigShifts.grossEarnings,
          tips: gigShifts.tips,
          bonuses: gigShifts.bonuses,
          totalMiles: gigShifts.totalMiles,
        })
        .from(gigShifts)
        .where(
          and(
            eq(gigShifts.userId, ctx.user.id),
            eq(gigShifts.status, "completed"),
            gte(gigShifts.startTime, startOfYear)
          )
        );

      const { mileageLogs } = await import("../../drizzle/schema");
      const manualLogs = await db
        .select({
          deductionCents: mileageLogs.deductionCents,
          miles: mileageLogs.miles,
        })
        .from(mileageLogs)
        .where(
          and(
            eq(mileageLogs.userId, ctx.user.id),
            gte(mileageLogs.date, startOfYear)
          )
        );

      const ytdGrossCents = Math.round(
        shifts.reduce(
          (s, r) =>
            s + Number(r.grossEarnings) + Number(r.tips) + Number(r.bonuses),
          0
        ) * 100
      );
      const shiftMiles = shifts.reduce((s, r) => s + Number(r.totalMiles), 0);
      const ytdMileageDeductionCents =
        Math.round(shiftMiles * 70) +
        manualLogs.reduce((s, r) => s + r.deductionCents, 0);

      const {
        computeAnnualProjection,
        computeQuarterlyEstimate,
        getNextQuarterlyDueDate,
        TAX_CONSTANTS,
      } = await import("../lib/taxEstimator");

      const annualProjection = computeAnnualProjection({
        ytdGrossCents,
        ytdMileageDeductionCents,
        dayOfYear,
        daysInYear,
        bracketRate: input?.bracketRate,
      });

      const ytdNetCents = Math.max(0, ytdGrossCents - ytdMileageDeductionCents);
      const quartersElapsed = Math.min(
        4,
        Math.max(1, Math.ceil((now.getMonth() + 1) / 3))
      ) as 1 | 2 | 3 | 4;
      const quarterly = computeQuarterlyEstimate(
        ytdNetCents,
        quartersElapsed,
        input?.bracketRate ?? TAX_CONSTANTS.DEFAULT_FED_BRACKET
      );
      const nextDue = getNextQuarterlyDueDate(now);

      return {
        ytdGrossCents,
        ytdMileageDeductionCents,
        ytdNetCents,
        annualProjection,
        quarterly: {
          ...quarterly,
          quarter: nextDue.quarter,
          dueDate: nextDue.dueDate.toISOString(),
        },
        bracketRate: input?.bracketRate ?? TAX_CONSTANTS.DEFAULT_FED_BRACKET,
      };
    }),

  /**
   * Kai-ready data context for gig-command and money-manager pages.
   * Returns a compact JSON string the AI system prompt can inject directly.
   */
  getKaiContext: protectedProcedure
    .input(
      z.object({
        context: z.enum(["gig-command", "money-manager", "dashboard"]),
      })
    )
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { contextJson: "{}", hasSufficientData: false };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const IRS_RATE = 0.7;

      // Core stats
      const allShifts = await db
        .select()
        .from(gigShifts)
        .where(
          and(
            eq(gigShifts.userId, ctx.user.id),
            eq(gigShifts.status, "completed")
          )
        )
        .orderBy(desc(gigShifts.startTime))
        .limit(50);

      if (allShifts.length === 0) {
        return {
          contextJson: JSON.stringify({ message: "No shifts logged yet." }),
          hasSufficientData: false,
        };
      }

      const monthShifts = allShifts.filter(s => s.startTime >= startOfMonth);
      const yearShifts = allShifts.filter(s => s.startTime >= startOfYear);

      const earnings = (arr: typeof allShifts) =>
        arr.reduce(
          (s, r) =>
            s + Number(r.grossEarnings) + Number(r.tips) + Number(r.bonuses),
          0
        );
      const hours = (arr: typeof allShifts) =>
        arr.reduce((s, r) => s + (r.durationMinutes ?? 0), 0) / 60;
      const miles = (arr: typeof allShifts) =>
        arr.reduce((s, r) => s + Number(r.totalMiles), 0);

      // Per-platform this month
      const platformMap: Record<string, { e: number; h: number }> = {};
      for (const s of monthShifts) {
        if (!platformMap[s.platform]) platformMap[s.platform] = { e: 0, h: 0 };
        platformMap[s.platform].e +=
          Number(s.grossEarnings) + Number(s.tips) + Number(s.bonuses);
        platformMap[s.platform].h += (s.durationMinutes ?? 0) / 60;
      }
      const platforms = Object.entries(platformMap)
        .map(([p, v]) => ({
          platform: p,
          avgPerHour: v.h > 0 ? Math.round((v.e / v.h) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.avgPerHour - a.avgPerHour);

      const monthEarnings = earnings(monthShifts);
      const monthHours = hours(monthShifts);
      const yearMiles = miles(yearShifts);

      const ctx_data = {
        period: "this month",
        totalEarnings: Math.round(monthEarnings * 100) / 100,
        totalHours: Math.round(monthHours * 10) / 10,
        avgPerHour:
          monthHours > 0
            ? Math.round((monthEarnings / monthHours) * 100) / 100
            : 0,
        totalShifts: monthShifts.length,
        ytdMiles: Math.round(yearMiles * 10) / 10,
        ytdDeduction: Math.round(yearMiles * IRS_RATE * 100) / 100,
        platforms,
        topPlatform: platforms[0]?.platform ?? null,
        lowestPlatform: platforms[platforms.length - 1]?.platform ?? null,
        lifetimeShifts: allShifts.length,
      };

      return {
        contextJson: JSON.stringify(ctx_data, null, 2),
        hasSufficientData: allShifts.length >= 3,
      };
    }),

  /**
   * Earnings anomaly detection: flags platforms where the user's recent $/hr
   * has deviated significantly from their baseline.
   */
  getAnomalies: protectedProcedure
    .input(
      z
        .object({
          lookbackDays: z.number().min(7).max(180).default(30),
          recentSampleSize: z.number().min(2).max(10).default(3),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { detectAnomalies } = await import("../lib/earningsAnomaly");
      return detectAnomalies({
        userId: ctx.user.id,
        lookbackDays: input?.lookbackDays,
        recentSampleSize: input?.recentSampleSize,
      });
    }),
});
