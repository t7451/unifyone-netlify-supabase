/**
 * server/routers/moneyManager/taxExport.service.ts
 *
 * Assembles a gig worker's year tax report from their real recorded data:
 * completed shifts (gigShifts) and mileage logs (mileageLogs). The tax figures
 * reuse the same IRS SE/1040-ES math as the live tax estimate
 * (server/lib/taxEstimator), annualized the same way, so the export does not
 * diverge from what the app shows on screen. This backs the "Tax Export
 * (CSV/PDF)" Pro feature — the client renders CSV + PDF from this structured
 * payload; all gating happens at the router before this is called.
 */

import { TRPCError } from "@trpc/server";
import * as repo from "./moneyManager.repo";
import {
  computeAnnualProjection,
  getNextQuarterlyDueDate,
  TAX_CONSTANTS,
} from "../../lib/taxEstimator";

// IRS business standard mileage rates by tax year (dollars/mile). Manual mileage
// logs already store their own per-row deduction at the rate in effect when
// logged; this map is applied to shift-tracked miles, which carry no stored
// rate. Unknown/future years fall back to the latest known rate.
const IRS_MILEAGE_RATES: Record<number, number> = {
  2023: 0.655,
  2024: 0.67,
  2025: 0.7,
};
const LATEST_IRS_RATE = TAX_CONSTANTS.MILEAGE_RATE_CENTS / 100; // 0.70 (2025)

