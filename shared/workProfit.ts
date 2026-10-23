/** Cash-flow planning inputs. Tax deductions are deliberately not expenses here. */
export interface WorkTotals {
  earnings: number;
  hours: number;
  miles: number;
  otherCosts: number;
}

export interface ProfitSettings {
  costPerMile: number;
  taxReservePercent: number;
  targetHourly: number;
}

/** Editable starting assumptions, not measured costs or calculated tax rates. */
export const DEFAULT_PROFIT_SETTINGS: ProfitSettings = {
  costPerMile: 0.35,
  taxReservePercent: 25,
  targetHourly: 20,
};

export function calculateWorkProfit(
  work: WorkTotals,
  settings: ProfitSettings
) {
  if (
    ![work.earnings, work.hours, work.miles, work.otherCosts].every(
      value => Number.isFinite(value) && value >= 0
    ) ||
    ![
      settings.costPerMile,
      settings.taxReservePercent,
      settings.targetHourly,
    ].every(value => Number.isFinite(value) && value >= 0) ||
    settings.taxReservePercent >= 100
  ) {
    throw new RangeError(
      "Use nonnegative finite values and a tax reserve below 100%."
    );
  }

  const vehicleCost = work.miles * settings.costPerMile;
  const expenses = vehicleCost + work.otherCosts;
  const operatingProfit = work.earnings - expenses;
  const taxReserve =
    (Math.max(0, operatingProfit) * settings.taxReservePercent) / 100;
  const takeHome = operatingProfit - taxReserve;
  const hourly = work.hours > 0 ? takeHome / work.hours : null;
  const requiredEarnings =
    work.hours > 0
      ? expenses +
        (work.hours * settings.targetHourly) /
          (1 - settings.taxReservePercent / 100)
      : null;
  const earningsGap =
    requiredEarnings === null
      ? null
      : Math.max(0, requiredEarnings - work.earnings);
  const result = {
    vehicleCost,
    expenses,
    operatingProfit,
    taxReserve,
    takeHome,
    hourly,
    requiredEarnings,
    earningsGap,
  };
  if (
    !Object.values(result).every(
      value => value === null || Number.isFinite(value)
    )
  ) {
    throw new RangeError("These values are too large to calculate reliably.");
  }
  return result;
}
