import { describe, it, expect } from "vitest";
import {
  ordinaryIncomeTax2026,
  selfEmployment2026,
  taxPlan2026,
  type TaxPlan2026Input,
} from "../shared/publicTax2026";
import { resellerPrice, weeklyCashflow } from "../shared/publicToolMath";
import { TAX_TOOLS, TAX_TOOL_FAQS } from "../client/src/content/taxTools";
import { ROUTE_SEO } from "../client/src/content/routeSeo";
const base: TaxPlan2026Input = {
  profit: 50000,
  status: "single",
  otherIncome: 0,
  ownSocialSecurityWages: 0,
  householdMedicareWages: 0,
  incomeAdjustments: 0,
  additionalDeductions: 0,
  nonrefundableCredits: 0,
  refundableCredits: 0,
  withholding: 0,
  paymentsMade: 0,
  stateLocalReserve: 0,
};
describe("2026 public tax planning", () => {
  it("publishes matching tax-year scope and FAQs for every tax calculator", () => {
    for (const [slug, meta] of Object.entries(TAX_TOOLS)) {
      const routes = ROUTE_SEO.filter(route => route.path === `/tools/${slug}`);
      expect(routes).toHaveLength(1);
      expect(routes[0].description).toBe(meta.description);
      for (const faq of TAX_TOOL_FAQS) expect(routes[0].body).toContain(faq.a);
    }
  });
  it("matches IRS rate-schedule boundary tax amounts for both statuses", () => {
    for (const [income, tax] of [
      [12400, 1240],
      [50400, 5800],
      [105700, 17966],
      [201775, 41024],
      [256225, 58448],
      [640600, 192979.25],
    ])
      expect(ordinaryIncomeTax2026(income, "single")).toBeCloseTo(tax, 6);
    for (const [income, tax] of [
      [24800, 2480],
      [100800, 11600],
      [211400, 35932],
      [403550, 82048],
      [512450, 116896],
      [768700, 206583.5],
    ])
      expect(ordinaryIncomeTax2026(income, "mfj")).toBeCloseTo(tax, 6);
    expect(ordinaryIncomeTax2026(0, "single")).toBe(0);
  });
  it("uses the $400 net-earnings threshold, not a 1099 threshold", () => {
    expect(selfEmployment2026(400).regularSE).toBe(0);
    expect(selfEmployment2026(433.14).regularSE).toBeCloseTo(61.20073287, 6);
  });
  it("coordinates own wages with the 2026 SS cap and keeps Medicare uncapped", () => {
    const se = selfEmployment2026(300000, 100000, 100000);
    expect(se.socialSecurity).toBe(10478);
    expect(se.medicare).toBeCloseTo(8034.45, 6);
    expect(se.additionalMedicareOnSE).toBeCloseTo(1593.45, 6);
    expect(se.deductibleHalf).toBeCloseTo(9256.225, 6);
    expect(selfEmployment2026(50000, 184500).socialSecurity).toBe(0);
  });
  it("uses the joint Medicare threshold without subtracting spouse wages from the SS cap", () => {
    const se = selfEmployment2026(50000, 0, 300000, "mfj");
    expect(se.socialSecurity).toBe(5725.7);
    expect(se.additionalMedicareOnWages).toBeCloseTo(450, 6);
    expect(se.additionalMedicareOnSE).toBeCloseTo(415.575, 6);
  });
  it("calculates a $50k sole-proprietor example without a second mileage deduction", () => {
    const r = taxPlan2026(base);
    expect(r.regularSE).toBeCloseTo(7064.775, 6);
    expect(r.taxableIncome).toBeCloseTo(30367.6125, 6);
    expect(r.incomeTax).toBeCloseTo(3396.1135, 6);
    expect(r.federalTax).toBeCloseTo(10460.8885, 6);
    expect(r.estimatedPayments).toBeCloseTo(9414.79965, 6);
  });
  it("does not let income-tax credits wipe out SE tax or tip deductions reduce SE earnings", () => {
    const r = taxPlan2026({
      ...base,
      nonrefundableCredits: 100000,
      additionalDeductions: 25000,
    });
    expect(r.federalTax).toBeCloseTo(r.regularSE, 6);
    expect(r.regularSE).toBeCloseTo(7064.775, 6);
  });
  it("distinguishes withholding, prior-year target, payments already made and full-tax reserve", () => {
    const r = taxPlan2026({
      ...base,
      withholding: 1000,
      paymentsMade: 500,
      stateLocalReserve: 200,
      priorYear: { tax: 5000, agi: 150001 },
    });
    expect(r.annualTarget).toBeCloseTo(5500, 6);
    expect(r.estimatedPayments).toBeCloseTo(4500, 6);
    expect(r.equalInstallment).toBeCloseTo(1125, 6);
    expect(r.remainingTarget).toBeCloseTo(4000, 6);
    expect(r.reserve).toBeCloseTo(9160.8885, 6);
    expect(
      taxPlan2026({ ...base, priorYear: { tax: 5000, agi: 150000 } })
        .annualTarget
    ).toBe(5000);
  });
  it("handles the $1000 balance test, zero profit and eligible zero prior tax", () => {
    expect(taxPlan2026({ ...base, withholding: 10000 }).estimatedPayments).toBe(
      0
    );
    expect(taxPlan2026({ ...base, profit: 0 }).reservePercent).toBeNull();
    expect(
      taxPlan2026({ ...base, priorYear: { tax: 0, agi: 0 } }).estimatedPayments
    ).toBe(0);
    expect(taxPlan2026({ ...base, refundableCredits: 20000 }).reserve).toBe(0);
  });
  it("rejects negative, non-finite and unsafe inputs", () => {
    for (const n of [-1, NaN, Infinity, 1e10])
      expect(() => taxPlan2026({ ...base, profit: n })).toThrow();
  });
});
describe("business tools arithmetic", () => {
  it("accounts for fixed fees, extra fee base, return costs and rounds prices up", () => {
    const r = resellerPrice({
      itemCost: 20,
      shipping: 5,
      fixedFees: 1,
      feePercent: 10,
      feeBaseExtra: 3,
      returnAllowance: 2,
      targetRoi: 25,
    });
    expect(r.breakEven).toBe(31.45);
    expect(r.targetPrice).toBe(37);
    expect(r.profit).toBeCloseTo(5, 6);
    expect(r.roi).toBeCloseTo(25, 6);
    expect(r.margin).toBeCloseTo((100 * 5) / 37, 6);
  });
  it("does not divide by zero for a zero-cost item or 100% fee", () => {
    const i = {
      itemCost: 0,
      shipping: 0,
      fixedFees: 0,
      feePercent: 0,
      feeBaseExtra: 0,
      returnAllowance: 0,
      targetRoi: 0,
    };
    expect(resellerPrice(i).roi).toBeNull();
    expect(() => resellerPrice({ ...i, feePercent: 100 })).toThrow();
  });
  it("preserves deposits and counts wraparound/zero-deposit gaps", () => {
    expect(weeklyCashflow([100, 0, 0, 0, 0, 0, 0])).toEqual({
      weekly: 100,
      monthlyAverage: (100 * 52) / 12,
      payoutDays: 1,
      longestGap: 6,
    });
    expect(weeklyCashflow([0, 0, 0, 0, 0, 0, 0]).longestGap).toBe(7);
    expect(weeklyCashflow([1, 1, 1, 1, 1, 1, 1]).longestGap).toBe(0);
    expect(() => weeklyCashflow([-1, 0, 0, 0, 0, 0, 0])).toThrow();
  });
});
