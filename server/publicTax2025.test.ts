import { describe, expect, it } from "vitest";
import {
  estimateSelfEmployment2025,
  earningsAfterExpenses,
  STANDARD_DEDUCTION_SINGLE_2025,
  STANDARD_DEDUCTION_MFJ_2025,
} from "../shared/publicTax2025";

describe("public 2025 planning calculations", () => {
  it("uses the revised 2025 standard deductions", () => {
    expect(STANDARD_DEDUCTION_SINGLE_2025).toBe(15750);
    expect(STANDARD_DEDUCTION_MFJ_2025).toBe(31500);
  });
  it("does not impose regular SE tax below the Schedule SE threshold", () => {
    expect(estimateSelfEmployment2025(400).totalSETax).toBe(0);
    expect(estimateSelfEmployment2025(500).totalSETax).toBeCloseTo(70.64775);
  });
  it("caps Social Security at the 2025 wage base while Medicare continues", () => {
    const high = estimateSelfEmployment2025(300000);
    expect(high.ssTax).toBeCloseTo(21836.4);
    expect(high.medicareTax).toBeCloseTo(8034.45);
    expect(high.deductibleHalf).toBeCloseTo(high.totalSETax / 2);
  });
  it("preserves an unprofitable shift", () => {
    expect(earningsAfterExpenses(100, 140)).toBe(-40);
  });
  it("rejects non-finite and negative inputs", () => {
    for (const value of [Infinity, NaN, -1]) {
      expect(() => estimateSelfEmployment2025(value)).toThrow(RangeError);
      expect(() => earningsAfterExpenses(100, value)).toThrow(RangeError);
    }
  });
});
