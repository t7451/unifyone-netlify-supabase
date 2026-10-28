import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./moneyManager.repo", () => ({
  getDb: vi.fn(),
  getOwnedShift: vi.fn(),
  updateOwnedShift: vi.fn(),
  insertMileageLog: vi.fn(),
  completeShiftWithMileage: vi.fn(),
  getOwnedShiftMileageDate: vi.fn(),
  startOrResumeShift: vi.fn(),
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
import { awardPoints } from "./points.service";
import { checkAndResolveFriendChallengesForUser } from "../../challengeCompletion";
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
  mockRepo.completeShiftWithMileage.mockResolvedValue(true);
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
    expect(mockRepo.completeShiftWithMileage).toHaveBeenCalledWith(
      DB,
      7,
      1,
      expect.anything(),
      expect.objectContaining({
        irsRateCents: "72.50",
        deductionCents: 145,
        date: new Date("2026-06-30T00:00:00Z"),
      })
    );
  });
  it("uses the new rate for a selected July1 driving date", async () => {
    await shiftsService.endShift(ctx, { ...input, mileageDate: "2026-07-01" });
    expect(mockRepo.completeShiftWithMileage).toHaveBeenCalledWith(
      DB,
      7,
      1,
      expect.anything(),
      expect.objectContaining({ irsRateCents: "76.00", deductionCents: 152 })
    );
  });
  it.each(["2026-02-30", "2026-08-01"])(
    "rejects an invalid or implausible driving date%s before changing the session",
    async mileageDate => {
      await expect(
        shiftsService.endShift(ctx, { ...input, mileageDate })
      ).rejects.toThrow();
      expect(mockRepo.completeShiftWithMileage).not.toHaveBeenCalled();
      expect(mockRepo.insertMileageLog).not.toHaveBeenCalled();
    }
  );
  it("retains a UTC fallback for old clients within a single verified period", async () => {
    await shiftsService.endShift(ctx, input);
    expect(mockRepo.completeShiftWithMileage).toHaveBeenCalledWith(
      DB,
      7,
      1,
      expect.anything(),
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
    expect(mockRepo.completeShiftWithMileage).not.toHaveBeenCalled();
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

describe("timer atomic save and exact retry", () => {
  const saved = () => ({
    id: 1,
    userId: 7,
    platform: "Other",
    status: "completed",
    startTime: new Date("2026-07-01T03:00:00Z"),
    durationMinutes: 150,
    grossEarnings: "40.00",
    tips: "0.00",
    bonuses: "0.00",
    totalMiles: "2.00",
    notes: null,
    endLat: "47.1234568",
    endLng: null,
  });
  it("resumes the authoritative active shift and its original start time", async () => {
    const original = {
      id: 19,
      platform: "Existing client",
      startTime: new Date("2026-06-30T23:00:00Z"),
    };
    mockRepo.startOrResumeShift.mockResolvedValue(original);
    expect(
      await shiftsService.startShift(7, { platform: "Another app" })
    ).toEqual(original);
    expect(mockRepo.startOrResumeShift).toHaveBeenCalledWith(
      DB,
      7,
      "Another app",
      undefined,
      undefined
    );
  });
  it("does not complete independently when the atomic mileage operation fails", async () => {
    mockRepo.completeShiftWithMileage.mockRejectedValueOnce(
      new Error("isolated insert failure")
    );
    await expect(shiftsService.endShift(ctx, input)).rejects.toThrow(
      "isolated insert failure"
    );
    expect(mockRepo.updateOwnedShift).not.toHaveBeenCalled();
    expect(mockRepo.insertMileageLog).not.toHaveBeenCalled();
    expect(awardPoints).not.toHaveBeenCalled();
  });
  it("returns the persisted result for identical retries including rounded GPS and mileage date", async () => {
    mockRepo.getOwnedShift.mockResolvedValue([saved()] as never);
    mockRepo.getOwnedShiftMileageDate.mockResolvedValue(
      new Date("2026-06-30T00:00:00Z")
    );
    await expect(
      shiftsService.endShift(ctx, {
        ...input,
        endLat: 47.123456789,
        mileageDate: "2026-06-30",
      })
    ).resolves.toEqual({ success: true, durationMinutes: 150 });
    expect(mockRepo.completeShiftWithMileage).not.toHaveBeenCalled();
    expect(awardPoints).not.toHaveBeenCalled();
  });
  it.each([{ grossEarnings: 41 }, { mileageDate: "2026-07-01" }, { tips: 1 }])(
    "keeps the first saved result on changed retry %j",
    async change => {
      mockRepo.getOwnedShift.mockResolvedValue([
        { ...saved(), endLat: null },
      ] as never);
      mockRepo.getOwnedShiftMileageDate.mockResolvedValue(
        new Date("2026-06-30T00:00:00Z")
      );
      await expect(
        shiftsService.endShift(ctx, {
          ...input,
          mileageDate: "2026-06-30",
          ...change,
        })
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(mockRepo.completeShiftWithMileage).not.toHaveBeenCalled();
    }
  );
  it("reconciles a simultaneous save that lost the active-status claim", async () => {
    mockRepo.completeShiftWithMileage.mockResolvedValueOnce(false);
    mockRepo.getOwnedShift
      .mockResolvedValueOnce([{ ...saved(), status: "active" }] as never)
      .mockResolvedValueOnce([{ ...saved(), endLat: null }] as never);
    await expect(shiftsService.endShift(ctx, input)).resolves.toEqual({
      success: true,
      durationMinutes: 150,
    });
    expect(awardPoints).not.toHaveBeenCalled();
  });
  it("does not make a committed shift fail because optional points or challenges fail", async () => {
    vi.mocked(awardPoints).mockRejectedValueOnce(
      new Error("points unavailable")
    );
    vi.mocked(checkAndResolveFriendChallengesForUser).mockRejectedValueOnce(
      new Error("challenge unavailable")
    );
    await expect(shiftsService.endShift(ctx, input)).resolves.toMatchObject({
      success: true,
    });
  });
  it.each([
    { totalMiles: 1.234 },
    { grossEarnings: 100000000 },
    { tips: NaN },
    { endLat: 91 },
  ])("rejects values that storage would round or overflow %j", async change => {
    await expect(
      shiftsService.endShift(ctx, { ...input, ...change })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockRepo.completeShiftWithMileage).not.toHaveBeenCalled();
  });
});
