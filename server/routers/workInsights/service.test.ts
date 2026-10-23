import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./repo", () => ({ loadRecordedWork: vi.fn() }));
import { loadRecordedWork } from "./repo";
import {
  periodStart,
  summarizeRecordedWork,
  summary,
  type RecordedShift,
} from "./service";
import { workInsightsRouter } from "./index";
const load = vi.mocked(loadRecordedWork);
const shift = (overrides: Partial<RecordedShift> = {}): RecordedShift => ({
  platform: "DoorDash",
  grossEarnings: "50.00",
  tips: "8.00",
  bonuses: "2.00",
  totalMiles: "20.00",
  durationMinutes: 60,
  ...overrides,
});
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("recorded work aggregation", () => {
  it("calculates inputs for weighted rates from earnings and total working time", () => {
    const result = summarizeRecordedWork(
      "month",
      [shift(), shift({ durationMinutes: 180 })],
      []
    );
    expect(result.tracked).toEqual({
      earnings: 120,
      hours: 4,
      miles: 40,
      otherCosts: 0,
    });
    expect(result.tracked.earnings / result.tracked.hours).toBe(30);
    expect(result.bySource).toEqual([
      {
        source: "DoorDash",
        earnings: 120,
        hours: 4,
        miles: 40,
        otherCosts: 0,
        records: 2,
      },
    ]);
    expect(result.bySource[0].earnings / result.bySource[0].hours).toBe(30);
  });
  it("keeps platform totals separate with exact fractional hours instead of rounding each record", () => {
    const result = summarizeRecordedWork(
      "week",
      [
        shift({ durationMinutes: 1 }),
        shift({
          platform: "Freelance client",
          durationMinutes: 7,
          totalMiles: "0",
        }),
      ],
      []
    );
    expect(result.tracked.hours).toBeCloseTo(8 / 60, 15);
    expect(result.bySource).toHaveLength(2);
    expect(
      result.bySource.find(row => row.source === "Freelance client")?.hours
    ).toBe(7 / 60);
  });
  it("excludes zero, missing or negative duration together with its own earnings and miles", () => {
    const result = summarizeRecordedWork(
      "year",
      [
        shift(),
        shift({ durationMinutes: 0 }),
        shift({ durationMinutes: null }),
        shift({ durationMinutes: -5 }),
      ],
      []
    );
    expect(result.recordedCount).toBe(4);
    expect(result.excluded).toEqual({ count: 3, earnings: 180 });
    expect(result.tracked).toEqual({
      earnings: 60,
      hours: 1,
      miles: 20,
      otherCosts: 0,
    });
    expect(result.bySource[0].records).toBe(1);
  });
  it("never converts null, empty, negative or nonfinite measurements into reliable hourly inputs", () => {
    const result = summarizeRecordedWork(
      "all",
      [
        shift({ grossEarnings: null }),
        shift({ tips: "" }),
        shift({ bonuses: Infinity }),
        shift({ totalMiles: null }),
        shift({ totalMiles: "-1" }),
        shift({ durationMinutes: NaN }),
      ],
      []
    );
    expect(result.tracked).toEqual({
      earnings: 0,
      hours: 0,
      miles: 0,
      otherCosts: 0,
    });
    expect(result.bySource).toEqual([]);
    expect(result.excluded).toEqual({ count: 6, earnings: 180 });
    expect(Object.values(result.tracked).every(Number.isFinite)).toBe(true);
  });
  it("includes genuinely measured zero income and zero miles", () => {
    const result = summarizeRecordedWork(
      "month",
      [shift({ grossEarnings: "0", tips: "0", bonuses: "0", totalMiles: "0" })],
      []
    );
    expect(result.tracked).toEqual({
      earnings: 0,
      hours: 1,
      miles: 0,
      otherCosts: 0,
    });
    expect(result.excluded.count).toBe(0);
  });
  it("reports hourless imports independently without inflating timed income or cost miles", () => {
    const result = summarizeRecordedWork(
      "month",
      [shift()],
      [
        { grossEarnings: "9000", tips: "10", bonuses: "5", totalMiles: "900" },
        { grossEarnings: "20", tips: "0", bonuses: "0", totalMiles: null },
      ]
    );
    expect(result.imported).toEqual({ count: 2, earnings: 9035, miles: 900 });
    expect(result.tracked).toEqual({
      earnings: 60,
      hours: 1,
      miles: 20,
      otherCosts: 0,
    });
  });
  it("contains bad imported measurements without creating nonfinite totals", () => {
    const result = summarizeRecordedWork(
      "month",
      [],
      [
        {
          grossEarnings: "invalid",
          tips: null,
          bonuses: "0",
          totalMiles: "bad",
        },
      ]
    );
    expect(result.imported).toEqual({ count: 1, earnings: 0, miles: 0 });
    expect(result.recordedCount).toBe(0);
  });
  it("handles user-provided platform labels safely and groups blank labels as Other", () => {
    const result = summarizeRecordedWork(
      "month",
      [
        shift({ platform: "  " }),
        shift({ platform: "__proto__" }),
        shift({ platform: "constructor" }),
      ],
      []
    );
    expect(result.bySource.map(row => row.source).sort()).toEqual(
      ["Other", "__proto__", "constructor"].sort()
    );
  });
});

