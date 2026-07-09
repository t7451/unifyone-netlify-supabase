/**
 * server/routers/moneyManager/taxExport.service.ts
 *
 * Assembles a gig worker's year tax report from their real recorded data:
 * completed shifts (gigShifts) and mileage logs (mileageLogs). The tax figures
 * reuse the same IRS 2025 math as the live tax estimate (server/lib/taxEstimator)
 * so the export never diverges from what the app shows on screen. This backs the
 * "Tax Export (CSV/PDF)" Pro feature — the client renders CSV + PDF from this
 * structured payload; all gating happens at the router before this is called.
 */

import * as repo from "./moneyManager.repo";
import {
  computeSelfEmploymentTax,
  computeFederalIncomeTax,
  getNextQuarterlyDueDate,
  TAX_CONSTANTS,
} from "../../lib/taxEstimator";

const IRS_RATE_DOLLARS = TAX_CONSTANTS.MILEAGE_RATE_CENTS / 100; // 0.70 (2025)

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
    /** Estimated tax on the net earnings actually recorded for this year. */
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
   * recorded shifts and mileage logs. Tax is computed on the ACTUAL recorded
   * net (gross earnings − mileage deduction), not a pace projection, so the
   * exported document is a faithful record of what was earned and owed.
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

    if (!db) {
      // DB-less/degraded mode: return an empty-but-valid report so the client
      // still produces a (zeroed) document rather than erroring.
      const nextDue = getNextQuarterlyDueDate(now);
      return {
        year,
        generatedAt: now.toISOString(),
        irsMileageRate: IRS_RATE_DOLLARS,
        summary: {
          shiftCount: 0,
          totalGrossDollars: 0,
          totalTipsDollars: 0,
          totalBonusesDollars: 0,
          totalEarningsDollars: 0,
          totalMiles: 0,
          mileageDeductionDollars: 0,
          netEarningsDollars: 0,
        },
        tax: {
          seTaxDollars: 0,
          fedIncomeTaxDollars: 0,
          totalEstimatedTaxDollars: 0,
          bracketRate: TAX_CONSTANTS.DEFAULT_FED_BRACKET,
          nextQuarterlyDueDate: nextDue.dueDate.toISOString(),
          nextQuarter: nextDue.quarter,
        },
        shifts: [],
        mileageLogs: [],
      };
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

    const mileageLogs: TaxReportMileageRow[] = mileageRows.map(m => ({
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
    const shiftMileageDeduction = shiftMiles * IRS_RATE_DOLLARS;
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

    // Tax on actual recorded net (cents in, dollars out).
    const netCents = Math.round(netEarnings * 100);
    const se = computeSelfEmploymentTax(netCents);
    const fed = computeFederalIncomeTax(netCents, {
      halfSeTaxDeductionCents: se.deductibleSeTaxCents,
    });
    const totalTaxCents = se.totalSeTaxCents + fed.fedIncomeTaxCents;
    const nextDue = getNextQuarterlyDueDate(now);

    return {
      year,
      generatedAt: now.toISOString(),
      irsMileageRate: IRS_RATE_DOLLARS,
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
        seTaxDollars: round2(se.totalSeTaxCents / 100),
        fedIncomeTaxDollars: round2(fed.fedIncomeTaxCents / 100),
        totalEstimatedTaxDollars: round2(totalTaxCents / 100),
        bracketRate: TAX_CONSTANTS.DEFAULT_FED_BRACKET,
        nextQuarterlyDueDate: nextDue.dueDate.toISOString(),
        nextQuarter: nextDue.quarter,
      },
      shifts,
      mileageLogs,
    };
  },
};
