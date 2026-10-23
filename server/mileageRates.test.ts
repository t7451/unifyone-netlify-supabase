import { describe, expect, it } from "vitest";
import {
  AmbiguousMileageYearError,
  UnsupportedMileageYearError,
  calculateBusinessMileageDeductionCents,
  getBusinessMileageRateCents,
  getBusinessMileageRateForDate,
  getDayWeightedBusinessMileageRateCents,
  summarizeRecordedBusinessMileage,
} from "../shared/mileageRates";

describe("verified IRS business mileage periods", () => {
  it.each([
    ["2023-06-01", 65.5],
    ["2024-12-31", 67],
    ["2025-01-01", 70],
    ["2026-01-01", 72.5],
    ["2026-06-30", 72.5],
    ["2026-07-01", 76],
    ["2026-12-31", 76],
  ] as const)("uses the rate for %s", (date, expected) => {
    expect(getBusinessMileageRateForDate(date)).toBe(expected);
  });
  it("does not invent a single annual rate for a year with a midyear change", () => {
    expect(getBusinessMileageRateCents(2025)).toBe(70);
    expect(() => getBusinessMileageRateCents(2026)).toThrow(
      AmbiguousMileageYearError
    );
  });
  it.each(["2022-12-31", "2027-01-01", "2040-01-01"])(
    "reports an unsupported date %s without using a latest-rate fallback",
    date => {
      expect(() => getBusinessMileageRateForDate(date)).toThrow(
        UnsupportedMileageYearError
      );
    }
  );
  it.each(["not-a-date", "2026-02-30", "2026-01", new Date(NaN)])(
    "rejects an invalid mileage date %s",
    date => {
      expect(() => getBusinessMileageRateForDate(date)).toThrow();
    }
  );
  it("uses an explicit UTC date at rate boundaries", () => {
    expect(
      getBusinessMileageRateForDate(new Date("2026-07-01T00:00:00Z"))
    ).toBe(76);
    expect(getBusinessMileageRateForDate("2026-06-30T23:30:00-02:00")).toBe(76);
  });
  it("preserves half-cent rates and rounds only the final dollar deduction into cents", () => {
    expect(calculateBusinessMileageDeductionCents(2, "2026-06-30")).toBe(145);
    expect(calculateBusinessMileageDeductionCents(20, "2026-06-30")).toBe(1450);
    expect(calculateBusinessMileageDeductionCents(20, "2026-07-01")).toBe(1520);
  });
  it("weights the known 2026 periods only for a uniform-daily annual projection", () => {
    expect(getDayWeightedBusinessMileageRateCents(2026)).toBeCloseTo(
      74.26438356
    );
  });
});

describe("saved mileage snapshots", () => {
  it("does not rewrite original saved rates when the current rate differs", () => {
    const shifts = [{ id: 1, startTime: "2026-03-01", totalMiles: "20" }];
    const logs = [
      {
        shiftId: 1,
        date: "2026-03-01",
        miles: "20",
        irsRateCents: "70.00",
        deductionCents: 1400,
      },
      {
        shiftId: null,
        date: "2026-10-01",
        miles: "5",
        irsRateCents: "76.00",
        deductionCents: 380,
      },
    ];
    expect(summarizeRecordedBusinessMileage(shifts, logs)).toEqual({
      totalMiles: 25,
      deductionCents: 1780,
    });
    expect(logs[0].irsRateCents).toBe("70.00");
  });
  it("uses the individual recorded date for shifts without saved auto logs", () => {
    expect(
      summarizeRecordedBusinessMileage(
        [
          { id: 1, startTime: "2026-06-30", totalMiles: "10" },
          { id: 2, startTime: "2026-07-01", totalMiles: "10" },
        ],
        []
      )
    ).toEqual({ totalMiles: 20, deductionCents: 1485 });
  });
  it("keeps stored manual deductions even for dates outside the lookup coverage", () => {
    expect(
      summarizeRecordedBusinessMileage(
        [],
        [
          {
            shiftId: null,
            date: "2022-01-01",
            miles: "10",
            irsRateCents: "58.50",
            deductionCents: 585,
          },
        ]
      )
    ).toEqual({ totalMiles: 10, deductionCents: 585 });
  });
});
