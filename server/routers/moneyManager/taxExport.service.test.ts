import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data-access layer so buildTaxReport runs against controlled rows.
// The tax math (server/lib/taxEstimator) is left real — the point is to verify
// the report faithfully aggregates recorded shifts + mileage and applies the
// same IRS 2025 math the live estimate uses.
vi.mock("./moneyManager.repo", () => ({
  getDb: vi.fn(),
  getCompletedShiftsSinceOrdered: vi.fn(),
  getMileageLogsBetween: vi.fn(),
}));

import * as repo from "./moneyManager.repo";
import { taxExportService } from "./taxExport.service";

const mockRepo = vi.mocked(repo);

const shift = (over: Record<string, unknown>) => ({
  grossEarnings: "0",
  tips: "0",
  bonuses: "0",
  totalMiles: "0",
  durationMinutes: 0,
  platform: "DoorDash",
  status: "completed",
  startTime: new Date("2025-03-01T12:00:00Z"),
  ...over,
});

const mileage = (over: Record<string, unknown>) => ({
  date: new Date("2025-02-01T12:00:00Z"),
  miles: "0",
  purpose: "business",
  deductionCents: 0,
  startAddress: "",
  endAddress: "",
  ...over,
});

describe("taxExportService.buildTaxReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Truthy db handle; the mocked repo accessors ignore it.
    mockRepo.getDb.mockResolvedValue({} as never);
  });

  it("aggregates earnings, miles, deductions and computes net", async () => {
    mockRepo.getCompletedShiftsSinceOrdered.mockResolvedValue([
      shift({
        grossEarnings: "100.00",
        tips: "20.00",
        bonuses: "5.00",
        totalMiles: "50",
        durationMinutes: 300, // 5h
        platform: "DoorDash",
      }),
      shift({
        grossEarnings: "80",
        totalMiles: "30",
        durationMinutes: 120, // 2h
        platform: "Uber",
        startTime: new Date("2025-04-01T12:00:00Z"),
      }),
    ] as never);
    mockRepo.getMileageLogsBetween.mockResolvedValue([
      mileage({ miles: "10", deductionCents: 700 }),
    ] as never);

    const report = await taxExportService.buildTaxReport(1, { year: 2025 });

    expect(report.year).toBe(2025);
    expect(report.summary.shiftCount).toBe(2);
    expect(report.summary.totalGrossDollars).toBe(180);
    expect(report.summary.totalTipsDollars).toBe(20);
    expect(report.summary.totalBonusesDollars).toBe(5);
    expect(report.summary.totalEarningsDollars).toBe(205);
    // 80 shift-miles @ $0.70 = $56 + $7 manual = $63
    expect(report.summary.mileageDeductionDollars).toBe(63);
    expect(report.summary.totalMiles).toBe(90);
    expect(report.summary.netEarningsDollars).toBe(142);
  });

  it("computes SE tax on net and maps per-shift $/hr", async () => {
    mockRepo.getCompletedShiftsSinceOrdered.mockResolvedValue([
      shift({
        grossEarnings: "100.00",
        tips: "20.00",
        bonuses: "5.00",
        totalMiles: "50",
        durationMinutes: 300,
      }),
    ] as never);
    mockRepo.getMileageLogsBetween.mockResolvedValue([] as never);

    const report = await taxExportService.buildTaxReport(1, { year: 2025 });

    // net = 125 gross − (50mi × $0.70 = $35) = $90
    expect(report.summary.netEarningsDollars).toBe(90);
    // SE tax is positive on positive net; federal income tax is 0 far below the
    // standard deduction — the export should reflect SE-only liability.
    expect(report.tax.seTaxDollars).toBeGreaterThan(0);
    expect(report.tax.fedIncomeTaxDollars).toBe(0);
    expect(report.tax.totalEstimatedTaxDollars).toBeCloseTo(
      report.tax.seTaxDollars + report.tax.fedIncomeTaxDollars,
      2
    );
    // 125 total / 5h = $25/hr
    expect(report.shifts[0].perHourDollars).toBe(25);
    expect(report.shifts[0].platform).toBe("DoorDash");
  });

  it("returns a zeroed but valid report when the DB is unavailable", async () => {
    mockRepo.getDb.mockResolvedValue(null as never);

    const report = await taxExportService.buildTaxReport(1, { year: 2025 });

    expect(report.summary.shiftCount).toBe(0);
    expect(report.summary.netEarningsDollars).toBe(0);
    expect(report.tax.totalEstimatedTaxDollars).toBe(0);
    expect(report.shifts).toEqual([]);
    expect(report.mileageLogs).toEqual([]);
    // Still surfaces a real next-quarter due date so the document is complete.
    expect(report.tax.nextQuarterlyDueDate).toBeTruthy();
  });
});
