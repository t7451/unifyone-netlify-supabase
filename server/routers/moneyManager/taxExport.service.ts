/** Owner-scoped annual bookkeeping packet. Recorded sources are unreconciled;
 * saved expenses and mileage are separate records, never a combined tax deduction.
 * Legacy summary/tax fields remain for compatibility and carry explicit scope.
 */

import { TRPCError } from "@trpc/server";
import * as repo from "./moneyManager.repo";
import { getAnnualRecords } from "./taxExport.repo";
import {
  computeAnnualProjection,
  getNextQuarterlyDueDate,
  TAX_CONSTANTS,
} from "../../lib/taxEstimator";

import {
  getBusinessMileagePeriods,
  summarizeRecordedBusinessMileage,
  type MileageRatePeriod,
} from "../../../shared/mileageRates";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface TaxReportShiftRow {
  source: "timer" | "manual";
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
  rateCents: number;
  includedSeparately: boolean;
}

export interface TaxReport {
  year: number;
  generatedAt: string;
  irsMileageRate: number | null;
  mileageRatePeriods: readonly MileageRatePeriod[];
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
  coverage: {
    sources: Record<
      "timer" | "manual" | "csv" | "expenses",
      { count: number; totalDollars: number }
    >;
    mileage: { count: number; totalMiles: number; deductionDollars: number };
    exclusions: string[];
    warnings: string[];
    reconciled: false;
  };
  bookkeeping: {
    recordedIncomeDollars: number;
    recordedExpenseDollars: number;
    incomeAfterRecordedExpensesDollars: number;
    mileageDeductionDollars: number;
    expensesByCategory: {
      category: string;
      amountCents: number;
      count: number;
    }[];
  };
  imports: {
    id: number;
    batchId: number;
    date: string;
    platform: string;
    grossDollars: number;
    tipsDollars: number;
    bonusesDollars: number;
    totalDollars: number;
    miles: number;
    durationHours: null;
  }[];
  expenses: {
    id: number;
    date: string;
    category: string;
    amountCents: number;
    merchant: string | null;
    notes: string | null;
  }[];
  tax: {
    status: "legacy_2025_estimate" | "unavailable";
    basisYear: 2025;
    reason: string;
    /**
     * Compatibility illustration using 2025 work-only rules. Consumers must check
     * status and reason; these values are never a complete tax liability.
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
  /** Export recorded annual sources without claiming reconciliation or tax liability. */
  async buildTaxReport(
    userId: number,
    input: { year: number }
  ): Promise<TaxReport> {
    const year = input.year;
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year + 1, 0, 1) - 1);