describe("period boundaries and data access", () => {
  const now = new Date("2026-10-23T18:30:00Z");
  it("uses bounded periods and never rounds away partial working time", () => {
    expect(periodStart("week", now).toISOString()).toBe(
      "2026-10-16T18:30:00.000Z"
    );
    expect(periodStart("month", now).toISOString()).toBe(
      "2026-10-01T00:00:00.000Z"
    );
    expect(periodStart("year", now).toISOString()).toBe(
      "2026-01-01T00:00:00.000Z"
    );
    expect(periodStart("all", now).getTime()).toBe(0);
  });
  it("passes the current owner and both time bounds to the repository", async () => {
    load.mockResolvedValue({ shifts: [], imported: [], expenses: [] });
    expect(await summary(42, "month", now)).toMatchObject({
      period: "month",
      recordedCount: 0,
    });
    expect(load).toHaveBeenCalledWith(
      42,
      new Date("2026-10-01T00:00:00Z"),
      now,
      { startDate: "2026-10-01", endDate: "2026-10-23" }
    );
  });
  it("propagates unavailable storage instead of presenting zero earnings", async () => {
    load.mockRejectedValue(
      new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Database not configured",
      })
    );
    await expect(summary(42, "month", now)).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });
});

describe("authenticated work insights endpoint", () => {
  it("rejects anonymous requests", async () => {
    const caller = workInsightsRouter.createCaller({ user: null } as never);
    await expect(caller.summary({ period: "month" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(load).not.toHaveBeenCalled();
  });
  it("takes ownership only from the session and defaults to month", async () => {
    load.mockResolvedValue({ shifts: [], imported: [], expenses: [] });
    const caller = workInsightsRouter.createCaller({
      user: { id: 42 },
    } as never);
    const result = await caller.summary({ userId: 99 } as never);
    expect(result.period).toBe("month");
    expect(load.mock.calls[0][0]).toBe(42);
    expect((await caller.summary()).period).toBe("month");
  });
  it("rejects unsupported periods before querying records", async () => {
    const caller = workInsightsRouter.createCaller({
      user: { id: 42 },
    } as never);
    await expect(
      caller.summary({ period: "today" } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(load).not.toHaveBeenCalled();
  });
  it("does not leak raw database errors to the client", async () => {
    load.mockRejectedValue(
      new Error("sensitive database connection information")
    );
    const caller = workInsightsRouter.createCaller({
      user: { id: 42 },
    } as never);
    await expect(caller.summary({ period: "month" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "We could not load your work history. Please try again.",
    });
  });
});

describe("saved expense integration", () => {
  it("counts every saved expense and keeps vehicle costs separate without assigning them to sources", () => {
    const result = summarizeRecordedWork(
      "month",
      [shift()],
      [],
      [
        { category: "fuel", amountCents: 1000 },
        { category: "maintenance", amountCents: 2000 },
        { category: "insurance", amountCents: 3000 },
        { category: "tolls", amountCents: 400 },
        { category: "parking", amountCents: 500 },
        { category: "supplies", amountCents: 600 },
        { category: "software", amountCents: 700 },
        { category: "fees", amountCents: 800 },
        { category: "other", amountCents: 900 },
      ]
    );
    expect(result.expenses).toEqual({
      count: 9,
      totalCents: 9900,
      vehicleCents: 6000,
      otherCents: 3900,
    });
    expect(result.tracked.otherCosts).toBe(0);
    expect(result.bySource[0].otherCosts).toBe(0);
  });
  it("rejects invalid saved amounts instead of understating costs", () => {
    expect(() =>
      summarizeRecordedWork(
        "month",
        [],
        [],
        [{ category: "fuel", amountCents: -1 }]
      )
    ).toThrow("Invalid saved expense");
  });
  it.each([
    ["week", "2026-01-01", "2025-12-26"],
    ["month", "2026-01-01", "2026-01-01"],
    ["year", "2026-01-01", "2026-01-01"],
    ["month", "2026-11-01", "2026-11-01"],
  ] as const)(
    "uses local-calendar %s expense boundaries on %s alongside UTC work bounds",
    async (period, asOfDate, startDate) => {
      load.mockResolvedValue({ shifts: [], imported: [], expenses: [] });
      const now = new Date(`${asOfDate}T00:30:00Z`);
      const result = await summary(42, period, now, asOfDate);
      expect(result.expenseRange).toEqual({ startDate, endDate: asOfDate });
      expect(load).toHaveBeenCalledWith(42, periodStart(period, now), now, {
        startDate,
        endDate: asOfDate,
      });
    }
  );
  it("supports a neighboring local day, but rejects arbitrary historical as-of dates before querying", async () => {
    load.mockResolvedValue({ shifts: [], imported: [], expenses: [] });
    const now = new Date("2026-11-01T00:30:00Z");
    expect(
      (await summary(42, "month", now, "2026-10-31")).expenseRange
    ).toEqual({ startDate: "2026-10-01", endDate: "2026-10-31" });
    load.mockClear();
    await expect(summary(42, "month", now, "2026-02-30")).rejects.toMatchObject(
      { code: "BAD_REQUEST" }
    );
    await expect(summary(42, "month", now, "2026-10-01")).rejects.toMatchObject(
      { code: "BAD_REQUEST" }
    );
    expect(load).not.toHaveBeenCalled();
  });
});
