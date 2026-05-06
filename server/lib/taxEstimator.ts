/**
 * server/lib/taxEstimator.ts
 *
 * US federal self-employment tax estimator for gig workers.
 * IRS 2025 constants. All amounts in cents unless noted.
 *
 * References:
 * - IRS Publication 505 (Tax Withholding and Estimated Tax)
 * - IRS Form 1040-ES (Estimated Tax for Individuals)
 * - SE tax: 15.3% on 92.35% of net earnings (Schedule SE)
 * - Standard mileage rate 2025: $0.70/mile
 */

export const TAX_CONSTANTS = {
  /** IRS 2025 standard mileage rate (cents per mile) */
  MILEAGE_RATE_CENTS: 70,
  /** SE tax combined rate (Social Security 12.4% + Medicare 2.9%) */
  SE_TAX_RATE: 0.153,
  /** Portion of net earnings subject to SE tax */
  SE_TAX_BASE_FACTOR: 0.9235,
  /** 2025 Social Security wage base limit (cents) */
  SS_WAGE_BASE_CENTS: 17_640_000,
  /** Default federal income tax bracket assumption for projections (22% — middle bracket) */
  DEFAULT_FED_BRACKET: 0.22,
  /** Standard deduction 2025 single filer (cents) */
  STD_DEDUCTION_SINGLE_CENTS: 1_500_000,
  /** SE tax deduction: half of SE tax is deductible from gross income */
  SE_TAX_DEDUCTION_FACTOR: 0.5,
} as const;

/** IRS Form 1040-ES quarterly estimated tax due dates. */
export interface QuarterlyDueDate {
  quarter: 1 | 2 | 3 | 4;
  dueDate: Date;
  coversPeriod: { start: Date; end: Date };
}

/**
 * Get the next quarterly estimated tax due date after `now`.
 * 2025 dates: Q1 Apr 15, Q2 Jun 16 (15th is Sunday), Q3 Sep 15, Q4 Jan 15 2026.
 * Returns the standard April/June/September/January(next-year) cadence.
 */
export function getNextQuarterlyDueDate(
  now: Date = new Date()
): QuarterlyDueDate {
  const year = now.getFullYear();
  const candidates: QuarterlyDueDate[] = [
    {
      quarter: 1,
      dueDate: new Date(year, 3, 15),
      coversPeriod: { start: new Date(year, 0, 1), end: new Date(year, 2, 31) },
    },
    {
      quarter: 2,
      dueDate: new Date(year, 5, 15),
      coversPeriod: { start: new Date(year, 3, 1), end: new Date(year, 4, 31) },
    },
    {
      quarter: 3,
      dueDate: new Date(year, 8, 15),
      coversPeriod: { start: new Date(year, 5, 1), end: new Date(year, 7, 31) },
    },
    {
      quarter: 4,
      dueDate: new Date(year + 1, 0, 15),
      coversPeriod: {
        start: new Date(year, 8, 1),
        end: new Date(year, 11, 31),
      },
    },
  ];
  for (const c of candidates) {
    if (c.dueDate >= now) return c;
  }
  return {
    quarter: 1,
    dueDate: new Date(year + 1, 3, 15),
    coversPeriod: {
      start: new Date(year + 1, 0, 1),
      end: new Date(year + 1, 2, 31),
    },
  };
}

/**
 * Compute SE tax on net earnings (cents).
 * SE tax = 15.3% × (netEarnings × 92.35%)
 * Capped on the SS portion (12.4%) at SS_WAGE_BASE_CENTS.
 */
export function computeSelfEmploymentTax(netEarningsCents: number): {
  seTaxableCents: number;
  ssTaxCents: number;
  medicareTaxCents: number;
  totalSeTaxCents: number;
  deductibleSeTaxCents: number;
} {
  if (netEarningsCents <= 0) {
    return {
      seTaxableCents: 0,
      ssTaxCents: 0,
      medicareTaxCents: 0,
      totalSeTaxCents: 0,
      deductibleSeTaxCents: 0,
    };
  }
  const seTaxable = Math.round(
    netEarningsCents * TAX_CONSTANTS.SE_TAX_BASE_FACTOR
  );
  const ssTaxable = Math.min(seTaxable, TAX_CONSTANTS.SS_WAGE_BASE_CENTS);
  const ssTax = Math.round(ssTaxable * 0.124);
  const medicareTax = Math.round(seTaxable * 0.029);
  const totalSeTax = ssTax + medicareTax;
  const deductible = Math.round(
    totalSeTax * TAX_CONSTANTS.SE_TAX_DEDUCTION_FACTOR
  );
  return {
    seTaxableCents: seTaxable,
    ssTaxCents: ssTax,
    medicareTaxCents: medicareTax,
    totalSeTaxCents: totalSeTax,
    deductibleSeTaxCents: deductible,
  };
}