    const db = await repo.getDb();
    const now = new Date();
    let mileageRatePeriods: readonly MileageRatePeriod[];
    try {
      mileageRatePeriods = getBusinessMileagePeriods(year);
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          error instanceof Error
            ? error.message
            : "A supported mileage year is required.",
      });
    }
    const irsRate =
      mileageRatePeriods.length === 1
        ? mileageRatePeriods[0].rateCents / 100
        : null;

    if (!db) {
      // A DB outage must never masquerade as a real "$0 / no activity" tax year —
      // that document could be handed to a CPA as fact. Fail loudly so the client
      // reports an export failure instead of downloading a misleading zero report.
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Tax report is temporarily unavailable — please try again.",
      });
    }

    const records = await getAnnualRecords(db, userId, year);
    const mileageRows = records.mileage;
    const yearShifts = records.shifts.filter(
      s =>
        s.startTime instanceof Date &&
        s.startTime >= startOfYear &&
        s.startTime <= endOfYear
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
        source: s.entrySource === "manual" ? "manual" : "timer",
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

    const countedShiftIds = new Set(yearShifts.map(shift => shift.id));
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
        rateCents: Number(m.irsRateCents),
        includedSeparately:
          m.shiftId === null || !countedShiftIds.has(m.shiftId),
      }));

    // Totals — earnings from shifts; deductible miles from BOTH shift-tracked
    // miles and manually logged miles (mirrors getTaxEstimate's data sources).
    const totalGross = shifts.reduce((s, r) => s + r.grossDollars, 0);
    const totalTips = shifts.reduce((s, r) => s + r.tipsDollars, 0);
    const totalBonuses = shifts.reduce((s, r) => s + r.bonusesDollars, 0);
    const totalEarnings = round2(totalGross + totalTips + totalBonuses);

    const mileageElsewhereIds = new Set(
      (records.mileageElsewhere ?? []).map(row => row.shiftId)
    );
    const recordedMileage = summarizeRecordedBusinessMileage(
      yearShifts.map(row =>
        mileageElsewhereIds.has(row.id) ? { ...row, totalMiles: "0" } : row
      ),
      mileageRows.filter(row => row.date instanceof Date)
    );
    const mileageDeduction = recordedMileage.deductionCents / 100;
    const totalMiles = round2(recordedMileage.totalMiles);

    const netEarnings = round2(Math.max(0, totalEarnings - mileageDeduction));

    // Compatibility estimate is explicitly scoped to 2025 work records only.
    // It must not be presented as liability for other years or partial coverage.
    const daysInYear = year % 4 === 0 ? 366 : 365;
    const dayOfYear =
      year === now.getUTCFullYear()
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

    const imports = records.imports.map(row => ({
      id: row.id,
      batchId: row.batchId,
      date: row.date.toISOString(),
      platform: row.platform,
      grossDollars: round2(Number(row.grossEarnings)),
      tipsDollars: round2(Number(row.tips)),
      bonusesDollars: round2(Number(row.bonuses)),
      totalDollars: round2(
        Number(row.grossEarnings) + Number(row.tips) + Number(row.bonuses)
      ),
      miles: round2(Number(row.totalMiles ?? 0)),
      durationHours: null,
    }));
    const sourceTotal = (rows: { totalDollars: number }[]) =>
      round2(rows.reduce((total, row) => total + row.totalDollars, 0));
    const expenseTotalCents = records.expenses.reduce(
      (total, row) => total + row.amountCents,
      0
    );
    if (!Number.isSafeInteger(expenseTotalCents))
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Expense total is too large to export safely.",
      });
    const categories = new Map<
      string,
      { category: string; amountCents: number; count: number }
    >();
    for (const row of records.expenses) {
      const current = categories.get(row.category) ?? {
        category: row.category,
        amountCents: 0,
        count: 0,
      };
      current.amountCents += row.amountCents;
      current.count++;
      categories.set(row.category, current);
    }
    const recordedIncome = round2(totalEarnings + sourceTotal(imports));
    const expenseDollars = round2(expenseTotalCents / 100);
    const taxAvailable =
      year === 2025 && imports.length === 0 && records.expenses.length === 0;

    return {
      year,
      generatedAt: now.toISOString(),
      irsMileageRate: irsRate,
      mileageRatePeriods,
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
      coverage: {
        sources: {
          timer: {
            count: shifts.filter(row => row.source === "timer").length,
            totalDollars: sourceTotal(
              shifts.filter(row => row.source === "timer")
            ),
          },
          manual: {
            count: shifts.filter(row => row.source === "manual").length,
            totalDollars: sourceTotal(
              shifts.filter(row => row.source === "manual")
            ),
          },
          csv: { count: imports.length, totalDollars: sourceTotal(imports) },
          expenses: {
            count: records.expenses.length,
            totalDollars: expenseDollars,
          },
        },
        mileage: {
          count: mileageLogs.length,
          totalMiles,
          deductionDollars: mileageDeduction,
        },
        exclusions: [
          "Provider gig earnings are excluded.",
          "Bank transactions and deposits are excluded to avoid counting payouts as additional income.",
          "Uncommitted imports are excluded.",
        ],
        warnings: [
          "CSV imports and manual/timer income have not been reconciled; overlapping records may count the same income twice.",
          "CSV work hours are unknown; imported miles are shown separately and are not included in the mileage deduction.",
          "Mileage totals include shift-only miles where no matching saved mileage log exists; mileage count counts saved logs only.",
          "Recorded expenses are bookkeeping amounts, not a determination of tax deductibility. Actual vehicle costs and mileage deductions are not combined.",
          "Legacy summary and tax fields cover completed work records only, excluding CSV income and expenses.",
          "Saved mileage belongs to its log calendar year; cross-year sessions do not also count fallback miles in the session year.",
        ],
        reconciled: false,
      },
      bookkeeping: {
        recordedIncomeDollars: recordedIncome,
        recordedExpenseDollars: expenseDollars,
        incomeAfterRecordedExpensesDollars: round2(
          recordedIncome - expenseDollars
        ),
        mileageDeductionDollars: mileageDeduction,
        expensesByCategory: Array.from(categories.values()).sort((a, b) =>
          a.category.localeCompare(b.category)
        ),
      },
      imports,
      expenses: records.expenses,
      tax: {
        status: taxAvailable ? "legacy_2025_estimate" : "unavailable",
        basisYear: 2025,
        reason: taxAvailable
          ? "Illustrative 2025 federal estimate from recorded work and mileage only; excludes other income, credits, state tax and personal circumstances. Not a tax liability calculation."
          : "Tax estimate unavailable: the legacy calculator uses 2025 rules and excludes imported income and saved expenses. Numeric fields are a legacy work-only illustration, not this year's liability.",
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
