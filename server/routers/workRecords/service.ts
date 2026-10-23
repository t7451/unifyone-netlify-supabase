import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getBusinessMileageRateForDate } from "../../../shared/mileageRates";
import * as repo from "./repo";

const decimal = (maximum: number) =>
  z
    .number()
    .finite()
    .min(0)
    .max(maximum)
    .refine(
      value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
      "Use no more than two decimal places."
    );
export const createWorkRecordInput = z.object({
  clientReference: z
    .string()
    .uuid()
    .transform(value => value.toLowerCase()),
  platform: z.string().trim().min(1).max(100),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }),
  grossEarnings: decimal(99_999_999.99),
  tips: decimal(99_999_999.99).default(0),
  bonuses: decimal(99_999_999.99).default(0),
  totalMiles: decimal(999_999.99).default(0),
  mileageDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateWorkRecordInput = z.input<typeof createWorkRecordInput>;
export const updateWorkRecordInput = createWorkRecordInput
  .omit({ clientReference: true })
  .extend({
    recordId: z.number().int().positive(),
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true })
      .refine(
        value => Number.isFinite(Date.parse(value)),
        "Use the saved record version."
      ),
  });
export type UpdateWorkRecordInput = z.input<typeof updateWorkRecordInput>;
type PreservedMileage = {
  miles: number;
  date: string;
  rateCents: string;
  deductionCents: number;
};
export type CanonicalWorkRecord = {
  clientReference: string;
  platform: string;
  startedAt: Date;
  endedAt: Date;
  durationMinutes: number;
  grossEarnings: string;
  tips: string;
  bonuses: string;
  totalMiles: string;
  notes: string | null;
  mileageDate: string | null;
  irsRateCents: string | null;
  deductionCents: number;
};

export function canonicalWorkRecord(
  value: CreateWorkRecordInput,
  now = Date.now(),
  preservedMileage?: PreservedMileage
): CanonicalWorkRecord {
  const parsed = createWorkRecordInput.safeParse(value);
  if (!parsed.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        parsed.error.issues[0]?.message ?? "Check the work record details.",
    });
  const input = parsed.data;
  const startedAt = new Date(input.startedAt);
  const endedAt = new Date(input.endedAt);
  const duration = endedAt.getTime() - startedAt.getTime();
  if (duration < 60_000 || duration > 24 * 60 * 60_000)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Work must last at least one minute and no more than 24 hours. Split longer work into separate records.",
    });
  if (endedAt.getTime() > now)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The work end time cannot be in the future.",
    });
  let rate: number | null = null;
  let mileageDate: string | null = null;
  if (input.totalMiles > 0) {
    if (!input.mileageDate)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Choose the local calendar date when these business miles were driven.",
      });
    const date = new Date(`${input.mileageDate}T00:00:00Z`);
    const startDay = Date.parse(
      `${startedAt.toISOString().slice(0, 10)}T00:00:00Z`
    );
    const endDay = Date.parse(
      `${endedAt.toISOString().slice(0, 10)}T00:00:00Z`
    );
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== input.mileageDate ||
      Math.abs(date.getTime() - startDay) > 86400000 ||
      Math.abs(date.getTime() - endDay) > 86400000
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "The mileage date must be a real calendar date within one day of this work session.",
      });
    }
    try {
      rate =
        preservedMileage &&
        preservedMileage.miles === input.totalMiles &&
        preservedMileage.date === input.mileageDate
          ? Number(preservedMileage.rateCents)
          : getBusinessMileageRateForDate(input.mileageDate);
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "A verified business mileage rate is unavailable for that date. Choose a supported mileage date.",
      });
    }
    mileageDate = input.mileageDate;
  }

  return {
    clientReference: input.clientReference,
    platform: input.platform,
    startedAt,
    endedAt,
    durationMinutes: Math.round(duration / 60_000),
    grossEarnings: input.grossEarnings.toFixed(2),
    tips: input.tips.toFixed(2),
    bonuses: input.bonuses.toFixed(2),
    totalMiles: input.totalMiles.toFixed(2),
    notes: input.notes?.trim() || null,
    mileageDate,
    irsRateCents: rate === null ? null : rate.toFixed(2),
    deductionCents:
      preservedMileage &&
      preservedMileage.miles === input.totalMiles &&
      preservedMileage.date === mileageDate
        ? preservedMileage.deductionCents
        : rate === null
          ? 0
          : Math.round(input.totalMiles * rate),
  };
}

