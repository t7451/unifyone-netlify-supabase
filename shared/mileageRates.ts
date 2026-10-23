/**
 * IRS business standard mileage rates, in cents per mile (including half cents).
 * Verified against https://www.irs.gov/tax-professionals/standard-mileage-rates
 * on 2026-10-23. The IRS table was reviewed 2026-07-28 and lists the midyear
 * 2026 change (IR-2026-29). These are business rates, not medical/charity rates.
 * Unknown periods never inherit the latest known rate. Calendar dates use UTC.
 */
export const BUSINESS_MILEAGE_SOURCE_URL =
  "https://www.irs.gov/tax-professionals/standard-mileage-rates";
export interface MileageRatePeriod {
  readonly startDate: string;
  readonly endDate: string;
  readonly rateCents: number;
  readonly label: string;
}
export const BUSINESS_MILEAGE_RATE_PERIODS: readonly MileageRatePeriod[] = [
  {
    startDate: "2023-01-01",
    endDate: "2023-12-31",
    rateCents: 65.5,
    label: "2023",
  },
  {
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    rateCents: 67,
    label: "2024",
  },
  {
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    rateCents: 70,
    label: "2025",
  },
  {
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    rateCents: 72.5,
    label: "2026 · January 1–June 30",
  },
  {
    startDate: "2026-07-01",
    endDate: "2026-12-31",
    rateCents: 76,
    label: "2026 · July 1–December 31",
  },
];
export class UnsupportedMileageYearError extends Error {
  constructor(public readonly year: number) {
    super(`No verified business mileage rate is available for ${year}.`);
    this.name = "UnsupportedMileageYearError";
  }
}
export class AmbiguousMileageYearError extends Error {
  constructor(public readonly year: number) {
    super(
      `${year} has multiple mileage rates. Select the date or rate period when the miles were driven.`
    );
    this.name = "AmbiguousMileageYearError";
  }
}
export function mileageCalendarDate(value: Date | string): string {
  if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}(?:T.+)?$/.test(value))
    throw new Error("A valid mileage date is required.");
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new Error("A valid mileage date is required.");
  const result = date.toISOString().slice(0, 10);
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    result !== value
  )
    throw new Error("A valid mileage date is required.");
  return result;
}
export function getBusinessMileagePeriods(
  year: number
): readonly MileageRatePeriod[] {
  const periods = BUSINESS_MILEAGE_RATE_PERIODS.filter(
    period => Number(period.startDate.slice(0, 4)) === year
  );
  if (!Number.isInteger(year) || !periods.length)
    throw new UnsupportedMileageYearError(year);
  return periods;
}
/** Only years with one rate can be represented by a single annual value. */
export function getBusinessMileageRateCents(year: number): number {
  const periods = getBusinessMileagePeriods(year);
  if (periods.length !== 1) throw new AmbiguousMileageYearError(year);
  return periods[0].rateCents;
}
export function getBusinessMileagePeriodForDate(
  value: Date | string
): MileageRatePeriod {
  const date = mileageCalendarDate(value);
  const period = BUSINESS_MILEAGE_RATE_PERIODS.find(
    rate => date >= rate.startDate && date <= rate.endDate
  );
  if (!period) throw new UnsupportedMileageYearError(Number(date.slice(0, 4)));
  return period;
}
export function getBusinessMileageRateForDate(value: Date | string): number {
  return getBusinessMileagePeriodForDate(value).rateCents;
}
export function calculateBusinessMileageDeductionCents(
  miles: number,
  value: Date | string
): number {
  if (!Number.isFinite(miles) || miles < 0)
    throw new Error("Mileage must be a nonnegative finite number.");
  return Math.round(miles * getBusinessMileageRateForDate(value));
}
/** For an existing uniform-daily-mileage annual projection, not a recorded rate. */
export function getDayWeightedBusinessMileageRateCents(year: number): number {
  const periods = getBusinessMileagePeriods(year);
  let weighted = 0;
  let days = 0;
  for (const period of periods) {
    const periodDays =
      (Date.parse(period.endDate) - Date.parse(period.startDate)) / 86400000 +
      1;
    weighted += periodDays * period.rateCents;
    days += periodDays;
  }
  return weighted / days;
}

export interface MileageShiftRecord {
  id: number;
  startTime: Date | string;
  totalMiles: number | string | null;
}
export interface SavedMileageRecord {
  shiftId: number | null;
  date: Date | string;
  miles: number | string;
  irsRateCents: number | string;
  deductionCents: number;
}
/**
 * Recorded log rates/amounts are historical snapshots, never rewritten to the
 * current rate. A matching shift uses its saved log; a shift without a log is
 * estimated using its recorded start date. Standalone logs keep their amounts.
 */
export function summarizeRecordedBusinessMileage(
  shifts: MileageShiftRecord[],
  logs: SavedMileageRecord[]
) {
  const shiftIds = new Set(shifts.map(shift => shift.id));
  const savedByShift = new Map<number, SavedMileageRecord>();
  for (const log of logs)
    if (log.shiftId !== null && !savedByShift.has(log.shiftId))
      savedByShift.set(log.shiftId, log);
  let totalMiles = 0;
  let deductionCents = 0;
  for (const shift of shifts) {
    const miles = Number(shift.totalMiles ?? 0);
    if (!Number.isFinite(miles) || miles < 0)
      throw new Error("A mileage record has an invalid distance.");
    totalMiles += miles;
    if (miles === 0) continue;
    const saved = savedByShift.get(shift.id);
    if (saved) {
      const rateCents = Number(saved.irsRateCents);
      if (!Number.isFinite(rateCents) || rateCents <= 0)
        throw new Error("A mileage record has an invalid stored rate.");
      deductionCents +=
        Number(saved.miles) === miles
          ? saved.deductionCents
          : Math.round(miles * rateCents);
    } else
      deductionCents += calculateBusinessMileageDeductionCents(
        miles,
        shift.startTime
      );
  }
  for (const log of logs) {
    if (log.shiftId !== null && shiftIds.has(log.shiftId)) continue;
    const miles = Number(log.miles);
    if (!Number.isFinite(miles) || miles < 0)
      throw new Error("A mileage record has an invalid distance.");
    totalMiles += miles;
    deductionCents += log.deductionCents;
  }
  if (!Number.isFinite(deductionCents) || deductionCents < 0)
    throw new Error("A mileage record has an invalid deduction.");
  return { totalMiles, deductionCents: Math.round(deductionCents) };
}
