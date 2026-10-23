/**
 * server/routers/moneyManager/mileageTax.service.ts
 *
 * Mileage + tax use-cases: mileage logging/summary, the YTD deduction
 * widget, the comprehensive tax estimate, and earnings anomaly detection.
 * YTD mileage counts completed shifts once, with separate manual mileage logs.
 */

import { getAppUrl } from "../../_core/env";
import { TRPCError } from "@trpc/server";
import * as repo from "./moneyManager.repo";
import { awardPoints, POINTS } from "./points.service";
import { checkAndResolveFriendChallengesForUser } from "../../challengeCompletion";

import {
  getBusinessMileageRateForDate,
  getDayWeightedBusinessMileageRateCents,
  summarizeRecordedBusinessMileage,
} from "../../../shared/mileageRates";

export const mileageTaxService = {
  async logMileage(
    ctx: { user: { id: number; email: string | null } },
    input: {
      miles: number;
      purpose: string;
      date?: string;
      startAddress?: string;
      endAddress?: string;
      notes?: string;
    }
  ) {
    const db = await repo.getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    const date = input.date ?? new Date();
    let rateCents: number;
    try {
      rateCents = getBusinessMileageRateForDate(date);
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          error instanceof Error
            ? error.message
            : "A supported mileage date is required.",
      });
    }
    const deductionCents = Math.round(input.miles * rateCents);
    await repo.insertMileageLog(db, {
      userId: ctx.user.id,
      date: new Date(date),
      miles: input.miles.toFixed(2),
      purpose: input.purpose,
      irsRateCents: rateCents.toFixed(2),
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

    // Auto-detect friend challenge completion after mileage progress updates.
    await checkAndResolveFriendChallengesForUser(ctx.user.id);

    // Fire Meta CAPI MileageLogged event (non-blocking)
    try {
      const { capi } = await import("../../meta/capi");
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
  },

  async getMileageSummary(userId: number, input: { year: number }) {
    const db = await repo.getDb();
    if (!db) return { totalMiles: 0, totalDeduction: 0, logs: [] };

    const startOfYear = new Date(input.year, 0, 1);
    const endOfYear = new Date(input.year, 11, 31, 23, 59, 59);

    const logs = await repo.getMileageLogsBetween(
      db,
      userId,
      startOfYear,
      endOfYear
    );

    const totalMiles = logs.reduce((s, r) => s + Number(r.miles), 0);
    const totalDeduction = logs.reduce((s, r) => s + r.deductionCents, 0) / 100;

    return {
      totalMiles: Math.round(totalMiles * 10) / 10,
      totalDeduction,
      logs,
    };
  },

  async getYTDDeduction(userId: number) {
    const db = await repo.getDb();
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
    const shifts = await repo.getCompletedShiftMilesSince(
      db,
      userId,
      startOfYear
    );

    const logs = await repo.getMileageMilesSince(db, userId, startOfYear);

    const recordedMileage = summarizeRecordedBusinessMileage(shifts, logs);
    const ytdMiles = Math.round(recordedMileage.totalMiles * 10) / 10;
    const ytdDeduction = recordedMileage.deductionCents / 100;

    // Project to year end based on pace so far
    const dayOfYear = Math.ceil(
      (now.getTime() - startOfYear.getTime()) / 86400000
    );
    const daysInYear = now.getFullYear() % 4 === 0 ? 366 : 365;
    const dailyRate = dayOfYear > 0 ? ytdMiles / dayOfYear : 0;
    const projectedYearlyMiles = Math.round(dailyRate * daysInYear * 10) / 10;
    const projectedYearlyDeduction =
      projectedYearlyMiles > 0
        ? Math.round(
            projectedYearlyMiles *
              getDayWeightedBusinessMileageRateCents(now.getUTCFullYear())
          ) / 100
        : 0;

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
  },

  async getTaxEstimate(userId: number, input?: { bracketRate?: number }) {
    const db = await repo.getDb();
    if (!db) {
      return null;
    }
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil(
      (now.getTime() - startOfYear.getTime()) / 86400000
    );
    const daysInYear = now.getFullYear() % 4 === 0 ? 366 : 365;

    const shifts = await repo.getCompletedShiftEarningsSince(
      db,
      userId,
      startOfYear
    );

    const logs = await repo.getMileageDeductionsSince(db, userId, startOfYear);

    const ytdGrossCents = Math.round(
      shifts.reduce(
        (s, r) =>
          s + Number(r.grossEarnings) + Number(r.tips) + Number(r.bonuses),
        0
      ) * 100
    );
    const ytdMileageDeductionCents = summarizeRecordedBusinessMileage(
      shifts,
      logs
    ).deductionCents;

    const {
      computeAnnualProjection,
      computeQuarterlyEstimate,
      getNextQuarterlyDueDate,
      TAX_CONSTANTS,
    } = await import("../../lib/taxEstimator");

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
  },

  async getAnomalies(
    userId: number,
    input?: { lookbackDays?: number; recentSampleSize?: number }
  ) {
    const { detectAnomalies } = await import("../../lib/earningsAnomaly");
    return detectAnomalies({
      userId,
      lookbackDays: input?.lookbackDays,
      recentSampleSize: input?.recentSampleSize,
    });
  },
};
