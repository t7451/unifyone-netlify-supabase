import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data-access layer so the merge test runs against controlled rows.
// The parser + normalizer tests are pure and never touch the repo.
vi.mock("./moneyManager.repo", () => ({
  getDb: vi.fn(),
  getCompletedShiftsSince: vi.fn(),
  getCompletedShiftsSinceOrdered: vi.fn(),
  getImportedEarningsSince: vi.fn(),
  insertImportBatch: vi.fn(),
  insertImportedEarnings: vi.fn(),
  getImportBatches: vi.fn(),
  deleteImportBatch: vi.fn(),
  deleteImportedEarningsForBatch: vi.fn(),
}));

import * as repo from "./moneyManager.repo";
import { parseCsv, earningsImportService } from "./earningsImport.service";
import { shiftsService } from "./shifts.service";

const mockRepo = vi.mocked(repo);

// ── parseCsv ──────────────────────────────────────────────────────────────────
describe("parseCsv", () => {
  it("parses a simple LF matrix without a phantom trailing row", () => {
    expect(parseCsv("a,b,c\n1,2,3\n4,5,6")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("drops a spurious empty row from a trailing newline", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    expect(parseCsv('name,amount\n"Doe, Jane",100')).toEqual([
      ["name", "amount"],
      ["Doe, Jane", "100"],
    ]);
  });

  it("unescapes doubled double-quotes inside a quoted field", () => {
    expect(parseCsv('note\n"she said ""hi"""')).toEqual([
      ["note"],
      ['she said "hi"'],
    ]);
  });

  it("keeps newlines embedded inside quoted fields", () => {
    expect(parseCsv('a\n"line1\nline2"')).toEqual([["a"], ["line1\nline2"]]);
  });

  it("preserves a trailing empty field within a line", () => {
    expect(parseCsv("a,b\n1,")).toEqual([
      ["a", "b"],
      ["1", ""],
    ]);
  });

  it("returns an empty matrix for empty text", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

// ── Per-platform normalization ────────────────────────────────────────────────
describe("earningsImportService.previewImport", () => {
  it("normalizes a DoorDash-style export", () => {
    const csv = [
      "Date,Total earnings,Tips,Promotions,Miles",
      "2025-03-01,45.50,12.00,5.00,22.4",
      "03/02/2025,30.00,8.00,0,15",
    ].join("\n");

    const { rows, skipped, totals } = earningsImportService.previewImport(
      csv,
      "DoorDash"
    );

    expect(skipped).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      platform: "DoorDash",
      grossDollars: 45.5,
      tipsDollars: 12,
      bonusDollars: 5,
      miles: 22.4,
    });
    expect(rows[0].earnedDate).toBe("2025-03-01T00:00:00.000Z");
    // 03/02/2025 US date → 2025-03-02 UTC
    expect(rows[1].earnedDate).toBe("2025-03-02T00:00:00.000Z");
    expect(totals.grossDollars).toBe(75.5);
    expect(totals.tipsDollars).toBe(20);
    expect(totals.bonusDollars).toBe(5);
    expect(totals.totalDollars).toBe(100.5);
    expect(totals.miles).toBe(37.4);
  });

  it("maps Uber headers (Fare / Tip / Surge / Distance)", () => {
    const csv = [
      "Trip date,Fare,Tip,Surge,Distance",
      "2025-04-10,18.25,3.50,2.00,8.1",
    ].join("\n");

    const { rows } = earningsImportService.previewImport(csv, "Uber");
    expect(rows[0]).toMatchObject({
      grossDollars: 18.25,
      tipsDollars: 3.5,
      bonusDollars: 2,
      miles: 8.1,
    });
  });

  it("maps Lyft headers (Ride earnings / Tips / Bonus)", () => {
    const csv = [
      "Date,Ride earnings,Tips,Bonus",
      "2025-05-05,22.00,6.00,4.00",
    ].join("\n");

    const { rows } = earningsImportService.previewImport(csv, "Lyft");
    expect(rows[0]).toMatchObject({
      grossDollars: 22,
      tipsDollars: 6,
      bonusDollars: 4,
      miles: null,
    });
  });

  it("maps Instacart headers (Batch earnings / Customer tip)", () => {
    const csv = [
      "Date,Batch earnings,Customer tip",
      "2025-06-01,14.00,9.50",
    ].join("\n");

    const { rows } = earningsImportService.previewImport(csv, "Instacart");
    expect(rows[0]).toMatchObject({
      grossDollars: 14,
      tipsDollars: 9.5,
      bonusDollars: 0,
    });
  });

  it("strips $ and thousands separators from money fields", () => {
    const csv = ["Date,Earnings,Tips", '2025-01-15,"$1,234.50",$20.00'].join(
      "\n"
    );
    const { rows } = earningsImportService.previewImport(csv, "Other");
    expect(rows[0].grossDollars).toBe(1234.5);
    expect(rows[0].tipsDollars).toBe(20);
  });

  it("collects malformed rows (bad date, no earnings) as skipped", () => {
    const csv = [
      "Date,Earnings,Tips",
      "not-a-date,10,2", // unparseable date
      "2025-02-01,,", // no numeric earnings
      "2025-02-02,25,5", // valid
    ].join("\n");

    const { rows, skipped } = earningsImportService.previewImport(csv, "Other");
    expect(rows).toHaveLength(1);
    expect(rows[0].grossDollars).toBe(25);
    expect(skipped).toHaveLength(2);
    expect(skipped[0].reason).toMatch(/date/);
    expect(skipped[1].reason).toMatch(/earnings/);
  });

  it("ignores fully-blank lines without reporting them as skipped", () => {
    const csv = ["Date,Earnings", "2025-02-02,25", "", "  ,  "].join("\n");
    const { rows, skipped } = earningsImportService.previewImport(csv, "Other");
    expect(rows).toHaveLength(1);
    expect(skipped).toHaveLength(0);
  });

  it("does not let a non-earnings column (e.g. 'Payment method') grab gross", () => {
    // "Payment method" contains the substring "pay" but is not a whole-word
    // match, so gross must bind to the real "Amount" column, not skip the row.
    const csv = [
      "Date,Payment method,Amount",
      "2025-07-01,Direct deposit,42.00",
    ].join("\n");
    const { rows, skipped } = earningsImportService.previewImport(csv, "Other");
    expect(skipped).toHaveLength(0);
    expect(rows[0].grossDollars).toBe(42);
  });

  it("maps 'Weekly earnings' to gross, not to the date column", () => {
    // "Weekly earnings" contains "week" (a date alias) as a substring but not as
    // a word, so it must not be claimed as the date field.
    const csv = ["Date,Weekly earnings", "2025-07-01,120.00"].join("\n");
    const { rows, skipped } = earningsImportService.previewImport(csv, "Other");
    expect(skipped).toHaveLength(0);
    expect(rows[0].grossDollars).toBe(120);
    expect(rows[0].earnedDate).toBe("2025-07-01T00:00:00.000Z");
  });

  it("returns empty for header-only or empty input", () => {
    expect(
      earningsImportService.previewImport("Date,Earnings", "Other").rows
    ).toHaveLength(0);
    expect(earningsImportService.previewImport("", "Other").rows).toHaveLength(
      0
    );
  });
});

// ── Merge into consolidation ──────────────────────────────────────────────────
describe("getShiftBreakdown merge with imported earnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.getDb.mockResolvedValue({} as never);
  });

  const shift = (over: Record<string, unknown>) => ({
    grossEarnings: "0",
    tips: "0",
    bonuses: "0",
    totalMiles: "0",
    durationMinutes: 0,
    platform: "DoorDash",
    startTime: new Date("2025-03-01T12:00:00Z"),
    ...over,
  });

  it("lifts a platform's earnings total but leaves avgPerHour unchanged", async () => {
    mockRepo.getCompletedShiftsSinceOrdered.mockResolvedValue([
      shift({
        grossEarnings: "100",
        totalMiles: "20",
        durationMinutes: 300, // 5h → $20/hr
        platform: "DoorDash",
      }),
    ] as never);
    mockRepo.getImportedEarningsSince.mockResolvedValue([
      {
        platform: "DoorDash",
        grossEarnings: "50",
        tips: "0",
        bonuses: "0",
        totalMiles: "10",
      },
    ] as never);

    const result = await shiftsService.getShiftBreakdown(1, {
      period: "month",
    });

    const dd = result.byPlatform.find(p => p.platform === "DoorDash");
    expect(dd).toBeDefined();
    // Earnings lifted by the imported $50 (100 + 50).
    expect(dd?.totalEarnings).toBe(150);
    // Miles lifted by the imported 10 (20 + 10).
    expect(dd?.totalMiles).toBe(30);
    // avgPerHour stays shift-only: $100 / 5h = $20/hr, NOT $150 / 5h.
    expect(dd?.avgPerHour).toBe(20);
    // Imports are not shifts.
    expect(dd?.totalShifts).toBe(1);
    // byHour/byDayOfWeek only reflect the single shift.
    expect(result.byHour.reduce((s, h) => s + h.shiftCount, 0)).toBe(1);
  });

  it("surfaces an import-only platform with avgPerHour 0 (no duration)", async () => {
    mockRepo.getCompletedShiftsSinceOrdered.mockResolvedValue([] as never);
    mockRepo.getImportedEarningsSince.mockResolvedValue([
      {
        platform: "Instacart",
        grossEarnings: "40",
        tips: "10",
        bonuses: "0",
        totalMiles: "5",
      },
    ] as never);

    const result = await shiftsService.getShiftBreakdown(1, { period: "year" });
    const ic = result.byPlatform.find(p => p.platform === "Instacart");
    expect(ic?.totalEarnings).toBe(50);
    expect(ic?.avgPerHour).toBe(0);
    expect(ic?.totalShifts).toBe(0);
  });
});

// ── getShiftStats merge ───────────────────────────────────────────────────────
describe("getShiftStats merge with imported earnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.getDb.mockResolvedValue({} as never);
  });

  it("adds imported earnings/miles to totals but not to avgPerHour", async () => {
    mockRepo.getCompletedShiftsSince.mockResolvedValue([
      {
        grossEarnings: "100",
        tips: "0",
        bonuses: "0",
        totalMiles: "20",
        durationMinutes: 300, // 5h
      },
    ] as never);
    mockRepo.getImportedEarningsSince.mockResolvedValue([
      { grossEarnings: "50", tips: "0", bonuses: "0", totalMiles: "10" },
    ] as never);

    const stats = await shiftsService.getShiftStats(1, { period: "month" });
    expect(stats.totalEarnings).toBe(150);
    expect(stats.totalMiles).toBe(30);
    expect(stats.totalShifts).toBe(1);
    expect(stats.totalHours).toBe(5);
    // avgPerHour is shift-only: 100 / 5 = 20.
    expect(stats.avgPerHour).toBe(20);
  });
});
