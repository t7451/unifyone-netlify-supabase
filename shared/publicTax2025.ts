/** Historical 2025 planning figures, not a current-year tax filing engine.
 * IRS: https://www.irs.gov/publications/p501
 * SSA: https://www.ssa.gov/news/en/cola/factsheets/2025.html
 * IRS: https://www.irs.gov/instructions/i1040sse
 */
export const STANDARD_DEDUCTION_SINGLE_2025 = 15_750;
export const STANDARD_DEDUCTION_MFJ_2025 = 31_500;
export const SS_WAGE_BASE_2025 = 176_100;

/** Regular SE tax only: assumes no W-2 wages; excludes Additional Medicare Tax. */
export function estimateSelfEmployment2025(netIncome: number) {
  if (!Number.isFinite(netIncome) || netIncome < 0) {
    throw new RangeError("Enter a finite, non-negative net income.");
  }
  const seNetEarnings = netIncome * 0.9235;
  const liable = seNetEarnings >= 400;
  const ssTax = liable ? Math.min(seNetEarnings, SS_WAGE_BASE_2025) * 0.124 : 0;
  const medicareTax = liable ? seNetEarnings * 0.029 : 0;
  const totalSETax = ssTax + medicareTax;
  const deductibleHalf = totalSETax / 2;
  return {
    netIncome,
    seNetEarnings,
    ssTax,
    medicareTax,
    totalSETax,
    deductibleHalf,
    adjustedIncome: netIncome - deductibleHalf,
    quarterlyPayment: totalSETax / 4,
  };
}

/** A loss stays a loss when comparing work; do not silently turn it into $0. */
export function earningsAfterExpenses(gross: number, expenses: number) {
  if (![gross, expenses].every(value => Number.isFinite(value) && value >= 0)) {
    throw new RangeError(
      "Earnings and expenses must be finite and non-negative."
    );
  }
  return gross - expenses;
}
