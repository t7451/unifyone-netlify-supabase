/** 2026 planning model. Sources reviewed November 7, 2026:
 * https://www.irs.gov/pub/irs-pdf/f1040es.pdf (worksheets and rate schedules)
 * https://www.irs.gov/taxtopics/tc554
 * https://www.irs.gov/taxtopics/tc560
 * https://www.ssa.gov/oact/cola/cbb.html
 * One self-employed person; ordinary income only. Eligibility is not inferred.
 */
export type FilingStatus2026 = "single" | "mfj";
export const TAX_YEAR = 2026;
export const SS_WAGE_BASE = 184_500;
export const STANDARD_DEDUCTION = { single: 16_100, mfj: 32_200 };
export const ESTIMATED_DUE_DATES = [
  "April 15, 2026",
  "June 15, 2026",
  "September 15, 2026",
  "January 15, 2027",
];
const LIMITS = {
  single: [12_400, 50_400, 105_700, 201_775, 256_225, 640_600, Infinity],
  mfj: [24_800, 100_800, 211_400, 403_550, 512_450, 768_700, Infinity],
};
const RATES = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
function nonnegative(...values: number[]) {
  if (!values.every(v => Number.isFinite(v) && v >= 0 && v <= 1e9))
    throw new RangeError(
      "Enter finite, non-negative amounts no greater than 1 billion."
    );
}
export function ordinaryIncomeTax2026(
  taxable: number,
  status: FilingStatus2026
) {
  nonnegative(taxable);
  let floor = 0;
  return LIMITS[status].reduce((tax, ceiling, i) => {
    const slice = Math.max(0, Math.min(taxable, ceiling) - floor);
    floor = ceiling;
    return tax + slice * RATES[i];
  }, 0);
}
export function selfEmployment2026(
  profit: number,
  ownSocialSecurityWages = 0,
  householdMedicareWages = 0,
  status: FilingStatus2026 = "single"
) {
  nonnegative(profit, ownSocialSecurityWages, householdMedicareWages);
  const netEarnings = profit * 0.9235;
  const taxableSE = netEarnings >= 400 ? netEarnings : 0;
  const socialSecurity =
    Math.min(taxableSE, Math.max(0, SS_WAGE_BASE - ownSocialSecurityWages)) *
    0.124;
  const medicare = taxableSE * 0.029;
  const regularSE = socialSecurity + medicare;
  const threshold = status === "mfj" ? 250_000 : 200_000;
  const additionalMedicareOnWages =
    Math.max(0, householdMedicareWages - threshold) * 0.009;
  const additionalMedicareOnSE =
    Math.max(0, taxableSE - Math.max(0, threshold - householdMedicareWages)) *
    0.009;
  return {
    netEarnings,
    socialSecurity,
    medicare,
    regularSE,
    deductibleHalf: regularSE / 2,
    additionalMedicareOnWages,
    additionalMedicareOnSE,
    additionalMedicare: additionalMedicareOnWages + additionalMedicareOnSE,
  };
}
export interface TaxPlan2026Input {
  profit: number;
  status: FilingStatus2026;
  otherIncome: number;
  ownSocialSecurityWages: number;
  householdMedicareWages: number;
  incomeAdjustments: number;
  additionalDeductions: number;
  nonrefundableCredits: number;
  refundableCredits: number;
  withholding: number;
  paymentsMade: number;
  stateLocalReserve: number;
  priorYear?: { tax: number; agi: number };
}
export function taxPlan2026(input: TaxPlan2026Input) {
  const {
    profit,
    status,
    otherIncome,
    ownSocialSecurityWages,
    householdMedicareWages,
    incomeAdjustments,
    additionalDeductions,
    nonrefundableCredits,
    refundableCredits,
    withholding,
    paymentsMade,
    stateLocalReserve,
    priorYear,
  } = input;
  nonnegative(
    profit,
    otherIncome,
    ownSocialSecurityWages,
    householdMedicareWages,
    incomeAdjustments,
    additionalDeductions,
    nonrefundableCredits,
    refundableCredits,
    withholding,
    paymentsMade,
    stateLocalReserve
  );
  if (priorYear) nonnegative(priorYear.tax, priorYear.agi);
  const se = selfEmployment2026(
    profit,
    ownSocialSecurityWages,
    householdMedicareWages,
    status
  );
  const agi = Math.max(
    0,
    profit + otherIncome - se.deductibleHalf - incomeAdjustments
  );
  const taxableIncome = Math.max(
    0,
    agi - STANDARD_DEDUCTION[status] - additionalDeductions
  );
  const incomeTax = ordinaryIncomeTax2026(taxableIncome, status);
  const federalTax = Math.max(
    0,
    Math.max(0, incomeTax - nonrefundableCredits) +
      se.regularSE +
      se.additionalMedicare -
      refundableCredits
  );
  const beforeEstimates = Math.max(0, federalTax - withholding);
  const annualTarget = Math.min(
    federalTax * 0.9,
    priorYear ? priorYear.tax * (priorYear.agi > 150_000 ? 1.1 : 1) : Infinity
  );
  const estimatedPayments =
    beforeEstimates < 1000 ? 0 : Math.max(0, annualTarget - withholding);
  const remainingFederal = Math.max(0, beforeEstimates - paymentsMade);
  const reserve = remainingFederal + stateLocalReserve;
  return {
    ...se,
    agi,
    taxableIncome,
    incomeTax,
    federalTax,
    annualTarget,
    estimatedPayments,
    equalInstallment: estimatedPayments / 4,
    remainingTarget: Math.max(0, estimatedPayments - paymentsMade),
    remainingFederal,
    reserve,
    reservePercent: profit > 0 ? (reserve / profit) * 100 : null,
  };
}
