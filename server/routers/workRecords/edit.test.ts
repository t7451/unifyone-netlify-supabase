import { beforeEach, describe, expect, it, vi } from "vitest";
const repo = vi.hoisted(() => ({
  findEditable: vi.fn(),
  updateManualWithMileage: vi.fn(),
}));
const rate = vi.hoisted(() => vi.fn());
vi.mock("./repo", () => repo);
vi.mock("../../../shared/mileageRates", () => ({
  getBusinessMileageRateForDate: rate,
}));
import { get, update, type UpdateWorkRecordInput } from "./service";
import { workRecordsRouter } from "./index";
import type { StoredEditableWorkRecord } from "./repo";

function record(
  changes: Partial<StoredEditableWorkRecord> = {}
): StoredEditableWorkRecord {
  return {
    id: 42,
    userId: 7,
    platform: "DoorDash",
    startTime: new Date("2025-10-01T10:00:23.456Z"),
    endTime: new Date("2025-10-01T12:00:23.456Z"),
    durationMinutes: 120,
    startLat: null,
    startLng: null,
    endLat: null,
    endLng: null,
    routeWaypoints: null,
    grossEarnings: "100.00",
    tips: "5.00",
    bonuses: "2.00",
    totalMiles: "20.00",
    notes: "A note",
    status: "completed",
    entrySource: "manual",
    clientReference: "740094f3-200d-480f-b4e1-23069488e2f8",
    createdAt: new Date("2025-10-01T12:00:23.456Z"),
    updatedAt: new Date("2025-10-01T12:00:23.456Z"),
    mileageDate: new Date("2025-10-01T00:00:00Z"),
    linkedMileageCount: 1,
    linkedMileageId: 99,
    linkedMileageOwner: 7,
    linkedMileageMiles: "20.00",
    linkedMileagePurpose: "business",
    irsRateCents: "61.25",
    deductionCents: 1225,
    ...changes,
  };
}
function input(
  row = record(),
  changes: Partial<UpdateWorkRecordInput> = {}
): UpdateWorkRecordInput {
  return {
    recordId: row.id,
    expectedUpdatedAt: row.updatedAt.toISOString(),
    platform: row.platform,
    startedAt: row.startTime.toISOString(),
    endedAt: row.endTime!.toISOString(),
    grossEarnings: Number(row.grossEarnings),
    tips: Number(row.tips),
    bonuses: Number(row.bonuses),
    totalMiles: Number(row.totalMiles),
    mileageDate: row.mileageDate?.toISOString().slice(0, 10),
    notes: row.notes ?? "",
    ...changes,
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  rate.mockReturnValue(70);
  repo.findEditable.mockResolvedValue(record());
  repo.updateManualWithMileage.mockResolvedValue({
    id: 42,
    updatedAt: "2025-10-01T12:00:23.457Z",
  });
});

