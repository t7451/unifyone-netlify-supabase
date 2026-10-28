/**
 * server/routers/moneyManager/shifts.service.ts
 *
 * Gig-shift use-cases: start/end/list/stats, active-shift lookup, GPS
 * waypoint updates, route intelligence + AI shortcuts (LLM-backed), and the
 * GigIQ breakdown / YTD / Kai context reads. Computations are preserved
 * byte-identical from the original router.
 */

import { TRPCError } from "@trpc/server";
import type { SQL } from "drizzle-orm";
import { eq, gte, lte } from "drizzle-orm";
import { getAppUrl } from "../../_core/env";
import {
  FREE_TIER_FALLBACK_CHAIN,
  GROQ_FALLBACK_MODEL,
  invokeLLM,
} from "../../_core/llm";
import { broadcastToUser } from "../../_core/sseManager";
import { checkAndResolveFriendChallengesForUser } from "../../challengeCompletion";
import * as repo from "./moneyManager.repo";
import { gigShifts } from "../../../drizzle/schema";
import { awardPoints, POINTS } from "./points.service";
import { mileageTaxService } from "./mileageTax.service";
import {
  calculateBusinessMileageDeductionCents,
  getBusinessMileagePeriodForDate,
  summarizeRecordedBusinessMileage,
} from "../../../shared/mileageRates";