function mileageRateForYear(year: number): number {
  return IRS_MILEAGE_RATES[year] ?? LATEST_IRS_RATE;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface TaxReportShiftRow {
  date: string; // ISO date
  platform: string;
  durationHours: number;
  grossDollars: number;
  tipsDollars: number;
  bonusesDollars: number;
  totalDollars: number;
  miles: number;
  perHourDollars: number;
}

export interface TaxReportMileageRow {
  date: string; // ISO date
  miles: number;
  purpose: string;
  deductionDollars: number;
  startAddress: string;
  endAddress: string;
}

export interface TaxReport {
  year: number;
  generatedAt: string;
  irsMileageRate: number;
  summary: {
    shiftCount: number;
    totalGrossDollars: number;
    totalTipsDollars: number;
    totalBonusesDollars: number;
    totalEarningsDollars: number;
    totalMiles: number;
    mileageDeductionDollars: number;
    netEarningsDollars: number;
  };
  tax: {
    /**
     * Estimated tax, annualized from year-to-date gross + mileage to match the
     * in-app estimate (a completed prior year projects at factor 1 = actuals).
     */
    seTaxDollars: number;
    fedIncomeTaxDollars: number;
    totalEstimatedTaxDollars: number;
    bracketRate: number;
    nextQuarterlyDueDate: string; // ISO
    nextQuarter: 1 | 2 | 3 | 4;
  };
  shifts: TaxReportShiftRow[];
  mileageLogs: TaxReportMileageRow[];
}

export const taxExportService = {
  /**
   * Build the full tax report for a given calendar year from the user's
   * recorded shifts and mileage logs. Earnings/mileage totals are the actual
   * recorded figures; the tax estimate is annualized from year-to-date data to
   * match the in-app estimate (a completed prior year projects at factor 1, so
   * its figure is the actual annual tax).
   */
  async buildTaxReport(
    userId: number,
    input: { year: number }
  ): Promise<TaxReport> {
    const year = input.year;
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const db = await repo.getDb();
    const now = new Date();
    const irsRate = mileageRateForYear(year);

    if (!db) {
      // A DB outage must never masquerade as a real "$0 / no activity" tax year —
      // that document could be handed to a CPA as fact. Fail loudly so the client
      // reports an export failure instead of downloading a misleading zero report.
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Tax report is temporarily unavailable — please try again.",
      });
    }

    const [shiftRows, mileageRows] = await Promise.all([
      repo.getCompletedShiftsSinceOrdered(db, userId, startOfYear),
      repo.getMileageLogsBetween(db, userId, startOfYear, endOfYear),
    ]);

    // Keep only shifts that actually started within the requested year (the
    // repo query is a lower-bound since startOfYear; a future year won't have
    // rows, but bound the upper edge defensively for a past-year export).
    const yearShifts = shiftRows.filter(
      s => s.startTime instanceof Date && s.startTime <= endOfYear
    );

    const shifts: TaxReportShiftRow[] = yearShifts.map(s => {
      const gross = Number(s.grossEarnings) || 0;
      const tips = Number(s.tips) || 0;
      const bonuses = Number(s.bonuses) || 0;
      const miles = Number(s.totalMiles) || 0;
      const durationHours = round2((s.durationMinutes ?? 0) / 60);
      const total = round2(gross + tips + bonuses);
      const perHour = durationHours > 0 ? round2(total / durationHours) : 0;
      return {
        date: (s.startTime as Date).toISOString(),
        platform: s.platform ?? "unknown",
        durationHours,
        grossDollars: round2(gross),
        tipsDollars: round2(tips),
        bonusesDollars: round2(bonuses),
        totalDollars: total,
        miles: round2(miles),
        perHourDollars: perHour,
      };
    });

    const mileageLogs: TaxReportMileageRow[] = mileageRows
      // Guard against legacy/bad rows with a null or non-Date date — otherwise
      // `.toISOString()` would throw and 500 the whole export (same defensive
      // filter applied to shift startTime above).
      .filter(m => m.date instanceof Date)
      .map(m => ({
        date: (m.date as Date).toISOString(),
        miles: round2(Number(m.miles) || 0),
        purpose: m.purpose ?? "business",
        deductionDollars: round2((m.deductionCents ?? 0) / 100),
        startAddress: m.startAddress ?? "",
        endAddress: m.endAddress ?? "",
      }));

    // Totals — earnings from shifts; deductible miles from BOTH shift-tracked
    // miles and manually logged miles (mirrors getTaxEstimate's data sources).
    const totalGross = shifts.reduce((s, r) => s + r.grossDollars, 0);
    const totalTips = shifts.reduce((s, r) => s + r.tipsDollars, 0);
    const totalBonuses = shifts.reduce((s, r) => s + r.bonusesDollars, 0);
    const totalEarnings = round2(totalGross + totalTips + totalBonuses);

    const shiftMiles = shifts.reduce((s, r) => s + r.miles, 0);
    const shiftMileageDeduction = shiftMiles * irsRate;
    const manualMileageDeduction = mileageLogs.reduce(
      (s, r) => s + r.deductionDollars,
      0
    );
    const mileageDeduction = round2(
      shiftMileageDeduction + manualMileageDeduction
    );
    const totalMiles = round2(
      shiftMiles + mileageLogs.reduce((s, r) => s + r.miles, 0)
    );

    const netEarnings = round2(Math.max(0, totalEarnings - mileageDeduction));

    // Tax estimate — mirror the on-screen estimate (mileageTax.getTaxEstimate):
    // annualize year-to-date gross + mileage, then apply the IRS 2025 SE +
    // federal math. Computing on partial-year net with the FULL annual standard
    // deduction would print $0 federal income tax mid-year and diverge from what
    // the app shows. For a completed prior year there is nothing to project
    // (dayOfYear = daysInYear → factor 1), so the figure is the actual annual
    // tax; for the current year it matches the projected in-app estimate.
    const daysInYear = year % 4 === 0 ? 366 : 365;
    const dayOfYear =
      year === now.getFullYear()
        ? Math.max(
            1,
            Math.ceil((now.getTime() - startOfYear.getTime()) / 86400000)
          )
        : daysInYear;
    const projection = computeAnnualProjection({
      ytdGrossCents: Math.round(totalEarnings * 100),
      ytdMileageDeductionCents: Math.round(mileageDeduction * 100),
      dayOfYear,
      daysInYear,
    });
    const nextDue = getNextQuarterlyDueDate(now);

    return {
      year,
      generatedAt: now.toISOString(),
      irsMileageRate: irsRate,
      summary: {
        shiftCount: shifts.length,
        totalGrossDollars: round2(totalGross),
        totalTipsDollars: round2(totalTips),
        totalBonusesDollars: round2(totalBonuses),
        totalEarningsDollars: totalEarnings,
        totalMiles,
        mileageDeductionDollars: mileageDeduction,
        netEarningsDollars: netEarnings,
      },
      tax: {
        seTaxDollars: round2(projection.projectedSeTaxCents / 100),
        fedIncomeTaxDollars: round2(
          projection.projectedFedIncomeTaxCents / 100
        ),
        totalEstimatedTaxDollars: round2(
          projection.totalEstimatedTaxCents / 100
        ),
        bracketRate: TAX_CONSTANTS.DEFAULT_FED_BRACKET,
        nextQuarterlyDueDate: nextDue.dueDate.toISOString(),
        nextQuarter: nextDue.quarter,
      },
      shifts,
      mileageLogs,
    };
  },
};