describe("manual work editing", () => {
  it("returns an owner-scoped edit detail without rounding original timestamps", async () => {
    const detail = await get(7, 42);
    expect(repo.findEditable).toHaveBeenCalledWith(7, 42);
    expect(detail).toMatchObject({
      id: 42,
      clientReference: record().clientReference,
      startedAt: "2025-10-01T10:00:23.456Z",
      endedAt: "2025-10-01T12:00:23.456Z",
      mileageDate: "2025-10-01",
      updatedAt: "2025-10-01T12:00:23.456Z",
    });
    expect(detail).not.toHaveProperty("linkedMileageOwner");
  });
  it("does not reveal unowned records", async () => {
    repo.findEditable.mockResolvedValue(undefined);
    await expect(get(99, 42)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(update(99, input())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(repo.updateManualWithMileage).not.toHaveBeenCalled();
  });
  it.each([
    { entrySource: "timer" },
    { status: "active" },
    { endTime: null },
    { clientReference: null },
  ])("refuses nonmanual or incomplete records %j", async changes => {
    repo.findEditable.mockResolvedValue(record(changes));
    await expect(get(7, 42)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(update(7, input())).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
  it.each([
    { linkedMileageCount: 2 },
    { linkedMileageOwner: 99 },
    { linkedMileageMiles: "50" },
    { linkedMileagePurpose: "commute" },
  ])(
    "rejects ambiguous or unrelated linked mileage without a write %j",
    async changes => {
      repo.findEditable.mockResolvedValue(record(changes));
      await expect(
        update(7, input(record(), { grossEarnings: 150 }))
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(repo.updateManualWithMileage).not.toHaveBeenCalled();
    }
  );
  it("preserves the recorded rate and deduction for pay-only corrections", async () => {
    await update(7, input(record(), { grossEarnings: 150 }));
    expect(rate).not.toHaveBeenCalled();
    expect(repo.updateManualWithMileage).toHaveBeenCalledWith(
      7,
      42,
      record().updatedAt.toISOString(),
      expect.objectContaining({
        clientReference: record().clientReference,
        grossEarnings: "150.00",
        irsRateCents: "61.25",
        deductionCents: 1225,
      })
    );
  });
  it("reprices explicitly changed mileage or its calendar date", async () => {
    await update(7, input(record(), { totalMiles: 25 }));
    expect(rate).toHaveBeenCalledWith("2025-10-01");
    expect(repo.updateManualWithMileage).toHaveBeenCalledWith(
      7,
      42,
      expect.any(String),
      expect.objectContaining({
        totalMiles: "25.00",
        irsRateCents: "70.00",
        deductionCents: 1750,
      })
    );
    rate.mockClear();
    await update(7, input(record(), { mileageDate: "2025-09-30" }));
    expect(rate).toHaveBeenCalledWith("2025-09-30");
  });
  it("lets a same-values retry succeed after a lost response without advancing its version", async () => {
    const changed = record({
      grossEarnings: "150.00",
      updatedAt: new Date("2025-10-01T12:01:00Z"),
    });
    repo.findEditable.mockResolvedValue(changed);
    const retry = input(changed, {
      expectedUpdatedAt: record().updatedAt.toISOString(),
    });
    expect(await update(7, retry)).toEqual({
      id: 42,
      updatedAt: changed.updatedAt.toISOString(),
    });
    expect(repo.updateManualWithMileage).not.toHaveBeenCalled();
  });
  it("rejects stale changed details instead of overwriting a newer edit", async () => {
    const changed = record({
      grossEarnings: "150.00",
      updatedAt: new Date("2025-10-01T12:01:00Z"),
    });
    repo.findEditable.mockResolvedValue(changed);
    await expect(
      update(7, input(record(), { grossEarnings: 200 }))
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(repo.updateManualWithMileage).not.toHaveBeenCalled();
  });
  it("handles a same-values race that commits between the initial read and versioned update", async () => {
    const changed = record({
      grossEarnings: "150.00",
      updatedAt: new Date("2025-10-01T12:01:00Z"),
    });
    repo.findEditable
      .mockResolvedValueOnce(record())
      .mockResolvedValueOnce(changed);
    repo.updateManualWithMileage.mockResolvedValue(undefined);
    expect(await update(7, input(record(), { grossEarnings: 150 }))).toEqual({
      id: 42,
      updatedAt: changed.updatedAt.toISOString(),
    });
  });
  it("rejects a conflicting race after the atomic update finds a newer version", async () => {
    repo.findEditable
      .mockResolvedValueOnce(record())
      .mockResolvedValueOnce(
        record({
          grossEarnings: "250.00",
          updatedAt: new Date("2025-10-01T12:01:00Z"),
        })
      );
    repo.updateManualWithMileage.mockResolvedValue(undefined);
    await expect(
      update(7, input(record(), { grossEarnings: 150 }))
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it.each([
    { grossEarnings: -1 },
    { totalMiles: 0.001 },
    { expectedUpdatedAt: "not-a-version" },
    { platform: "" },
  ])("validates edited inputs before reading or writing %j", async changes => {
    await expect(update(7, input(record(), changes))).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(repo.findEditable).not.toHaveBeenCalled();
    expect(repo.updateManualWithMileage).not.toHaveBeenCalled();
  });
  it("uses session ownership and ignores an injected client reference", async () => {
    const caller = workRecordsRouter.createCaller({ user: { id: 7 } } as never);
    await caller.update({
      ...input(record(), { grossEarnings: 150 }),
      userId: 99,
      clientReference: "bad-reference",
    } as never);
    expect(repo.findEditable).toHaveBeenCalledWith(7, 42);
    expect(repo.updateManualWithMileage.mock.calls[0][3].clientReference).toBe(
      record().clientReference
    );
  });
  it("requires authentication for edit lookup and saves", async () => {
    const caller = workRecordsRouter.createCaller({ user: null } as never);
    await expect(caller.get({ recordId: 42 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.update(input())).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(repo.findEditable).not.toHaveBeenCalled();
  });
  it("masks raw failed-update details at the API boundary", async () => {
    repo.updateManualWithMileage.mockRejectedValue(
      new Error("sensitive SQL values")
    );
    const caller = workRecordsRouter.createCaller({ user: { id: 7 } } as never);
    await expect(
      caller.update(input(record(), { grossEarnings: 150 }))
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "The work record operation could not finish. Please retry.",
    });
  });
});