export const shiftsService = {
  async startShift(
    userId: number,
    input: { platform: string; startLat?: number; startLng?: number }
  ) {
    const db = await repo.getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    const shift = await repo.startOrResumeShift(
      db,
      userId,
      input.platform,
      input.startLat,
      input.startLng
    );
    if (!shift)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "The running shift could not be confirmed. Check shift status before retrying.",
      });
    return shift;
  },

  async endShift(
    ctx: { user: { id: number; email: string | null } },
    input: {
      shiftId: number;
      grossEarnings: number;
      tips: number;
      bonuses: number;
      totalMiles: number;
      mileageDate?: string;
      endLat?: number;
      endLng?: number;
      notes?: string;
    }
  ) {
    for (const [value, max] of [
      [input.grossEarnings, 99999999.99],
      [input.tips, 99999999.99],
      [input.bonuses, 99999999.99],
      [input.totalMiles, 999999.99],
    ]) {
      if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > max ||
        value !== Number(value.toFixed(2))
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Use nonnegative amounts and miles with at most two decimal places, within the supported limits.",
        });
    }
    if (
      (input.endLat !== undefined &&
        (!Number.isFinite(input.endLat) || Math.abs(input.endLat) > 90)) ||
      (input.endLng !== undefined &&
        (!Number.isFinite(input.endLng) || Math.abs(input.endLng) > 180))
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Use valid ending coordinates.",
      });
    const db = await repo.getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    const [existing] = await repo.getOwnedShift(db, input.shiftId, ctx.user.id);

    if (!existing)
      throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
    const confirmReplay = async (saved: typeof existing) => {
      const same =
        saved.status === "completed" &&
        Number(saved.grossEarnings) === input.grossEarnings &&
        Number(saved.tips) === input.tips &&
        Number(saved.bonuses) === input.bonuses &&
        Number(saved.totalMiles) === input.totalMiles &&
        (saved.notes ?? "") === (input.notes ?? "") &&
        Number(saved.endLat ?? 0) === Number(input.endLat?.toFixed(7) ?? 0) &&
        Number(saved.endLng ?? 0) === Number(input.endLng?.toFixed(7) ?? 0);
      const date =
        same && input.totalMiles > 0 && input.mileageDate
          ? await repo.getOwnedShiftMileageDate(db, ctx.user.id, input.shiftId)
          : null;
      if (
        !same ||
        (input.totalMiles > 0 &&
          input.mileageDate &&
          (!date ||
            new Date(date).toISOString().slice(0, 10) !== input.mileageDate))
      )
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This shift has already ended with different details. The saved record was kept; refresh your history.",
        });
      return {
        success: true as const,
        durationMinutes: saved.durationMinutes ?? 0,
      };
    };
    if (existing.status !== "active") return confirmReplay(existing);

    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime.getTime() - new Date(existing.startTime).getTime()) / 60000
    );

    let mileageRateCents: number | null = null;
    let mileageLoggedAt = endTime;
    if (input.totalMiles > 0) {
      try {
        if (input.mileageDate !== undefined) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(input.mileageDate))
            throw new Error("Select a valid mileage calendar date.");
          const selected = getBusinessMileagePeriodForDate(input.mileageDate);
          mileageLoggedAt = new Date(`${input.mileageDate}T00:00:00Z`);
          const startDay = Date.parse(
            new Date(existing.startTime).toISOString().slice(0, 10)
          );
          const endDay = Date.parse(endTime.toISOString().slice(0, 10));
          if (
            mileageLoggedAt.getTime() < startDay - 86400000 ||
            mileageLoggedAt.getTime() > endDay + 86400000
          )
            throw new Error(
              "Mileage date must be within the work session's calendar dates (allowing one day for time zones)."
            );
          mileageRateCents = selected.rateCents;
        } else {
          // Legacy clients provide no local driving date. Their recorded UTC
          // timestamps are only an estimate; never guess across a rate change.
          const started = getBusinessMileagePeriodForDate(
            new Date(existing.startTime)
          );
          const ended = getBusinessMileagePeriodForDate(endTime);
          if (started.startDate !== ended.startDate)
            throw new Error(
              "This work session spans mileage-rate periods. Select the mileage date, or finish with zero miles and log dated mileage separately."
            );
          mileageRateCents = ended.rateCents;
        }
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "A supported mileage period is required.",
        });
      }
    }

    const committed = await repo.completeShiftWithMileage(
      db,
      ctx.user.id,
      input.shiftId,
      {
        endTime,
        durationMinutes,
        grossEarnings: input.grossEarnings.toFixed(2),
        tips: input.tips.toFixed(2),
        bonuses: input.bonuses.toFixed(2),
        totalMiles: input.totalMiles.toFixed(2),
        endLat: input.endLat?.toFixed(7),
        endLng: input.endLng?.toFixed(7),
        notes: input.notes,
      },
      input.totalMiles > 0
        ? {
            date: mileageLoggedAt,
            miles: input.totalMiles.toFixed(2),
            irsRateCents: mileageRateCents!.toFixed(2),
            deductionCents: Math.round(input.totalMiles * mileageRateCents!),
          }
        : null
    );
    if (!committed) {
      const [saved] = await repo.getOwnedShift(db, input.shiftId, ctx.user.id);
      if (!saved)
        throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
      return confirmReplay(saved);
    }

    // Award points
    try {
      await awardPoints(
        db,
        ctx.user.id,
        "shift_completed",
        POINTS.shift_completed,
        `Completed ${existing.platform} shift — $${input.grossEarnings.toFixed(2)} earned`,
        String(input.shiftId)
      );
    } catch {
      console.warn("Shift saved; points could not be updated.");
    }

    // Push a real-time shift_update so the operator's earnings/stats refresh
    // instantly without a manual refetch.
    try {
      broadcastToUser(ctx.user.id, "shift_update", {
        shiftId: input.shiftId,
        status: "completed",
        grossEarnings: input.grossEarnings,
        durationMinutes,
      });
    } catch {
      console.warn("Shift saved; live update could not be sent.");
    }

    // Auto-detect friend challenge completion after shift progress updates.
    try {
      await checkAndResolveFriendChallengesForUser(ctx.user.id);
    } catch {
      console.warn("Shift saved; challenges could not be refreshed.");
    }

    // Fire Meta CAPI GigShiftCompleted event (non-blocking)
    try {
      const { capi } = await import("../../meta/capi");
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
        const { evaluateRulesForEvent } = await import("../../lib/ruleEngine");
        await evaluateRulesForEvent({
          userId: ctx.user.id,
          event: {
            type: "income_received",
            amountCents: totalEarningsCents,
            platform: existing.platform,
            referenceId: String(input.shiftId),
          },
        });
      }
    } catch (e) {
      console.error("[moneyManager.endShift] Rule engine failed:", e);
      // Non-blocking: shift still completes successfully
    }

    return { success: true, durationMinutes };
  },

  async listShifts(
    userId: number,
    input: {
      platform?: string;
      startDate?: string;
      endDate?: string;
      limit: number;
      offset: number;
    }
  ) {
    const db = await repo.getDb();
    if (!db) return { shifts: [], total: 0 };

    const conditions: SQL[] = [eq(gigShifts.userId, userId)];
    if (input.platform) conditions.push(eq(gigShifts.platform, input.platform));
    if (input.startDate)
      conditions.push(gte(gigShifts.startTime, new Date(input.startDate)));
    if (input.endDate)
      conditions.push(lte(gigShifts.startTime, new Date(input.endDate)));

    const shifts = await repo.listShiftsFiltered(
      db,
      conditions,
      input.limit,
      input.offset
    );

    const [{ count }] = await repo.countShiftsFiltered(db, conditions);

    return { shifts, total: Number(count) };
  },

  async getShiftStats(
    userId: number,
    input: { period: "week" | "month" | "year" | "all" }
  ) {
    const db = await repo.getDb();
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

    const [shifts, imported, mileageLogs] = await Promise.all([
      repo.getCompletedShiftsSince(db, userId, startDate),
      repo.getImportedEarningsSince(db, userId, startDate),
      repo.getMileageDeductionsSince(db, userId, startDate),
    ]);

    const shiftEarnings = shifts.reduce(
      (s, r) =>
        s + Number(r.grossEarnings) + Number(r.tips) + Number(r.bonuses),
      0
    );
    const shiftMiles = shifts.reduce((s, r) => s + Number(r.totalMiles), 0);
    const totalMinutes = shifts.reduce(
      (s, r) => s + (r.durationMinutes ?? 0),
      0
    );
    const totalHours = totalMinutes / 60;

    // Blend imported earnings/miles into the money totals only. Imports have no
    // reliable per-row duration, so they are deliberately excluded from hours
    // and avgPerHour — mixing zero-duration rows in would deflate $/hr.
    const importedEarningsTotal = imported.reduce(
      (s, r) =>
        s + Number(r.grossEarnings) + Number(r.tips) + Number(r.bonuses),
      0
    );
    const importedMiles = imported.reduce(
      (s, r) => s + Number(r.totalMiles ?? 0),
      0
    );

    const totalEarnings = shiftEarnings + importedEarningsTotal;
    const totalMiles = shiftMiles + importedMiles;
    let taxDeduction: number | null = null;
    try {
      const shiftIds = new Set(shifts.map(shift => shift.id));
      const shiftDeductionCents = summarizeRecordedBusinessMileage(
        shifts,
        mileageLogs.filter(
          log => log.shiftId !== null && shiftIds.has(log.shiftId)
        )
      ).deductionCents;
      const importedDeductionCents = imported.reduce((sum, row) => {
        const miles = Number(row.totalMiles ?? 0);
        return (
          sum +
          (miles > 0
            ? calculateBusinessMileageDeductionCents(miles, row.earnedDate)
            : 0)
        );
      }, 0);
      taxDeduction = (shiftDeductionCents + importedDeductionCents) / 100;
    } catch {
      // Preserve the earnings view if historical mileage lacks a verified rate.
      // An unavailable deduction must not silently become zero or the latest rate.
      taxDeduction = null;
    }

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalMiles: Math.round(totalMiles * 10) / 10,
      totalShifts: shifts.length,
      totalHours: Math.round(totalHours * 10) / 10,
      // avgPerHour stays shift-only: hours come from shifts alone, so dividing
      // the blended earnings by them would overstate $/hr. Use shift earnings.
      avgPerHour:
        totalHours > 0
          ? Math.round((shiftEarnings / totalHours) * 100) / 100
          : 0,
      taxDeduction:
        taxDeduction === null ? null : Math.round(taxDeduction * 100) / 100,
      mileageRateUnavailable: taxDeduction === null,
    };
  },

  async getActiveShift(userId: number) {
    const db = await repo.getDb();
    if (!db) return null;
    const [shift] = await repo.getActiveShiftRow(db, userId);
    return shift ?? null;
  },

  async updateShiftGPS(
    userId: number,
    input: {
      shiftId: number;
      lat: number;
      lng: number;
      appendWaypoint: boolean;
    }
  ) {
    const db = await repo.getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [shift] = await repo.getActiveOwnedShift(db, input.shiftId, userId);

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

    await repo.updateOwnedShift(db, input.shiftId, userId, {
      routeWaypoints: waypoints,
    });

    return { ok: true, waypointCount: waypoints.length };
  },

  async getRouteIntelligence(
    userId: number,
    input: {
      lat: number;
      lng: number;
      platform: string;
      radiusMiles: number;
    }
  ) {
    const db = await repo.getDb();
    if (!db) return null;

    // Route intelligence is the paid "Route Optimizer" (Pro) feature listed in
    // FEATURE_TIERS and sold on the plans page. Gate it server-side so a Starter
    // operator can't hit this endpoint to spend unbounded paid LLM calls with no
    // credit decrement. Free callers get null (the client renders an upgrade
    // state) rather than an error, and no LLM call is made.
    const { gigWorkerService } = await import("../gigWorker/gigWorker.service");
    const access = await gigWorkerService.checkFeatureAccess(
      userId,
      "route_optimizer"
    );
    if (!access.hasAccess) return null;

    // Pull user's last 30 shifts for context
    const recentShifts = await repo.getRecentCompletedShifts(db, userId, 30);

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
        model: `groq/${GROQ_FALLBACK_MODEL}`,
        modelChain: [...FREE_TIER_FALLBACK_CHAIN],
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
  },

  async generateAIShortcuts(userId: number, input: { platform?: string }) {
    const db = await repo.getDb();
    if (!db) return [];

    const recentShifts = await repo.getRecentCompletedShifts(db, userId, 20);

    const recentMileage = await repo.getRecentMileageLogs(db, userId, 10);

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

    // Meter this against the user's monthly AI credit quota immediately before
    // the LLM call — Starter gets 25/mo, Pro 250. Placed after the DB/data
    // fetches so a short-circuit (no DB) never burns a credit, and outside the
    // try/catch so a quota-exhausted FORBIDDEN propagates instead of being
    // swallowed into an empty result. These AI endpoints previously recorded no
    // usage at all, so the sold free-tier limit was unenforceable.
    const { gigWorkerService } = await import("../gigWorker/gigWorker.service");
    await gigWorkerService.recordAIUsage(userId, {
      tokens: 0,
      context: "ai_shortcuts",
    });

    try {
      const response = await invokeLLM({
        model: `groq/${GROQ_FALLBACK_MODEL}`,
        modelChain: [...FREE_TIER_FALLBACK_CHAIN],
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
  },

  async getShiftBreakdown(
    userId: number,
    input: { period: "week" | "month" | "year" | "all" }
  ) {
    const db = await repo.getDb();
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

    const [shifts, imported] = await Promise.all([
      repo.getCompletedShiftsSinceOrdered(db, userId, startDate),
      repo.getImportedEarningsSince(db, userId, startDate),
    ]);

    if (shifts.length === 0 && imported.length === 0) {
      return {
        byPlatform: [],
        byHour: [],
        byDayOfWeek: [],
        topInsight: null,
      };
    }

    // Per-platform aggregation. `earnings`/`hours`/`shifts` are shift-only and
    // drive avgPerHour; `importedEarnings` and `miles` also absorb imports for
    // the displayed money/miles totals (see the import blend below).
    const platformMap: Record<
      string,
      {
        earnings: number;
        hours: number;
        shifts: number;
        miles: number;
        importedEarnings: number;
      }
    > = {};
    for (const s of shifts) {
      const p = s.platform;
      if (!platformMap[p])
        platformMap[p] = {
          earnings: 0,
          hours: 0,
          shifts: 0,
          miles: 0,
          importedEarnings: 0,
        };
      const totalEarned =
        Number(s.grossEarnings) + Number(s.tips) + Number(s.bonuses);
      const hours = (s.durationMinutes ?? 0) / 60;
      platformMap[p].earnings += totalEarned;
      platformMap[p].hours += hours;
      platformMap[p].shifts += 1;
      platformMap[p].miles += Number(s.totalMiles);
    }
    // Blend imported earnings/miles into each platform's DISPLAYED earnings +
    // miles totals only. Imported earnings go into a separate `importedEarnings`
    // bucket (never `earnings`) and add no hours/shifts, so avgPerHour stays
    // shift-only and byHour / byDayOfWeek (which iterate `shifts`) never see
    // them — imports carry no reliable per-row duration.
    for (const r of imported) {
      const p = r.platform;
      if (!platformMap[p])
        platformMap[p] = {
          earnings: 0,
          hours: 0,
          shifts: 0,
          miles: 0,
          importedEarnings: 0,
        };
      platformMap[p].importedEarnings +=
        Number(r.grossEarnings) + Number(r.tips) + Number(r.bonuses);
      platformMap[p].miles += Number(r.totalMiles ?? 0);
    }
    const byPlatform = Object.entries(platformMap)
      .map(([platform, v]) => ({
        platform,
        totalEarnings:
          Math.round((v.earnings + v.importedEarnings) * 100) / 100,
        totalHours: Math.round(v.hours * 10) / 10,
        // Shift-only: imported earnings have no duration, so excluding them
        // keeps $/hr honest.
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
  },

  async getKaiContext(userId: number) {
    const db = await repo.getDb();
    if (!db) return { contextJson: "{}", hasSufficientData: false };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // TODO(earnings-import): blend importedEarnings into the month/year earnings
    // and ytdMiles here too. Left out for now because this context builds off a
    // limited recent-shifts fetch (getRecentCompletedShifts, cap 50) rather than
    // a since-date query, so folding imports in needs its own getImportedEarnings
    // Since read — deferred to keep this low-risk. getShiftStats / getShiftBreakdown
    // (the surfaced totals) already include imports.

    // Core stats
    const allShifts = await repo.getRecentCompletedShifts(db, userId, 50);

    if (allShifts.length === 0) {
      return {
        contextJson: JSON.stringify({ message: "No shifts logged yet." }),
        hasSufficientData: false,
      };
    }

    const monthShifts = allShifts.filter(s => s.startTime >= startOfMonth);

    const earnings = (arr: typeof allShifts) =>
      arr.reduce(
        (s, r) =>
          s + Number(r.grossEarnings) + Number(r.tips) + Number(r.bonuses),
        0
      );
    const hours = (arr: typeof allShifts) =>
      arr.reduce((s, r) => s + (r.durationMinutes ?? 0), 0) / 60;

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
    const ytdMileage = await mileageTaxService.getYTDDeduction(userId);

    const ctx_data = {
      period: "this month",
      totalEarnings: Math.round(monthEarnings * 100) / 100,
      totalHours: Math.round(monthHours * 10) / 10,
      avgPerHour:
        monthHours > 0
          ? Math.round((monthEarnings / monthHours) * 100) / 100
          : 0,
      totalShifts: monthShifts.length,
      ytdMiles: ytdMileage.ytdMiles,
      ytdDeduction: ytdMileage.ytdDeduction,
      platforms,
      topPlatform: platforms[0]?.platform ?? null,
      lowestPlatform: platforms[platforms.length - 1]?.platform ?? null,
      lifetimeShifts: allShifts.length,
    };

    return {
      contextJson: JSON.stringify(ctx_data, null, 2),
      hasSufficientData: allShifts.length >= 3,
    };
  },
};