export function sameWorkRecord(
  stored: repo.StoredWorkRecord,
  input: CanonicalWorkRecord
) {
  return (
    stored.entrySource === "manual" &&
    stored.status === "completed" &&
    stored.platform === input.platform &&
    new Date(stored.startTime).getTime() === input.startedAt.getTime() &&
    stored.endTime !== null &&
    new Date(stored.endTime).getTime() === input.endedAt.getTime() &&
    Number(stored.grossEarnings) === Number(input.grossEarnings) &&
    Number(stored.tips) === Number(input.tips) &&
    Number(stored.bonuses) === Number(input.bonuses) &&
    Number(stored.totalMiles) === Number(input.totalMiles) &&
    (stored.mileageDate
      ? new Date(stored.mileageDate).toISOString().slice(0, 10)
      : null) === input.mileageDate &&
    (stored.notes?.trim() || null) === input.notes
  );
}

export async function create(userId: number, input: CreateWorkRecordInput) {
  const canonical = canonicalWorkRecord(input);
  await repo.createWithMileage(userId, canonical);
  // A fresh read also sees a concurrently committed row after ON CONFLICT waits.
  const stored = await repo.findByReference(userId, canonical.clientReference);
  if (!stored)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "This work record could not be confirmed. Retry the same saved details.",
    });
  if (!sameWorkRecord(stored, canonical))
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This save reference already belongs to different work details. The original record was kept.",
    });
  return { id: stored.id };
}

export async function remove(userId: number, recordId: number) {
  const removed = await repo.removeManualWithMileage(userId, recordId);
  if (!removed) {
    const existing = await repo.findOwned(userId, recordId);
    if (existing)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only manually entered completed work can be removed here.",
      });
    // Idempotent deletion: nonexistent/unowned IDs have no effect or existence leak.
  }
  return { removed: true as const };
}

function savedVersion(record: repo.StoredEditableWorkRecord) {
  return new Date(record.updatedAt).toISOString();
}
function requireEditable(
  record: repo.StoredEditableWorkRecord | undefined,
  userId: number
) {
  if (!record)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Work record not found.",
    });
  if (
    record.entrySource !== "manual" ||
    record.status !== "completed" ||
    !record.clientReference ||
    !record.endTime
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only manually entered completed work can be edited here.",
    });
  if (
    record.linkedMileageCount > 1 ||
    (record.linkedMileageCount === 1 &&
      (record.linkedMileageOwner !== userId ||
        record.linkedMileagePurpose !== "business" ||
        Number(record.totalMiles) <= 0 ||
        Number(record.linkedMileageMiles) !== Number(record.totalMiles)))
  )
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "The mileage linked to this work needs review before it can be edited. No records were changed.",
    });
  return {
    ...record,
    clientReference: record.clientReference,
    endTime: record.endTime,
  };
}
export async function get(userId: number, recordId: number) {
  const record = requireEditable(
    await repo.findEditable(userId, recordId),
    userId
  );
  return {
    id: record.id,
    clientReference: record.clientReference,
    platform: record.platform,
    startedAt: new Date(record.startTime).toISOString(),
    endedAt: new Date(record.endTime).toISOString(),
    grossEarnings: record.grossEarnings,
    tips: record.tips,
    bonuses: record.bonuses,
    totalMiles: record.totalMiles,
    mileageDate: record.mileageDate
      ? new Date(record.mileageDate).toISOString().slice(0, 10)
      : null,
    notes: record.notes,
    updatedAt: savedVersion(record),
  };
}
export async function update(userId: number, value: UpdateWorkRecordInput) {
  const parsed = updateWorkRecordInput.safeParse(value);
  if (!parsed.success)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        parsed.error.issues[0]?.message ?? "Check the work record details.",
    });
  const input = parsed.data;
  const stored = requireEditable(
    await repo.findEditable(userId, input.recordId),
    userId
  );
  const preserved =
    stored.mileageDate &&
    stored.irsRateCents !== null &&
    stored.deductionCents !== null
      ? {
          miles: Number(stored.totalMiles),
          date: new Date(stored.mileageDate).toISOString().slice(0, 10),
          rateCents: stored.irsRateCents,
          deductionCents: stored.deductionCents,
        }
      : undefined;
  const canonical = canonicalWorkRecord(
    { ...input, clientReference: stored.clientReference },
    Date.now(),
    preserved
  );
  // Identical fields are a successful retry, including a committed update
  // whose response was lost. Never advance the version for a no-op.
  if (sameWorkRecord(stored, canonical))
    return { id: stored.id, updatedAt: savedVersion(stored) };
  const expected = new Date(input.expectedUpdatedAt).toISOString();
  if (savedVersion(stored) !== expected)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This work was changed elsewhere. Reload the saved record before editing again.",
    });
  const updated = await repo.updateManualWithMileage(
    userId,
    input.recordId,
    expected,
    canonical
  );
  if (updated) return updated;
  const current = requireEditable(
    await repo.findEditable(userId, input.recordId),
    userId
  );
  if (sameWorkRecord(current, canonical))
    return { id: current.id, updatedAt: savedVersion(current) };
  throw new TRPCError({
    code: "CONFLICT",
    message:
      "This work was changed elsewhere. Reload the saved record before editing again.",
  });
}
