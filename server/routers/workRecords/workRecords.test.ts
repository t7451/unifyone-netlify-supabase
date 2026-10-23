import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const repo = vi.hoisted(() => ({
  createWithMileage: vi.fn(),
  findByReference: vi.fn(),
  removeManualWithMileage: vi.fn(),
  findOwned: vi.fn(),
}));
const mileage = vi.hoisted(() => ({ getBusinessMileageRateForDate: vi.fn() }));
vi.mock("./repo", () => repo);
vi.mock("../../../shared/mileageRates", () => mileage);
import {
  canonicalWorkRecord,
  create,
  sameWorkRecord,
  type CanonicalWorkRecord,
} from "./service";
import { workRecordsRouter } from "./index";
import type { StoredWorkRecord } from "./repo";

const reference = "740094f3-200d-480f-b4e1-23069488e2f8";
const input = {
  clientReference: reference,
  platform: " DoorDash ",
  startedAt: "2025-10-01T10:00:00Z",
  endedAt: "2025-10-01T12:00:00Z",
  grossEarnings: 100.25,
  tips: 10,
  bonuses: 5,
  totalMiles: 20,
  mileageDate: "2025-10-01",
  notes: "  Delivery shift  ",
};
function stored(canonical: CanonicalWorkRecord): StoredWorkRecord {
  return {
    id: 42,
    userId: 7,
    platform: canonical.platform,
    startTime: canonical.startedAt,
    endTime: canonical.endedAt,
    durationMinutes: canonical.durationMinutes,
    grossEarnings: canonical.grossEarnings,
    tips: canonical.tips,
    bonuses: canonical.bonuses,
    totalMiles: canonical.totalMiles,
    notes: canonical.notes,
    mileageDate: canonical.mileageDate
      ? new Date(`${canonical.mileageDate}T00:00:00Z`)
      : null,
    entrySource: "manual",
    status: "completed",
    clientReference: canonical.clientReference,
  } as StoredWorkRecord;
}
beforeEach(() => {
  vi.resetAllMocks();
  mileage.getBusinessMileageRateForDate.mockReturnValue(70);
});

describe("manual completed work validation", () => {
  it("normalizes dates, source labels and exact decimal money without inventing a timer", () => {
    expect(canonicalWorkRecord(input)).toMatchObject({
      clientReference: reference,
      platform: "DoorDash",
      durationMinutes: 120,
      grossEarnings: "100.25",
      tips: "10.00",
      bonuses: "5.00",
      totalMiles: "20.00",
      irsRateCents: "70.00",
      deductionCents: 1400,
      notes: "Delivery shift",
    });
  });
  it("preserves fractional cents per mile and rounds only the deduction to whole cents", () => {
    mileage.getBusinessMileageRateForDate.mockReturnValue(72.5);
    expect(canonicalWorkRecord({ ...input, totalMiles: 1.01 })).toMatchObject({
      irsRateCents: "72.50",
      deductionCents: 73,
    });
  });
  it("supports no-driving freelance work without requiring a historical mileage rate", () => {
    mileage.getBusinessMileageRateForDate.mockImplementation(() => {
      throw new Error("unsupported year");
    });
    expect(
      canonicalWorkRecord({
        ...input,
        totalMiles: 0,
        startedAt: "2020-10-01T10:00:00Z",
        endedAt: "2020-10-01T12:00:00Z",
      })
    ).toMatchObject({
      totalMiles: "0.00",
      irsRateCents: null,
      deductionCents: 0,
    });
  });
  it.each([
    { grossEarnings: -1 },
    { grossEarnings: NaN },
    { grossEarnings: Infinity },
    { grossEarnings: 100_000_000 },
    { tips: -1 },
    { bonuses: 0.001 },
    { totalMiles: 1_000_000 },
    { totalMiles: 0.001 },
    { platform: "   " },
    { platform: "x".repeat(101) },
    { notes: "x".repeat(1001) },
    { clientReference: "not-a-uuid" },
    { startedAt: "2025-10-01" },
  ])("rejects invalid fields %j before any database write", changes => {
    expect(() => canonicalWorkRecord({ ...input, ...changes })).toThrow(
      TRPCError
    );
    expect(repo.createWithMileage).not.toHaveBeenCalled();
  });
  it.each([
    { startedAt: "2025-10-01T12:00:00Z" },
    { startedAt: "2025-10-01T11:59:30Z" },
    { startedAt: "2025-09-30T10:00:00Z" },
  ])(
    "requires positive work duration from one minute through 24 hours",
    changes => {
      expect(() => canonicalWorkRecord({ ...input, ...changes })).toThrow(
        /one minute/
      );
    }
  );
  it("rejects future work against server time, not a client clock", () => {
    expect(() =>
      canonicalWorkRecord(input, Date.parse("2025-10-01T11:59:00Z"))
    ).toThrow(/future/);
  });
  it("accepts represented two-decimal values without rejecting binary floating-point noise", () => {
    expect(
      canonicalWorkRecord({ ...input, grossEarnings: 1.15 })
    ).toMatchObject({ grossEarnings: "1.15" });
  });
  it("requires an explicit local mileage date when recording positive miles", () => {
    expect(() =>
      canonicalWorkRecord({ ...input, mileageDate: undefined })
    ).toThrow(/local calendar date/);
  });
  it.each(["2025-02-30", "2025-10-03", "2025-09-28"])(
    "rejects impossible or unrelated mileage date %s",
    mileageDate => {
      expect(() => canonicalWorkRecord({ ...input, mileageDate })).toThrow(
        /real calendar date/
      );
    }
  );
  it("uses the declared local date across a UTC rate boundary", () => {
    const record = canonicalWorkRecord({
      ...input,
      startedAt: "2026-07-01T05:00:00Z",
      endedAt: "2026-07-01T06:00:00Z",
      mileageDate: "2026-06-30",
    });
    expect(record.mileageDate).toBe("2026-06-30");
    expect(mileage.getBusinessMileageRateForDate).toHaveBeenCalledWith(
      "2026-06-30"
    );
    expect(mileage.getBusinessMileageRateForDate).toHaveBeenCalledTimes(1);
  });
  it("does not silently estimate unsupported mileage dates", () => {
    mileage.getBusinessMileageRateForDate.mockImplementation(() => {
      throw new Error("unsupported");
    });
    expect(() => canonicalWorkRecord(input)).toThrow(/unavailable/);
  });
});

