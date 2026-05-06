import { describe, it, expect } from "vitest";
import {
  TAX_CONSTANTS,
  getNextQuarterlyDueDate,
  computeSelfEmploymentTax,
  computeFederalIncomeTax,
  computeAnnualProjection,
  computeQuarterlyEstimate,
} from "./taxEstimator";

describe("getNextQuarterlyDueDate", () => {
  it("returns Q1 (Apr 15) when called early in the year", () => {
    const r = getNextQuarterlyDueDate(new Date(2025, 0, 1));
    expect(r.quarter).toBe(1);
    expect(r.dueDate.getMonth()).toBe(3);
    expect(r.dueDate.getDate()).toBe(15);
    expect(r.dueDate.getFullYear()).toBe(2025);
  });

  it("returns Q2 (Jun 15) when called in May", () => {
    const r = getNextQuarterlyDueDate(new Date(2025, 4, 1));
    expect(r.quarter).toBe(2);
    expect(r.dueDate.getMonth()).toBe(5);
    expect(r.dueDate.getDate()).toBe(15);
  });

  it("returns Q4 (Jan 15 next year) when called in December", () => {
    const r = getNextQuarterlyDueDate(new Date(2025, 11, 1));
    expect(r.quarter).toBe(4);
    expect(r.dueDate.getFullYear()).toBe(2026);
    expect(r.dueDate.getMonth()).toBe(0);
    expect(r.dueDate.getDate()).toBe(15);
  });

  it("rolls over to next year's Q1 when called after Jan 15 of the next year (past Q4)", () => {
    const r = getNextQuarterlyDueDate(new Date(2026, 0, 16));
    expect(r.quarter).toBe(1);
    expect(r.dueDate.getFullYear()).toBe(2026);
    expect(r.dueDate.getMonth()).toBe(3);
    expect(r.dueDate.getDate()).toBe(15);
  });
});

describe("computeSelfEmploymentTax", () => {
  it("returns all zeros for zero or negative input", () => {
    expect(computeSelfEmploymentTax(0)).toEqual({
      seTaxableCents: 0,
      ssTaxCents: 0,
      medicareTaxCents: 0,
      totalSeTaxCents: 0,
      deductibleSeTaxCents: 0,
    });
    expect(computeSelfEmploymentTax(-100)).toEqual({
      seTaxableCents: 0,
      ssTaxCents: 0,
      medicareTaxCents: 0,
      totalSeTaxCents: 0,
      deductibleSeTaxCents: 0,
    });
  });

  it("computes SE tax on $10,000 net earnings (~$1,413)", () => {
    const r = computeSelfEmploymentTax(10_000_00);
    // 10000 * 0.9235 = 9235
    expect(r.seTaxableCents).toBe(923_500);
    // total ~= 9235 * 0.153 = 1412.96
    expect(r.totalSeTaxCents).toBeGreaterThanOrEqual(141_000);
    expect(r.totalSeTaxCents).toBeLessThanOrEqual(141_500);
    // deductible is half
    expect(r.deductibleSeTaxCents).toBe(Math.round(r.totalSeTaxCents * 0.5));
  });

  it("caps SS portion at the wage base for very high earners ($200k)", () => {
    const r = computeSelfEmploymentTax(20_000_000);
    // seTaxable = 20_000_000 * 0.9235 = 18_470_000 > wage base 17_640_000
    expect(r.seTaxableCents).toBe(18_470_000);
    // SS tax should be capped at wage base * 12.4%
    expect(r.ssTaxCents).toBe(
      Math.round(TAX_CONSTANTS.SS_WAGE_BASE_CENTS * 0.124)
    );
    // Medicare uncapped
    expect(r.medicareTaxCents).toBe(Math.round(18_470_000 * 0.029));
  });
});

describe("computeFederalIncomeTax", () => {
  it("computes ~$7,700 fed income tax on $50k net (default bracket 22%)", () => {
    const r = computeFederalIncomeTax(50_000_00);
    // taxable = 50_000_00 - 1_500_000 = 3_500_000
    expect(r.taxableIncomeCents).toBe(3_500_000);
    // 22% of 3_500_000 = 770_000
    expect(r.fedIncomeTaxCents).toBe(770_000);
  });

  it("clamps taxable income to zero when below the standard deduction", () => {
    const r = computeFederalIncomeTax(500_000);
    expect(r.taxableIncomeCents).toBe(0);
    expect(r.fedIncomeTaxCents).toBe(0);
  });

  it("subtracts half-SE-tax deduction when provided", () => {
    const r = computeFederalIncomeTax(50_000_00, {
      halfSeTaxDeductionCents: 100_000,
    });
    expect(r.taxableIncomeCents).toBe(3_400_000);
    expect(r.fedIncomeTaxCents).toBe(Math.round(3_400_000 * 0.22));
  });
});

describe("computeAnnualProjection", () => {
  it("projects ~$36.5k gross from $10k YTD at day 100", () => {
    const r = computeAnnualProjection({
      ytdGrossCents: 10_000_00,
      ytdMileageDeductionCents: 1_000_00,
      dayOfYear: 100,
    });
    // factor = 365/100 = 3.65
    expect(r.projectedGrossCents).toBe(Math.round(10_000_00 * 3.65));
    expect(r.projectedMileageDeductionCents).toBe(Math.round(1_000_00 * 3.65));
    expect(r.projectedNetCents).toBe(
      r.projectedGrossCents - r.projectedMileageDeductionCents
    );
    expect(r.totalEstimatedTaxCents).toBe(
      r.projectedSeTaxCents + r.projectedFedIncomeTaxCents
    );
  });

  it("returns zero net when expenses exceed gross", () => {
    const r = computeAnnualProjection({
      ytdGrossCents: 1_000_00,
      ytdMileageDeductionCents: 5_000_00,
      dayOfYear: 100,
    });
    expect(r.projectedNetCents).toBe(0);
    expect(r.projectedSeTaxCents).toBe(0);
  });
});

describe("computeQuarterlyEstimate", () => {
  it("annualizes $20k net over 2 quarters to $40k", () => {
    const r = computeQuarterlyEstimate(20_000_00, 2);
    expect(r.annualizedNetCents).toBe(40_000_00);
    expect(r.quarterlyPaymentCents).toBe(
      Math.round((r.annualizedSeTaxCents + r.annualizedFedTaxCents) / 4)
    );
  });
});
