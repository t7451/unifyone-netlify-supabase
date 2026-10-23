import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./moneyManager.repo", () => ({
  getDb: vi.fn(),
  insertMileageLog: vi.fn(),
  getCompletedShiftMilesSince: vi.fn(),
  getMileageMilesSince: vi.fn(),
  getCompletedShiftEarningsSince: vi.fn(),
  getMileageDeductionsSince: vi.fn(),
}));
vi.mock("../../meta/capi", () => ({ capi: { custom: vi.fn() } }));
vi.mock("./points.service", () => ({ awardPoints: vi.fn(), POINTS: {} }));
vi.mock("../../challengeCompletion", () => ({
  checkAndResolveFriendChallengesForUser: vi.fn(),
}));

import * as repo from "./moneyManager.repo";
import { mileageTaxService } from "./mileageTax.service";

const mockRepo = vi.mocked(repo);
const DB = {} as never;
const now = new Date("2026-10-23T12:00:00Z");
const storedLog = (
  shiftId: number | null,
  miles: string,
  deductionCents = Math.round(Number(miles) * 70)
) => ({ shiftId, miles, date: now, irsRateCents: "70.00", deductionCents });
const shift = (id: number, totalMiles: string) => ({
  id,
  totalMiles,
  startTime: now,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  mockRepo.getDb.mockResolvedValue(DB);
  mockRepo.getCompletedShiftMilesSince.mockResolvedValue([]);
  mockRepo.getMileageMilesSince.mockResolvedValue([]);
  mockRepo.getCompletedShiftEarningsSince.mockResolvedValue([]);
  mockRepo.getMileageDeductionsSince.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe("getYTDDeduction mileage sources", () => {
  it("counts a 20-mile shift once when its auto log also has 20 miles, while retaining 5 manual miles", async () => {
    const shifts = [shift(101, "20.00")];
    const logs = [storedLog(101, "20.00"), storedLog(null, "5.00")];
    mockRepo.getCompletedShiftMilesSince.mockResolvedValue(shifts);
    mockRepo.getMileageMilesSince.mockResolvedValue(logs);

    const result = await mileageTaxService.getYTDDeduction(7);

    expect(result.ytdMiles).toBe(25);
    expect(result.ytdDeduction).toBe(17.5); // Existing saved rates remain unchanged.
    expect(shifts).toEqual([shift(101, "20.00")]);
    expect(logs).toEqual([storedLog(101, "20.00"), storedLog(null, "5.00")]);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    expect(mockRepo.getCompletedShiftMilesSince).toHaveBeenCalledWith(
      DB,
      7,
      startOfYear
    );
    expect(mockRepo.getMileageMilesSince).toHaveBeenCalledWith(
      DB,
      7,
      startOfYear
    );
  });

  it("retains completed shifts without an auto log rather than requiring both records", async () => {
    mockRepo.getCompletedShiftMilesSince.mockResolvedValue([
      shift(101, "20.00"),
      shift(102, "30.00"),
    ]);
    mockRepo.getMileageMilesSince.mockResolvedValue([
      storedLog(101, "20.00"),
      storedLog(null, "5.00"),
    ]);
    expect((await mileageTaxService.getYTDDeduction(7)).ytdMiles).toBe(55);
  });

  it("retains linked log mileage when its shift is outside the YTD selection", async () => {
    mockRepo.getCompletedShiftMilesSince.mockResolvedValue([
      shift(101, "20.00"),
    ]);
    mockRepo.getMileageMilesSince.mockResolvedValue([
      storedLog(101, "20.00"),
      storedLog(99, "7.50"),
      storedLog(null, "5.00"),
    ]);
    expect((await mileageTaxService.getYTDDeduction(7)).ytdMiles).toBe(32.5);
  });

  it("uses the completed shift's distance when its auto log differs", async () => {
    mockRepo.getCompletedShiftMilesSince.mockResolvedValue([
      shift(101, "22.00"),
    ]);
    mockRepo.getMileageMilesSince.mockResolvedValue([storedLog(101, "20.00")]);
    expect((await mileageTaxService.getYTDDeduction(7)).ytdMiles).toBe(22);
  });

  it("preserves manual-only mileage without inventing a shift", async () => {
    mockRepo.getMileageMilesSince.mockResolvedValue([
      storedLog(null, "5.25"),
      storedLog(null, "2.25"),
    ]);
    expect((await mileageTaxService.getYTDDeduction(7)).ytdMiles).toBe(7.5);
  });

  it("does not query mileage sources when the database is unavailable", async () => {
    mockRepo.getDb.mockResolvedValue(null);
    expect(await mileageTaxService.getYTDDeduction(7)).toMatchObject({
      ytdMiles: 0,
      ytdDeduction: 0,
    });
    expect(mockRepo.getCompletedShiftMilesSince).not.toHaveBeenCalled();
    expect(mockRepo.getMileageMilesSince).not.toHaveBeenCalled();
  });
});

describe("getTaxEstimate mileage deduction sources", () => {
  it("does not deduct the same completed shift twice and retains manual mileage deductions", async () => {
    mockRepo.getCompletedShiftEarningsSince.mockResolvedValue([
      {
        id: 101,
        startTime: now,
        grossEarnings: "100.00",
        tips: "0.00",
        bonuses: "0.00",
        totalMiles: "20.00",
      },
    ]);
    mockRepo.getMileageDeductionsSince.mockResolvedValue([
      storedLog(101, "20.00", 1400),
      storedLog(null, "5.00", 350),
    ]);
    expect(await mileageTaxService.getTaxEstimate(7)).toMatchObject({
      ytdGrossCents: 10000,
      ytdMileageDeductionCents: 1750,
      ytdNetCents: 8250,
    });
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    expect(mockRepo.getCompletedShiftEarningsSince).toHaveBeenCalledWith(
      DB,
      7,
      startOfYear
    );
    expect(mockRepo.getMileageDeductionsSince).toHaveBeenCalledWith(
      DB,
      7,
      startOfYear
    );
  });

  it("keeps shift-only mileage and logs whose shifts are absent from the YTD selection", async () => {
    mockRepo.getCompletedShiftEarningsSince.mockResolvedValue([
      {
        id: 101,
        startTime: now,
        grossEarnings: "100.00",
        tips: "0.00",
        bonuses: "0.00",
        totalMiles: "20.00",
      },
      {
        id: 102,
        startTime: now,
        grossEarnings: "100.00",
        tips: "0.00",
        bonuses: "0.00",
        totalMiles: "30.00",
      },
    ]);
    mockRepo.getMileageDeductionsSince.mockResolvedValue([
      storedLog(101, "20.00", 1400),
      storedLog(99, "7.50", 525),
      storedLog(null, "5.00", 350),
    ]);
    // 50 completed shift miles plus the two standalone log deductions.
    expect(await mileageTaxService.getTaxEstimate(7)).toMatchObject({
      ytdMileageDeductionCents: 4555,
    });
  });
});

it("logs fractional-cent rate snapshots for the actual selected mileage date", async () => {
  await mileageTaxService.logMileage(
    { user: { id: 7, email: null } },
    { miles: 2, purpose: "business", date: "2026-06-30" }
  );
  expect(mockRepo.insertMileageLog).toHaveBeenCalledWith(
    DB,
    expect.objectContaining({
      irsRateCents: "72.50",
      deductionCents: 145,
      date: new Date("2026-06-30T00:00:00Z"),
    })
  );
});
it("rejects unknown mileage periods before storing a guessed rate", async () => {
  await expect(
    mileageTaxService.logMileage(
      { user: { id: 7, email: null } },
      { miles: 2, purpose: "business", date: "2027-01-01" }
    )
  ).rejects.toThrow("No verified business mileage rate");
  expect(mockRepo.insertMileageLog).not.toHaveBeenCalled();
});
