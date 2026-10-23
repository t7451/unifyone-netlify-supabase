import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./moneyManager.repo", () => ({
  getDb: vi.fn(),
  getOwnedShift: vi.fn(),
  updateOwnedShift: vi.fn(),
  insertMileageLog: vi.fn(),
  getCompletedShiftsSince: vi.fn(),
  getImportedEarningsSince: vi.fn(),
  getMileageDeductionsSince: vi.fn(),
}));
vi.mock("./points.service", () => ({
  awardPoints: vi.fn(),
  POINTS: { shift_completed: 1 },
}));
vi.mock("../../challengeCompletion", () => ({
  checkAndResolveFriendChallengesForUser: vi.fn(),
}));
vi.mock("../../meta/capi", () => ({ capi: { custom: vi.fn() } }));
vi.mock("../../lib/ruleEngine", () => ({ evaluateRulesForEvent: vi.fn() }));
vi.mock("../../_core/sseManager", () => ({ broadcastToUser: vi.fn() }));
import * as repo from "./moneyManager.repo";
import { shiftsService } from "./shifts.service";
const mockRepo = vi.mocked(repo);
const DB = {} as never;
const ctx = { user: { id: 7, email: null } };
const input = {
  shiftId: 1,
  grossEarnings: 40,
  tips: 0,
  bonuses: 0,
  totalMiles: 2,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-01T05:30:00Z"));
  mockRepo.getDb.mockResolvedValue(DB);
  mockRepo.getOwnedShift.mockResolvedValue([
    {
      id: 1,
      userId: 7,
      status: "active",
      platform: "Other",
      startTime: new Date("2026-07-01T03:00:00Z"),
    },
  ] as never);
  mockRepo.getCompletedShiftsSince.mockResolvedValue([]);
  mockRepo.getImportedEarningsSince.mockResolvedValue([]);
  mockRepo.getMileageDeductionsSince.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe("work completion mileage dates", () => {
  it("uses the selected local June30 driving date even when the completion timestamp is July1UTC", async () => {
    await shiftsService.endShift(ctx, { ...input, mileageDate: "2026-06-30" });
    expect(mockRepo.insertMileageLog).toHaveBeenCalledWith(
      DB,
      expect.objectContaining({
        irsRateCents: "72.50",
        deductionCents: 145,
        date: new Date("2026-06-30T00:00:00Z"),
      })
    );
  });
  it("uses the new rate for a selected July1 driving date", async () => {
    await shiftsService.endShift(ctx, { ...input, mileageDate: "2026-07-01" });
    expect(mockRepo.insertMileageLog).toHaveBeenCalledWith(
      DB,
      expect.objectContaining({ irsRateCents: "76.00", deductionCents: 152 })
    );
  });
  it.each(["2026-02-30", "2026-08-01"])(
    "rejects an invalid or implausible driving date%s before changing the session",
    async mileageDate => {
      await expect(
        shiftsService.endShift(ctx, { ...input, mileageDate })
      ).rejects.toThrow();
      expect(mockRepo.updateOwnedShift).not.toHaveBeenCalled();
      expect(mockRepo.insertMileageLog).not.toHaveBeenCalled();
    }
  );
  it("retains a UTC fallback for old clients within a single verified period", async () => {
    await shiftsService.endShift(ctx, input);
    expect(mockRepo.insertMileageLog).toHaveBeenCalledWith(
      DB,
      expect.objectContaining({ irsRateCents: "76.00", deductionCents: 152 })
    );
  });
  it("does not guess a single rate for old clients whose work spans a rate change", async () => {
    mockRepo.getOwnedShift.mockResolvedValue([
      {
        id: 1,
        userId: 7,
        status: "active",
        startTime: new Date("2026-06-30T23:00:00Z"),
      },
    ] as never);
    await expect(shiftsService.endShift(ctx, input)).rejects.toThrow(
      "Select the mileage date"
    );
    expect(mockRepo.updateOwnedShift).not.toHaveBeenCalled();
  });
});

describe("earnings summary mileage rates", () => {
  it("prices individual imported dates across a midyear change without changing earnings totals", async () => {
    mockRepo.getImportedEarningsSince.mockResolvedValue([
      {
        grossEarnings: "100",
        tips: "0",
        bonuses: "0",
        totalMiles: "10",
        earnedDate: new Date("2026-06-30T00:00:00Z"),
      },
      {
        grossEarnings: "100",
        tips: "0",
        bonuses: "0",
        totalMiles: "10",
        earnedDate: new Date("2026-07-01T00:00:00Z"),
      },
    ] as never);
    expect(
      await shiftsService.getShiftStats(7, { period: "all" })
    ).toMatchObject({
      totalEarnings: 200,
      totalMiles: 20,
      taxDeduction: 14.85,
      mileageRateUnavailable: false,
    });
  });
  it("preserves earnings when an unsupported historical date makes only the deduction unavailable", async () => {
    mockRepo.getImportedEarningsSince.mockResolvedValue([
      {
        grossEarnings: "100",
        tips: "0",
        bonuses: "0",
        totalMiles: "10",
        earnedDate: new Date("2022-01-01T00:00:00Z"),
      },
    ] as never);
    expect(
      await shiftsService.getShiftStats(7, { period: "all" })
    ).toMatchObject({
      totalEarnings: 100,
      totalMiles: 10,
      taxDeduction: null,
      mileageRateUnavailable: true,
    });
  });
});
