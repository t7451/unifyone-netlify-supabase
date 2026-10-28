import { describe, expect, it } from "vitest";
import {
  buildAccountantRecordsCsv,
  escapeAccountantCsvCell,
  formatTaxReportMileageRates,
  type TaxReport,
} from "../../client/src/lib/taxExport";

const report = (): TaxReport => ({
  year: 2026,
  generatedAt: "2026-10-23T12:00:00Z",
  irsMileageRate: null,
  mileageRatePeriods: [
    {
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      rateCents: 72.5,
      label: "January–June 2026",
    },
    {
      startDate: "2026-07-01",
      endDate: "2026-12-31",
      rateCents: 76,
      label: "July–December 2026",
    },
  ],
  summary: {
    shiftCount: 0,
    totalGrossDollars: 0,
    totalTipsDollars: 0,
    totalBonusesDollars: 0,
    totalEarningsDollars: 0,
    totalMiles: 0,
    mileageDeductionDollars: 0,
    netEarningsDollars: 0,
  },
  coverage: {
    sources: {
      timer: { count: 0, totalDollars: 0 },
      manual: { count: 0, totalDollars: 0 },
      csv: { count: 0, totalDollars: 0 },
      expenses: { count: 1, totalDollars: 12.5 },
    },
    mileage: { count: 0, totalMiles: 0, deductionDollars: 0 },
    exclusions: [],
    warnings: [],
    reconciled: false,
  },
  bookkeeping: {
    recordedIncomeDollars: 0,
    recordedExpenseDollars: 12.5,
    incomeAfterRecordedExpensesDollars: -12.5,
    mileageDeductionDollars: 0,
    expensesByCategory: [{ category: "fuel", amountCents: 1250, count: 1 }],
  },
  shifts: [],
  imports: [],
  expenses: [
    {
      id: 1,
      date: "2026-10-23",
      category: "fuel",
      amountCents: 1250,
      merchant: null,
      notes: null,
    },
  ],
  mileageLogs: [],
  tax: {
    status: "unavailable",
    basisYear: 2025,
    reason: "No complete estimate",
    seTaxDollars: 12345,
    fedIncomeTaxDollars: 12345,
    totalEstimatedTaxDollars: 24690,
    bracketRate: 0.22,
    nextQuarterlyDueDate: "2027-01-15",
    nextQuarter: 4,
  },
});
describe("accountant records CSV formatting", () => {
  it.each([
    "=2+3",
    "+SUM(A1)",
    "-SUM(A1)",
    "@SUM(A1)",
    "  =1",
    "\t=1",
    "\u0000=1",
    "\ufeff=1",
    "\n=1",
  ])(
    "neutralizes spreadsheet formulas after whitespace/control prefixes: %j",
    value => {
      const cell = escapeAccountantCsvCell(value);
      expect(cell.startsWith("'")).toBe(true);
    }
  );
  it("preserves quotes, commas and text as one safe CSV cell", () => {
    expect(escapeAccountantCsvCell('  =HYPERLINK("x,y")')).toBe(
      '"\'  =HYPERLINK(""x,y"")"'
    );
    expect(escapeAccountantCsvCell("Client\nproject")).toBe("Client project");
    expect(escapeAccountantCsvCell(-12.5)).toBe("-12.5");
  });
  it("preserves half-cent rates and separate annual periods", () => {
    expect(formatTaxReportMileageRates(report())).toBe(
      "2026-01-01 to 2026-06-30: $0.725/mi; 2026-07-01 to 2026-12-31: $0.76/mi"
    );
  });
  it("exports empty ledgers and null optional strings without inventing missing records", () => {
    const csv = buildAccountantRecordsCsv(report());
    expect(csv).toContain(
      "Recorded expense ledger — local calendar dates\r\nDate,Category,Amount USD,Merchant,Notes\r\n2026-10-23,fuel,12.50,,"
    );
    expect(csv.match(/No records for this year/g)).toHaveLength(3);
    expect(csv).not.toMatch(/undefined|null|NaN/);
  });
  it("keeps a loss visible and omits incompatible legacy tax figures", () => {
    const csv = buildAccountantRecordsCsv(report());
    expect(csv).toContain(
      "Income minus recorded expenses (unreconciled),'-$12.50"
    );
    expect(csv).toContain(
      "Recorded expenses (not a tax deductibility decision),$12.50"
    );
    expect(csv).not.toMatch(/12345|24690|1040-ES|Estimated annual tax/);
    expect(csv).toContain(
      "Linked provider activity and bank deposits are excluded"
    );
  });
});

it("exports unknown work duration as Not supplied while preserving a measured zero and full short duration", () => {
  const input = report();
  const row = {
    source: "timer" as const,
    date: "2026-10-01T12:00:00Z",
    platform: "Short work",
    durationHours: 1 / 60,
    grossDollars: 60,
    tipsDollars: 0,
    bonusesDollars: 0,
    totalDollars: 60,
    miles: 0,
    perHourDollars: 3600,
  };
  input.shifts = [
    row,
    {
      ...row,
      platform: "Missing duration",
      durationHours: null,
      perHourDollars: null,
    },
    {
      ...row,
      platform: "Measured zero",
      durationHours: 0,
      perHourDollars: null,
    },
  ];
  const csv = buildAccountantRecordsCsv(input);
  expect(csv).toContain("timer,Short work,0.016666666666666666,60.00");
  expect(csv).toContain("timer,Missing duration,Not supplied,60.00");
  expect(csv).toContain("timer,Measured zero,0,60.00");
});

it("marks unknown imported miles without replacing an actual zero", () => {
  const input = report();
  const row = {
    id: 1,
    batchId: 2,
    date: "2026-10-01T00:00:00Z",
    platform: "Missing miles",
    grossDollars: 10,
    tipsDollars: 0,
    bonusesDollars: 0,
    totalDollars: 10,
    miles: null,
    durationHours: null,
  };
  input.imports = [row, { ...row, id: 2, platform: "Zero miles", miles: 0 }];
  const csv = buildAccountantRecordsCsv(input);
  expect(csv).toContain(
    "Missing miles,Not supplied,10.00,0.00,0.00,10.00,Not supplied"
  );
  expect(csv).toContain("Zero miles,Not supplied,10.00,0.00,0.00,10.00,0");
});