describe("manual record ownership and retries", () => {
  it("returns the same persisted row for exact retries and never changes saved amounts", async () => {
    const original = stored(canonicalWorkRecord(input));
    repo.findByReference.mockResolvedValue(original);
    expect(await create(7, input)).toEqual({ id: 42 });
    expect(await create(7, input)).toEqual({ id: 42 });
    expect(repo.findByReference).toHaveBeenCalledWith(7, reference);
  });
  it("rejects a reused save reference with edited details instead of reporting success", async () => {
    repo.findByReference.mockResolvedValue(stored(canonicalWorkRecord(input)));
    await expect(
      create(7, { ...input, grossEarnings: 500 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("cannot treat a timer record as a matching manual retry", () => {
    const original = stored(canonicalWorkRecord(input));
    expect(
      sameWorkRecord(
        { ...original, entrySource: "timer" },
        canonicalWorkRecord(input)
      )
    ).toBe(false);
  });
  it("requires authentication before accepting financial data", async () => {
    const caller = workRecordsRouter.createCaller({ user: null } as never);
    await expect(caller.create(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(repo.createWithMileage).not.toHaveBeenCalled();
  });
  it("gets the owner from the session and ignores injected user IDs", async () => {
    const caller = workRecordsRouter.createCaller({ user: { id: 7 } } as never);
    repo.findByReference.mockResolvedValue(stored(canonicalWorkRecord(input)));
    await caller.create({ ...input, userId: 99 } as never);
    expect(repo.createWithMileage).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ platform: "DoorDash" })
    );
  });
  it("makes absent/unowned deletion retries harmless without revealing record existence", async () => {
    const caller = workRecordsRouter.createCaller({ user: { id: 7 } } as never);
    repo.removeManualWithMileage.mockResolvedValue(false);
    repo.findOwned.mockResolvedValue(undefined);
    await expect(caller.remove({ recordId: 42 })).resolves.toEqual({
      removed: true,
    });
    expect(repo.removeManualWithMileage).toHaveBeenCalledWith(7, 42);
  });
  it("rejects deletion of an owned timer record", async () => {
    const caller = workRecordsRouter.createCaller({ user: { id: 7 } } as never);
    repo.removeManualWithMileage.mockResolvedValue(false);
    repo.findOwned.mockResolvedValue({
      entrySource: "timer",
      status: "completed",
    });
    await expect(caller.remove({ recordId: 42 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
  it("redacts unexpected database errors", async () => {
    const caller = workRecordsRouter.createCaller({ user: { id: 7 } } as never);
    repo.createWithMileage.mockRejectedValue(
      new Error("postgresql://private-financial-details")
    );
    await expect(caller.create(input)).rejects.toMatchObject({
      message: "The work record operation could not finish. Please retry.",
    });
  });
});

it("rejects an edited mileage date with the same save reference even when amounts and work times match", async () => {
  repo.findByReference.mockResolvedValue(stored(canonicalWorkRecord(input)));
  await expect(
    create(7, { ...input, mileageDate: "2025-09-30" })
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
