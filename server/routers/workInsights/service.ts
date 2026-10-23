import * as repo from "./repo";
import { TRPCError } from "@trpc/server";
import {
  resolveExpenseRange,
  resolveExpenseReportingDate,
} from "../workExpenses/periods";

export type WorkPeriod = "week" | "month" | "year" | "all";
type MoneyValue = string | number | null | undefined;
export type RecordedShift = {
  platform: string | null;
  grossEarnings: MoneyValue;
  tips: MoneyValue;
  bonuses: MoneyValue;
  durationMinutes: number | null;
  totalMiles: MoneyValue;
};
export type ImportedWork = Pick<
  RecordedShift,
  "grossEarnings" | "tips" | "bonuses" | "totalMiles"
>;
type WorkTotals = {
  earnings: number;
  hours: number;
  miles: number;
  otherCosts: 0;
};

function nonnegative(value: MoneyValue): number | null {
  // Missing figures are not measured zeroes. Database decimals are strings.
  if (value == null || (typeof value === "string" && value.trim() === ""))
    return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function earnings(row: ImportedWork): number | null {
  const base = nonnegative(row.grossEarnings);
  const tips = nonnegative(row.tips);
  const bonuses = nonnegative(row.bonuses);
  return base === null || tips === null || bonuses === null
    ? null
    : base + tips + bonuses;
}

/** Same period conventions as earnings views: rolling 7 days, UTC calendar month/year. */
export function periodStart(period: WorkPeriod, now: Date): Date {
  if (period === "week") return new Date(now.getTime() - 7 * 86400000);
  if (period === "month")
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (period === "year") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return new Date(0);
}

/** Aggregate underlying earnings and time; callers calculate a weighted hourly ratio. */
export function summarizeRecordedWork(
  period: WorkPeriod,
  shifts: RecordedShift[],
  imports: ImportedWork[],
  expenseRows: { amountCents: number; category: string }[] = []
) {
  const tracked: WorkTotals = {
    earnings: 0,
    hours: 0,
    miles: 0,
    otherCosts: 0,
  };
  const excluded = { count: 0, earnings: 0 };
  const sources = new Map<
    string,
    WorkTotals & { source: string; records: number }
  >();
  for (const shift of shifts) {
    const income = earnings(shift);
    const miles = nonnegative(shift.totalMiles);
    const duration = shift.durationMinutes;
    if (
      income === null ||
      miles === null ||
      duration === null ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      excluded.count++;
      // Keep unknown amounts out of numeric totals; the excluded count still
      // signals missing data even when a row's earnings cannot be calculated.
      if (income !== null) excluded.earnings += income;
      continue;
    }
    const hours = duration / 60;
    tracked.earnings += income;
    tracked.hours += hours;
    tracked.miles += miles;
    const source = shift.platform?.trim() || "Other";
    const entry = sources.get(source) ?? {
      source,
      earnings: 0,
      hours: 0,
      miles: 0,
      otherCosts: 0,
      records: 0,
    };
    entry.earnings += income;
    entry.hours += hours;
    entry.miles += miles;
    entry.records++;
    sources.set(source, entry);
  }
  const imported = { count: imports.length, earnings: 0, miles: 0 };
  for (const row of imports) {
    imported.earnings += earnings(row) ?? 0;
    imported.miles += nonnegative(row.totalMiles) ?? 0;
  }
  const expenses = {
    count: expenseRows.length,
    totalCents: 0,
    vehicleCents: 0,
    otherCents: 0,
  };
  for (const row of expenseRows) {
    if (!Number.isSafeInteger(row.amountCents) || row.amountCents < 0)
      throw new Error("Invalid saved expense amount");
    expenses.totalCents += row.amountCents;
    if (["fuel", "maintenance", "insurance"].includes(row.category))
      expenses.vehicleCents += row.amountCents;
    else expenses.otherCents += row.amountCents;
    if (!Number.isSafeInteger(expenses.totalCents))
      throw new Error("Expense total exceeds safe precision");
  }
  return {
    expenses,
    period,
    tracked,
    bySource: Array.from(sources.values()).sort((a, b) =>
      a.source.localeCompare(b.source)
    ),
    recordedCount: shifts.length,
    excluded,
    imported,
  };
}

export async function summary(
  userId: number,
  period: WorkPeriod,
  now = new Date(),
  asOfDate = now.toISOString().slice(0, 10)
) {
  let reportingDate: string;
  try {
    reportingDate = resolveExpenseReportingDate(asOfDate, now.getTime());
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The expense reporting date must match your local today.",
    });
  }
  const expenseRange = resolveExpenseRange(period, reportingDate);
  const records = await repo.loadRecordedWork(
    userId,
    periodStart(period, now),
    now,
    expenseRange
  );
  return {
    ...summarizeRecordedWork(
      period,
      records.shifts,
      records.imported,
      records.expenses
    ),
    expenseRange,
  };
}
