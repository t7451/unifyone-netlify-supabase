import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data-access layer so buildTaxReport runs against controlled rows.
// The tax math (server/lib/taxEstimator) is left real — the point is to verify
// the report faithfully aggregates recorded shifts + mileage and applies the
// same IRS 2025 math the live estimate uses.
vi.mock("./moneyManager.repo", () => ({
  getDb: vi.fn(),
}));

vi.mock("./taxExport.repo", () => ({ getAnnualRecords: vi.fn() }));
import * as annualRepo from "./taxExport.repo";
import * as repo from "./moneyManager.repo";
import { taxExportService } from "./taxExport.service";

const mockRepo = vi.mocked(repo);
const annual = vi.mocked(annualRepo);
let shiftRows: unknown[] = [];
let mileageRows: unknown[] = [];
// Keep legacy tests focused on aggregation while exercising the new annual boundary.
const mockShifts = {
  mockResolvedValue(rows: unknown[]) {
    shiftRows = rows;
  },
};
const mockMileage = {
  mockResolvedValue(rows: unknown[]) {
    mileageRows = rows;
  },
};
annual.getAnnualRecords.mockImplementation(
  async () =>
    ({
      shifts: shiftRows,
      mileage: mileageRows,
      imports: [],
      expenses: [],
    }) as never
);

