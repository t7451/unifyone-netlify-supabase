import { beforeEach, describe, expect, it, vi } from "vitest";
const repo = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("./repo", () => repo);
import { list } from "./service";
import { workHistoryRouter } from "./index";

const input = { from: "2026-10-01T07:00:00Z", before: "2026-11-01T07:00:00Z" };
const result = () => ({
  entries: [
    {
      kind: "import",
      id: 12,
      source: "DoorDash",
      startedAt: "2026-10-01T08:00:00.000Z",
      endedAt: null,
      earningsUSD: "125.39",
      base: "100.01",
      tips: "20.38",
      bonuses: "5",
      hours: null,
      miles: null,
      importBatchId: 3,
    },
  ],
  totalEntries: "1",
  totalEarningsUSD: "125.39",
  totalRecordedHours: "0",
  unknownHoursCount: "1",
  totalRecordedMiles: "0",
  unknownMilesCount: "1",
  sources: ["DoorDash", "Upwork"],
});
beforeEach(() => {
  vi.resetAllMocks();
  repo.load.mockResolvedValue(result());
});
describe("work history validation and truthful totals", () => {
  it("normalizes stored numbers without inventing import hours or miles", async () => {
    expect(await list(7, input)).toMatchObject({
      entries: [
        {
          earningsUSD: 125.39,
          hours: null,
          miles: null,
          endedAt: null,
          importBatchId: 3,
        },
      ],
      totalRecordedHours: 0,
      unknownHoursCount: 1,
      unknownMilesCount: 1,
      sources: ["DoorDash", "Upwork"],
      limit: 25,
      offset: 0,
    });
    expect(repo.load).toHaveBeenCalledWith(7, {
      ...input,
      limit: 25,
      offset: 0,
    });
  });
  it("retains exact source names and trims only free text search", async () => {
    await list(7, {
      ...input,
      source: " Client A ",
      query: "  50%_design  ",
      limit: 100,
      offset: 100000,
    });
    expect(repo.load).toHaveBeenCalledWith(7, {
      ...input,
      source: " Client A ",
      query: "50%_design",
      limit: 100,
      offset: 100000,
    });
  });
  it("accepts explicit timezone offsets for DST-sensitive local boundaries", async () => {
    await list(7, {
      from: "2026-11-01T00:00:00-07:00",
      before: "2026-11-02T00:00:00-08:00",
    });
    expect(repo.load).toHaveBeenCalledOnce();
  });
  it.each([
    { from: "2026-02-30T00:00:00Z" },
    { from: "2026-10-01" },
    { before: input.from },
    { before: "2026-09-01T00:00:00Z" },
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
    { offset: -1 },
    { offset: 100001 },
    { source: "" },
    { source: "a".repeat(101) },
    { query: "a".repeat(101) },
    { fromDate: "2026-10-01" },
    { beforeDate: "2026-10-02" },
    { fromDate: "2026-02-30", beforeDate: "2026-03-01" },
    { fromDate: "2026-10-02", beforeDate: "2026-10-02" },
    { fromDate: "2026-10-03", beforeDate: "2026-10-02" },
  ])("rejects invalid query %j before storage", async change => {
    await expect(list(7, { ...input, ...change })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(repo.load).not.toHaveBeenCalled();
  });
  it("does not invent empty history when storage or a total is malformed", async () => {
    repo.load.mockResolvedValue(undefined);
    await expect(list(7, input)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    repo.load.mockResolvedValue({ ...result(), totalEarningsUSD: "NaN" });
    await expect(list(7, input)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    repo.load.mockResolvedValue({
      ...result(),
      totalEarningsUSD: "9007199254740992",
    });
    await expect(list(7, input)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
  it("uses complete filtered totals even when pagination returns no rows", async () => {
    repo.load.mockResolvedValue({
      ...result(),
      entries: [],
      totalEntries: "45",
      totalEarningsUSD: "1000",
    });
    expect(await list(7, { ...input, offset: 100 })).toMatchObject({
      entries: [],
      totalEntries: 45,
      totalEarningsUSD: 1000,
    });
  });
});
describe("protected history endpoint", () => {
  it("passes explicit statement calendar bounds and reports its date policy", async () => {
    expect(
      await list(7, {
        ...input,
        fromDate: "2026-10-01",
        beforeDate: "2026-11-01",
      })
    ).toMatchObject({
      importDatePolicy: "utc-calendar",
      fromDate: "2026-10-01",
      beforeDate: "2026-11-01",
    });
    expect(repo.load).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        fromDate: "2026-10-01",
        beforeDate: "2026-11-01",
      })
    );
    expect(await list(7, input)).toMatchObject({
      importDatePolicy: "instant",
      fromDate: null,
      beforeDate: null,
    });
  });
  it("uses the authenticated owner and disallows unauthenticated access", async () => {
    await workHistoryRouter
      .createCaller({ user: { id: 42 } } as never)
      .list(input);
    expect(repo.load).toHaveBeenCalledWith(42, expect.anything());
    repo.load.mockClear();
    await expect(
      workHistoryRouter.createCaller({ user: null } as never).list(input)
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(repo.load).not.toHaveBeenCalled();
  });
  it("does not expose raw SQL or connection details on failure", async () => {
    repo.load.mockRejectedValue(
      new Error("postgresql://private and personal-work")
    );
    await expect(
      workHistoryRouter.createCaller({ user: { id: 7 } } as never).list(input)
    ).rejects.toMatchObject({
      message: "Work history could not be loaded. Please retry.",
    });
  });
});