/**
 * Estimate federal income tax owed on net self-employment income.
 * Uses simplified flat-bracket approximation (default 22%).
 * Subtracts standard deduction and half-SE-tax deduction.
 */
export function computeFederalIncomeTax(
  netEarningsCents: number,
  options: {
    bracketRate?: number;
    stdDeductionCents?: number;
    halfSeTaxDeductionCents?: number;
  } = {}
): { taxableIncomeCents: number; fedIncomeTaxCents: number } {
  const bracket = options.bracketRate ?? TAX_CONSTANTS.DEFAULT_FED_BRACKET;
  const stdDed =
    options.stdDeductionCents ?? TAX_CONSTANTS.STD_DEDUCTION_SINGLE_CENTS;
  const halfSeDed = options.halfSeTaxDeductionCents ?? 0;
  const taxable = Math.max(0, netEarningsCents - stdDed - halfSeDed);
  return {
    taxableIncomeCents: taxable,
    fedIncomeTaxCents: Math.round(taxable * bracket),
  };
}

/**
 * Project full-year tax obligations from year-to-date data.
 */
export function computeAnnualProjection(input: {
  ytdGrossCents: number;
  ytdMileageDeductionCents: number;
  ytdExpenseCents?: number;
  dayOfYear: number;
  daysInYear?: number;
  bracketRate?: number;
}) {
  const { ytdGrossCents, ytdMileageDeductionCents } = input;
  const ytdExpense = input.ytdExpenseCents ?? 0;
  const daysInYear = input.daysInYear ?? 365;
  const dayOfYear = Math.max(1, input.dayOfYear);

  const factor = daysInYear / dayOfYear;
  const projectedGross = Math.round(ytdGrossCents * factor);
  const projectedMileage = Math.round(ytdMileageDeductionCents * factor);
  const projectedExpense = Math.round(ytdExpense * factor);
  const projectedNet = Math.max(
    0,
    projectedGross - projectedMileage - projectedExpense
  );

  const se = computeSelfEmploymentTax(projectedNet);
  const fed = computeFederalIncomeTax(projectedNet, {
    bracketRate: input.bracketRate,
    halfSeTaxDeductionCents: se.deductibleSeTaxCents,
  });
  const totalEstimated = se.totalSeTaxCents + fed.fedIncomeTaxCents;

  return {
    projectedGrossCents: projectedGross,
    projectedMileageDeductionCents: projectedMileage,
    projectedExpenseCents: projectedExpense,
    projectedNetCents: projectedNet,
    projectedSeTaxCents: se.totalSeTaxCents,
    projectedFedIncomeTaxCents: fed.fedIncomeTaxCents,
    totalEstimatedTaxCents: totalEstimated,
    breakdown: { se, fed },
  };
}

/**
 * Compute the suggested next quarterly payment (1/4 of remaining annual estimate).
 */
export function computeQuarterlyEstimate(
  ytdNetEarningsCents: number,
  quartersElapsed: 1 | 2 | 3 | 4,
  bracketRate: number = TAX_CONSTANTS.DEFAULT_FED_BRACKET
): {
  quarterlyPaymentCents: number;
  annualizedNetCents: number;
  annualizedSeTaxCents: number;
  annualizedFedTaxCents: number;
} {
  const annualizedNet = Math.round((ytdNetEarningsCents / quartersElapsed) * 4);
  const se = computeSelfEmploymentTax(annualizedNet);
  const fed = computeFederalIncomeTax(annualizedNet, {
    bracketRate,
    halfSeTaxDeductionCents: se.deductibleSeTaxCents,
  });
  const totalAnnual = se.totalSeTaxCents + fed.fedIncomeTaxCents;
  return {
    quarterlyPaymentCents: Math.round(totalAnnual / 4),
    annualizedNetCents: annualizedNet,
    annualizedSeTaxCents: se.totalSeTaxCents,
    annualizedFedTaxCents: fed.fedIncomeTaxCents,
  };
}