const shift = (over: Record<string, unknown>) => ({
  id: 1,
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
  shiftId: null,
  irsRateCents: "70.00",
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
    shiftRows = [];
    mileageRows = [];
    annual.getAnnualRecords.mockImplementation(
      async () =>
        ({
          shifts: shiftRows,
          mileage: mileageRows,
          imports: [],
          expenses: [],
        }) as never
    );
    // Truthy db handle; the mocked repo accessors ignore it.
    mockRepo.getDb.mockResolvedValue({} as never);
  });

  it("aggregates earnings, miles, deductions and computes net", async () => {
    mockShifts.mockResolvedValue([
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
    mockMileage.mockResolvedValue([
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
    mockShifts.mockResolvedValue([
      shift({
        grossEarnings: "100.00",
        tips: "20.00",
        bonuses: "5.00",
        totalMiles: "50",
        durationMinutes: 300,
      }),
    ] as never);
    mockMileage.mockResolvedValue([] as never);

    const report = await taxExportService.buildTaxReport(1, { year: 2025 });

    // net = 125 gross − (50mi × $0.70 = $35) = $90
    expect(report.summary.netEarningsDollars).toBe(90);
    // Exact SE tax on $90 net: 15.3% × (90 × 0.9235) = $12.72. Asserting the
    // precise value catches a regression that taxed gross instead of net, or
    // broke the mileage-deduction wiring. Federal income tax is $0 far below the
    // standard deduction, so the export reflects SE-only liability.
    // (Year 2025 is a completed year here, so the estimate is not annualized.)
    expect(report.tax.seTaxDollars).toBe(12.72);
    expect(report.tax.fedIncomeTaxDollars).toBe(0);
    expect(report.tax.totalEstimatedTaxDollars).toBeCloseTo(
      report.tax.seTaxDollars + report.tax.fedIncomeTaxDollars,
      2
    );
    // 125 total / 5h = $25/hr
    expect(report.shifts[0].perHourDollars).toBe(25);
    expect(report.shifts[0].platform).toBe("DoorDash");
  });

  it("throws (not a silent zero report) when the DB is unavailable", async () => {
    mockRepo.getDb.mockResolvedValue(null as never);

    // A DB outage must fail loudly — a zeroed report is indistinguishable from a
    // real no-activity year and could be handed to a CPA as fact.
    await expect(
      taxExportService.buildTaxReport(1, { year: 2025 })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

it("reports both 2026 periods, applies per-shift dates, and preserves stored log rates without duplicate totals", async () => {
  mockRepo.getDb.mockResolvedValue({} as never);
  mockShifts.mockResolvedValue([
    shift({
      id: 1,
      startTime: new Date("2026-06-30T12:00:00Z"),
      totalMiles: "10",
    }),
    shift({
      id: 2,
      startTime: new Date("2026-07-01T12:00:00Z"),
      totalMiles: "10",
    }),
    shift({
      id: 3,
      startTime: new Date("2026-07-02T12:00:00Z"),
      totalMiles: "10",
    }),
  ] as never);
  mockMileage.mockResolvedValue([
    mileage({
      shiftId: 3,
      date: new Date("2026-07-02T12:00:00Z"),
      miles: "10",
      irsRateCents: "72.50",
      deductionCents: 725,
    }),
    mileage({
      date: new Date("2026-07-02T12:00:00Z"),
      miles: "2",
      irsRateCents: "70.00",
      deductionCents: 140,
    }),
  ] as never);
  const report = await taxExportService.buildTaxReport(1, { year: 2026 });
  expect(report.irsMileageRate).toBeNull();
  expect(report.mileageRatePeriods.map(period => period.rateCents)).toEqual([
    72.5, 76,
  ]);
  expect(report.summary.totalMiles).toBe(32);
  expect(report.summary.mileageDeductionDollars).toBe(23.5);
  expect(report.mileageLogs[0]).toMatchObject({
    rateCents: 72.5,
    deductionDollars: 7.25,
    includedSeparately: false,
  });
});
it("does not export an invented mileage rate for an unsupported year", async () => {
  mockRepo.getDb.mockResolvedValue({} as never);
  await expect(
    taxExportService.buildTaxReport(1, { year: 2027 })
  ).rejects.toThrow("No verified business mileage rate");
});

describe("annual accountant packet source coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.getDb.mockResolvedValue({} as never);
  });

  it("separates manual/timer/CSV income and expense categories without mileage plus actual-cost subtraction", async () => {
    annual.getAnnualRecords.mockResolvedValue({
      shifts: [
        shift({
          entrySource: "manual",
          grossEarnings: "100",
          tips: "10",
          totalMiles: "10",
        }),
        shift({ id: 2, entrySource: "timer", grossEarnings: "200" }),
      ],
      mileage: [],
      imports: [
        {
          id: 8,
          batchId: 2,
          date: new Date("2025-12-31T23:59:59Z"),
          platform: "Freelance",
          grossEarnings: "300",
          tips: "0",
          bonuses: "5",
          totalMiles: "12",
        },
      ],
      expenses: [
        {
          id: 9,
          date: "2025-12-31",
          category: "fuel",
          amountCents: 2500,
          merchant: "Fuel",
          notes: null,
        },
        {
          id: 10,
          date: "2025-01-01",
          category: "software",
          amountCents: 1234,
          merchant: null,
          notes: "App",
        },
        {
          id: 11,
          date: "2025-02-01",
          category: "fuel",
          amountCents: 100,
          merchant: null,
          notes: null,
        },
      ],
    } as never);
    const report = await taxExportService.buildTaxReport(7, { year: 2025 });
    expect(annual.getAnnualRecords).toHaveBeenCalledWith({}, 7, 2025);
    expect(report.coverage.sources).toEqual({
      manual: { count: 1, totalDollars: 110 },
      timer: { count: 1, totalDollars: 200 },
      csv: { count: 1, totalDollars: 305 },
      expenses: { count: 3, totalDollars: 38.34 },
    });
    expect(report.shifts.map(row => row.source)).toEqual(["manual", "timer"]);
    expect(report.imports[0]).toMatchObject({
      batchId: 2,
      totalDollars: 305,
      durationHours: null,
      miles: 12,
    });
    expect(report.bookkeeping).toEqual({
      recordedIncomeDollars: 615,
      recordedExpenseDollars: 38.34,
      incomeAfterRecordedExpensesDollars: 576.66,
      mileageDeductionDollars: 7,
      expensesByCategory: [
        { category: "fuel", amountCents: 2600, count: 2 },
        { category: "software", amountCents: 1234, count: 1 },
      ],
    });
    expect(report.summary.totalEarningsDollars).toBe(310); // Legacy work-only scope retained.
    expect(report.summary.totalMiles).toBe(10); // No imported mileage deduction inferred.
    expect(report.coverage.reconciled).toBe(false);
    expect(report.coverage.warnings.join(" ")).toMatch(/overlapping records/);
    expect(report.coverage.exclusions.join(" ")).toMatch(
      /Bank transactions and deposits/
    );
    expect(report.tax).toMatchObject({
      status: "unavailable",
      basisYear: 2025,
    });
  });

  it("never labels 2026 numeric compatibility fields as current-year tax liability", async () => {
    annual.getAnnualRecords.mockResolvedValue({
      shifts: [
        shift({
          startTime: new Date("2026-01-02T12:00:00Z"),
          grossEarnings: "100000",
        }),
      ],
      mileage: [],
      imports: [],
      expenses: [],
    } as never);
    const report = await taxExportService.buildTaxReport(1, { year: 2026 });
    expect(report.tax.status).toBe("unavailable");
    expect(report.tax.reason).toMatch(/2025 rules/);
    expect(report.tax.reason).toMatch(/not this year's liability/);
  });

  it("retains clearly scoped legacy 2025 illustration when no CSV or expense coverage is omitted", async () => {
    annual.getAnnualRecords.mockResolvedValue({
      shifts: [],
      mileage: [],
      imports: [],
      expenses: [],
    } as never);
    const report = await taxExportService.buildTaxReport(1, { year: 2025 });
    expect(report.tax.status).toBe("legacy_2025_estimate");
    expect(report.tax.reason).toMatch(/Not a tax liability/);
    expect(report.bookkeeping.recordedIncomeDollars).toBe(0);
  });

  it("fails the entire packet on any source outage instead of silently exporting missing expenses/imports", async () => {
    annual.getAnnualRecords.mockRejectedValue(
      new Error("expense query failed")
    );
    await expect(
      taxExportService.buildTaxReport(1, { year: 2025 })
    ).rejects.toThrow("expense query failed");
  });

  it("fails rather than losing integer cents for an unsafe aggregate", async () => {
    annual.getAnnualRecords.mockResolvedValue({
      shifts: [],
      mileage: [],
      imports: [],
      expenses: [{ amountCents: Number.MAX_SAFE_INTEGER }, { amountCents: 1 }],
    } as never);
    await expect(
      taxExportService.buildTaxReport(1, { year: 2025 })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

it("does not count fallback mileage in the shift year when a saved log belongs to another year", async () => {
  mockRepo.getDb.mockResolvedValue({} as never);
  annual.getAnnualRecords.mockResolvedValue({
    shifts: [
      shift({
        id: 123,
        startTime: new Date("2025-12-31T23:00:00Z"),
        totalMiles: "10",
        grossEarnings: "50",
      }),
    ],
    mileage: [],
    imports: [],
    expenses: [],
    mileageElsewhere: [{ shiftId: 123 }],
  } as never);
  const report = await taxExportService.buildTaxReport(1, { year: 2025 });
  expect(report.shifts[0].miles).toBe(10);
  expect(report.summary.totalMiles).toBe(0);
  expect(report.summary.mileageDeductionDollars).toBe(0);
  expect(report.summary.totalEarningsDollars).toBe(50);
});
