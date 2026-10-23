import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data-access layer so the merge test runs against controlled rows.
// The parser + normalizer tests are pure and never touch the repo.
vi.mock("./moneyManager.repo", () => ({
  getDb: vi.fn(),
  getCompletedShiftsSince: vi.fn(),
  getCompletedShiftsSinceOrdered: vi.fn(),
  getImportedEarningsSince: vi.fn(),
  getMileageDeductionsSince: vi.fn(),
  insertImportBatch: vi.fn(),
  insertImportedEarnings: vi.fn(),
  getImportBatches: vi.fn(),
  deleteImportBatch: vi.fn(),
  deleteImportedEarningsForBatch: vi.fn(),
}));

vi.mock("./earningsImport.repo", () => ({
  getDb: vi.fn(),
  findByFingerprint: vi.fn(),
  getLegacyCandidateRows: vi.fn(),
  insertAtomic: vi.fn(),
  getImportBatches: vi.fn(),
  deleteAtomic: vi.fn(),
}));
import * as importRepo from "./earningsImport.repo";
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
    mockRepo.getMileageDeductionsSince.mockResolvedValue([]);
  });

  it("adds imported earnings/miles to totals but not to avgPerHour", async () => {
    mockRepo.getCompletedShiftsSince.mockResolvedValue([
      {
        id: 1,
        startTime: new Date("2026-06-30T12:00:00Z"),
        grossEarnings: "100",
        tips: "0",
        bonuses: "0",
        totalMiles: "20",
        durationMinutes: 300, // 5h
      },
    ] as never);
    mockRepo.getImportedEarningsSince.mockResolvedValue([
      {
        grossEarnings: "50",
        tips: "0",
        bonuses: "0",
        totalMiles: "10",
        earnedDate: new Date("2026-06-30T00:00:00Z"),
      },
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

describe("earnings import persistence and identity", () => {
  const persistence = vi.mocked(importRepo);
  const csv =
    "Date,Earnings,Tips,Miles,Trip ID\n2026-10-01,20,3,4,trip-1\n2026-10-02,30,2,6,trip-2";
  const input = (
    text = csv,
    platform = "DoorDash",
    fileName = "earnings.csv"
  ) => ({
    platform,
    fileName,
    rows: earningsImportService.previewImport(text, platform).rows,
  });
  beforeEach(() => {
    vi.resetAllMocks();
    persistence.getDb.mockResolvedValue({} as never);
    persistence.findByFingerprint.mockResolvedValue(undefined);
    persistence.getLegacyCandidateRows.mockResolvedValue([]);
    persistence.insertAtomic.mockResolvedValue({ batchId: 8, inserted: 2 });
  });
  it("sends one complete atomic payload and preserves reference metadata", async () => {
    expect(await earningsImportService.commitImport(7, input())).toEqual({
      batchId: 8,
      inserted: 2,
      duplicate: false,
      status: "committed",
      rowCount: 2,
      totalDollars: 55,
    });
    expect(persistence.insertAtomic).toHaveBeenCalledOnce();
    expect(persistence.insertAtomic.mock.calls[0][1]).toBe(7);
    expect(persistence.insertAtomic.mock.calls[0][2]).toMatchObject({
      platform: "DoorDash",
      fileName: "earnings.csv",
      rows: [
        {
          earnedDate: "2026-10-01T00:00:00.000Z",
          grossEarnings: "20.00",
          tips: "3.00",
          totalMiles: "4.00",
          rawRow: { "Trip ID": "trip-1" },
        },
        { grossEarnings: "30.00", rawRow: { "Trip ID": "trip-2" } },
      ],
    });
  });
  it("identifies the same normalized multiset across filenames, row order and CSV formatting", async () => {
    await earningsImportService.commitImport(7, input());
    const first = persistence.insertAtomic.mock.calls[0][2].contentFingerprint;
    const reformatted =
      'trip_id,mileage,tip,amount,pay_date\r\n"trip-2","6.00","2.00","30.00","10/02/2026"\r\n"trip-1","4.00","3.00","20.00","10/01/2026"\r\n';
    await earningsImportService.commitImport(
      7,
      input(reformatted, "door dash", "renamed.csv")
    );
    expect(persistence.insertAtomic.mock.calls[1][2].contentFingerprint).toBe(
      first
    );
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
  it("does not collapse overlapping different files or distinct trip references", async () => {
    await earningsImportService.commitImport(7, input());
    await earningsImportService.commitImport(
      7,
      input(csv.replace("trip-2", "different-trip"))
    );
    await earningsImportService.commitImport(
      7,
      input(csv.split("\n").slice(0, 2).join("\n"))
    );
    const hashes = persistence.insertAtomic.mock.calls.map(
      call => call[2].contentFingerprint
    );
    expect(new Set(hashes).size).toBe(3);
  });
  it("preserves repeated identical rows rather than silently dropping legitimate work", async () => {
    await earningsImportService.commitImport(7, input());
    await earningsImportService.commitImport(
      7,
      input(csv + "\n" + csv.split("\n")[1])
    );
    expect(persistence.insertAtomic.mock.calls[1][2].rows).toHaveLength(3);
    expect(
      persistence.insertAtomic.mock.calls[1][2].contentFingerprint
    ).not.toBe(persistence.insertAtomic.mock.calls[0][2].contentFingerprint);
  });
  it("returns an owned duplicate without writing and reports no inserted income", async () => {
    persistence.findByFingerprint.mockResolvedValue({
      id: 44,
      rowCount: 2,
      totalDollars: 55,
    } as never);
    expect(await earningsImportService.commitImport(7, input())).toEqual({
      batchId: 44,
      inserted: 0,
      duplicate: true,
      status: "duplicate",
      rowCount: 2,
      totalDollars: 55,
    });
    expect(persistence.findByFingerprint.mock.calls[0][1]).toBe(7);
    expect(persistence.insertAtomic).not.toHaveBeenCalled();
  });
  it("recovers a concurrent winner after the conflicting insert statement", async () => {
    persistence.findByFingerprint
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        id: 99,
        rowCount: 2,
        totalDollars: 55,
      } as never);
    persistence.insertAtomic.mockResolvedValue(undefined);
    expect(await earningsImportService.commitImport(7, input())).toMatchObject({
      batchId: 99,
      inserted: 0,
      duplicate: true,
    });
    expect(persistence.findByFingerprint).toHaveBeenCalledTimes(2);
  });
  it("finds exact legacy imports from retained rows without modifying their data", async () => {
    persistence.getLegacyCandidateRows.mockResolvedValue(
      input().rows.map(row => ({
        batchId: 5,
        platform: row.platform,
        earnedDate: new Date(row.earnedDate),
        grossEarnings: row.grossDollars.toFixed(2),
        tips: row.tipsDollars.toFixed(2),
        bonuses: row.bonusDollars.toFixed(2),
        totalMiles: row.miles?.toFixed(2) ?? null,
        rawRow: row.rawRow,
      }))
    );
    expect(await earningsImportService.commitImport(7, input())).toMatchObject({
      batchId: 5,
      duplicate: true,
      inserted: 0,
      totalDollars: 55,
    });
    expect(persistence.getLegacyCandidateRows).toHaveBeenCalledWith(
      expect.anything(),
      7,
      "doordash",
      2
    );
    expect(persistence.insertAtomic).not.toHaveBeenCalled();
  });
  it("refuses to add a complete file on top of a formerly partial legacy import", async () => {
    const row = input().rows[0];
    persistence.getLegacyCandidateRows.mockResolvedValue([
      {
        batchId: 5,
        platform: row.platform,
        earnedDate: new Date(row.earnedDate),
        grossEarnings: "20.00",
        tips: "3.00",
        bonuses: "0.00",
        totalMiles: "4.00",
        rawRow: row.rawRow,
      },
    ]);
    await expect(
      earningsImportService.commitImport(7, input())
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("incomplete"),
    });
    expect(persistence.insertAtomic).not.toHaveBeenCalled();
  });
  it("allows an unrelated same-sized file beside an incomplete legacy import", async () => {
    const row = input().rows[0];
    persistence.getLegacyCandidateRows.mockResolvedValue([
      {
        batchId: 5,
        platform: row.platform,
        earnedDate: new Date(row.earnedDate),
        grossEarnings: "20.00",
        tips: "3.00",
        bonuses: "0.00",
        totalMiles: "4.00",
        rawRow: { ...row.rawRow, "Trip ID": "unrelated-trip" },
      },
    ]);
    expect(await earningsImportService.commitImport(7, input())).toMatchObject({
      duplicate: false,
      inserted: 2,
    });
  });
  it("keeps identical contents on different platforms separate", async () => {
    await earningsImportService.commitImport(7, input());
    await earningsImportService.commitImport(7, input(csv, "Uber"));
    expect(
      persistence.insertAtomic.mock.calls[0][2].contentFingerprint
    ).not.toBe(persistence.insertAtomic.mock.calls[1][2].contentFingerprint);
  });
  it("fails closed when legacy identity cannot be safely checked", async () => {
    persistence.getLegacyCandidateRows.mockResolvedValue(
      Array.from({ length: 25_001 }, () => ({})) as never
    );
    await expect(
      earningsImportService.commitImport(7, input())
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(persistence.insertAtomic).not.toHaveBeenCalled();
  });
  it("propagates atomic persistence errors without claiming successful income", async () => {
    persistence.insertAtomic.mockRejectedValue(
      new Error("row constraint failed")
    );
    await expect(
      earningsImportService.commitImport(7, input())
    ).rejects.toThrow("row constraint failed");
  });
  it("bounds direct commit row counts and payload sizes before querying", async () => {
    await expect(
      earningsImportService.commitImport(7, { ...input(), rows: [] })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      earningsImportService.commitImport(7, {
        ...input(),
        rows: Array(5001).fill(input().rows[0]),
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const large = input();
    large.rows[0].rawRow.note = "x".repeat(2_000_001);
    await expect(
      earningsImportService.commitImport(7, large)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(persistence.getDb).not.toHaveBeenCalled();
  });
  it("rejects ambiguous timestamps, mixed platforms and invalid decimal values", async () => {
    for (const change of [
      { earnedDate: "2026-10-01T12:00:00" },
      { platform: "Uber" },
      { grossDollars: Infinity },
      { miles: 1_000_000 },
    ]) {
      const invalid = input();
      Object.assign(invalid.rows[0], change);
      await expect(
        earningsImportService.commitImport(7, invalid)
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(persistence.getDb).not.toHaveBeenCalled();
  });
  it("keeps explicit offsets as the same UTC instant and preserves adjustments", async () => {
    const corrected = input();
    Object.assign(corrected.rows[0], {
      earnedDate: "2026-09-30T17:00:00-07:00",
      grossDollars: -4.25,
    });
    await earningsImportService.commitImport(7, corrected);
    expect(persistence.insertAtomic.mock.calls[0][2].rows[0]).toMatchObject({
      earnedDate: "2026-10-01T00:00:00.000Z",
      grossEarnings: "-4.25",
    });
  });
  it("uses owner-scoped atomic undo and treats a repeated undo as already absent", async () => {
    persistence.deleteAtomic
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    expect(await earningsImportService.deleteBatch(7, 8)).toEqual({
      deleted: true,
    });
    expect(await earningsImportService.deleteBatch(7, 8)).toEqual({
      deleted: false,
    });
    expect(persistence.deleteAtomic).toHaveBeenCalledWith(
      expect.anything(),
      7,
      8
    );
  });
  it("never returns misleading empty history when its database is unavailable", async () => {
    persistence.getDb.mockResolvedValue(null);
    await expect(earningsImportService.listBatches(7)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
    await expect(
      earningsImportService.commitImport(7, input())
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
  it("bounds preview size and row count", () => {
    expect(() =>
      earningsImportService.previewImport("x".repeat(512_001), "DoorDash")
    ).toThrow(/large/);
    expect(() =>
      earningsImportService.previewImport(
        "Date,Earnings\n" + "2026-10-01,1\n".repeat(5001),
        "DoorDash"
      )
    ).toThrow(/5,000/);
  });
});
