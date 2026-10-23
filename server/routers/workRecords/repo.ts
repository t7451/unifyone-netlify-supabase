import { and, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { gigShifts, mileageLogs } from "../../../drizzle/schema";
import { getDb } from "../../db";
import type { CanonicalWorkRecord } from "./service";

export type StoredWorkRecord = typeof gigShifts.$inferSelect & {
  mileageDate: Date | null;
};
async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Work records need a configured database.",
    });
  return db;
}
export async function findByReference(userId: number, clientReference: string) {
  const [record] = await (
    await database()
  )
    .select({ work: gigShifts, mileageDate: mileageLogs.date })
    .from(gigShifts)
    .leftJoin(
      mileageLogs,
      and(eq(mileageLogs.shiftId, gigShifts.id), eq(mileageLogs.userId, userId))
    )
    .where(
      and(
        eq(gigShifts.userId, userId),
        eq(gigShifts.clientReference, clientReference)
      )
    )
    .limit(1);
  return record
    ? { ...record.work, mileageDate: record.mileageDate }
    : undefined;
}
export async function findOwned(userId: number, recordId: number) {
  const [record] = await (
    await database()
  )
    .select()
    .from(gigShifts)
    .where(and(eq(gigShifts.userId, userId), eq(gigShifts.id, recordId)))
    .limit(1);
  return record;
}
export async function createWithMileage(
  userId: number,
  record: CanonicalWorkRecord
) {
  // One statement makes both inserts atomic over Neon HTTP. Only a newly
  // inserted shift can create mileage; an idempotent retry creates neither.
  await (
    await database()
  ).execute(sql`
    WITH inserted_work AS (
      INSERT INTO gig_shifts (
        "userId", platform, "startTime", "endTime", "durationMinutes",
        "grossEarnings", tips, bonuses, "totalMiles", notes, status,
        "entrySource", "clientReference"
      ) VALUES (
        ${userId}, ${record.platform}, ${record.startedAt.toISOString()}::timestamp,
        ${record.endedAt.toISOString()}::timestamp, ${record.durationMinutes},
        ${record.grossEarnings}, ${record.tips}, ${record.bonuses}, ${record.totalMiles},
        ${record.notes}, 'completed', 'manual', ${record.clientReference}
      )
      ON CONFLICT ("userId", "clientReference") DO NOTHING
      RETURNING id
    ), inserted_mileage AS (
      INSERT INTO mileage_logs ("userId", "shiftId", date, miles, purpose, "irsRateCents", "deductionCents")
      SELECT ${userId}, id, ${record.mileageDate ? `${record.mileageDate}T00:00:00Z` : record.endedAt.toISOString()}::timestamp,
        ${record.totalMiles}, 'business', ${record.irsRateCents ?? "0.00"}, ${record.deductionCents}
      FROM inserted_work WHERE ${record.totalMiles}::numeric > 0
      RETURNING id
    ) SELECT id FROM inserted_work
  `);
}
export async function removeManualWithMileage(
  userId: number,
  recordId: number
) {
  const result = await (
    await database()
  ).execute(sql`
    WITH removed_work AS (
      DELETE FROM gig_shifts
      WHERE id = ${recordId} AND "userId" = ${userId}
        AND "entrySource" = 'manual' AND status = 'completed'
      RETURNING id
    ), removed_mileage AS (
      DELETE FROM mileage_logs
      WHERE "userId" = ${userId} AND "shiftId" IN (SELECT id FROM removed_work)
      RETURNING id
    ) SELECT id FROM removed_work
  `);
  return result.rows.length > 0;
}

export type StoredEditableWorkRecord = StoredWorkRecord & {
  linkedMileageCount: number;
  linkedMileageId: number | null;
  linkedMileageOwner: number | null;
  linkedMileageMiles: string | null;
  linkedMileagePurpose: string | null;
  irsRateCents: string | null;
  deductionCents: number | null;
};
export async function findEditable(
  userId: number,
  recordId: number
): Promise<StoredEditableWorkRecord | undefined> {
  const db = await database();
  const [work] = await db
    .select()
    .from(gigShifts)
    .where(and(eq(gigShifts.userId, userId), eq(gigShifts.id, recordId)))
    .limit(1);
  if (!work) return undefined;
  // A maximum of two is sufficient to reject ambiguity. Do not take the
  // first joined mileage row and silently overwrite any secondary log.
  const linked = await db
    .select({
      id: mileageLogs.id,
      userId: mileageLogs.userId,
      date: mileageLogs.date,
      miles: mileageLogs.miles,
      purpose: mileageLogs.purpose,
      rate: mileageLogs.irsRateCents,
      deduction: mileageLogs.deductionCents,
    })
    .from(mileageLogs)
    .where(eq(mileageLogs.shiftId, recordId))
    .limit(2);
  const log = linked.length === 1 ? linked[0] : null;
  return {
    ...work,
    mileageDate: log?.date ?? null,
    linkedMileageCount: linked.length,
    linkedMileageId: log?.id ?? null,
    linkedMileageOwner: log?.userId ?? null,
    linkedMileageMiles: log?.miles ?? null,
    linkedMileagePurpose: log?.purpose ?? null,
    irsRateCents: log?.rate ?? null,
    deductionCents: log?.deduction ?? null,
  };
}
export async function updateManualWithMileage(
  userId: number,
  recordId: number,
  expectedUpdatedAt: string,
  record: CanonicalWorkRecord
): Promise<{ id: number; updatedAt: string } | undefined> {
  const result = await (
    await database()
  ).execute(sql`
    WITH owned_work AS MATERIALIZED (
      SELECT * FROM gig_shifts
      WHERE id = ${recordId} AND "userId" = ${userId}
        AND "entrySource" = 'manual' AND status = 'completed'
      FOR UPDATE
    ), linked_mileage AS MATERIALIZED (
      SELECT log.* FROM mileage_logs log JOIN owned_work work ON log."shiftId" = work.id
      FOR UPDATE OF log
    ), eligible AS (
      SELECT work.id FROM owned_work work
      WHERE date_trunc('milliseconds', work."updatedAt") = ${expectedUpdatedAt}::timestamp
        AND (SELECT count(*) FROM linked_mileage) <= 1
        AND NOT EXISTS (
          SELECT 1 FROM linked_mileage log
          WHERE log."userId" <> ${userId} OR log.purpose <> 'business'
            OR work."totalMiles" <= 0 OR log.miles <> work."totalMiles"
        )
    ), updated_work AS (
      UPDATE gig_shifts work SET
        platform = ${record.platform}, "startTime" = ${record.startedAt.toISOString()}::timestamp,
        "endTime" = ${record.endedAt.toISOString()}::timestamp, "durationMinutes" = ${record.durationMinutes},
        "grossEarnings" = ${record.grossEarnings}, tips = ${record.tips}, bonuses = ${record.bonuses},
        "totalMiles" = ${record.totalMiles}, notes = ${record.notes},
        "updatedAt" = greatest(date_trunc('milliseconds', clock_timestamp() AT TIME ZONE 'UTC'), date_trunc('milliseconds', work."updatedAt") + interval '1 millisecond')
      FROM eligible WHERE work.id = eligible.id AND work."userId" = ${userId}
      RETURNING work.id, work."updatedAt"
    ), updated_mileage AS (
      UPDATE mileage_logs log SET
        date = ${record.mileageDate ? `${record.mileageDate}T00:00:00Z` : record.endedAt.toISOString()}::timestamp,
        miles = ${record.totalMiles},
        "irsRateCents" = CASE WHEN log.miles = ${record.totalMiles}::numeric
          AND log.date::date = ${record.mileageDate}::date THEN log."irsRateCents" ELSE ${record.irsRateCents ?? "0.00"}::numeric END,
        "deductionCents" = CASE WHEN log.miles = ${record.totalMiles}::numeric
          AND log.date::date = ${record.mileageDate}::date THEN log."deductionCents" ELSE ${record.deductionCents} END
      WHERE log.id IN (SELECT id FROM linked_mileage)
        AND log."userId" = ${userId} AND log."shiftId" IN (SELECT id FROM updated_work)
        AND ${record.totalMiles}::numeric > 0
      RETURNING log.id
    ), removed_mileage AS (
      DELETE FROM mileage_logs log
      WHERE log.id IN (SELECT id FROM linked_mileage)
        AND log."userId" = ${userId} AND log."shiftId" IN (SELECT id FROM updated_work)
        AND ${record.totalMiles}::numeric = 0
      RETURNING log.id
    ), inserted_mileage AS (
      INSERT INTO mileage_logs ("userId", "shiftId", date, miles, purpose, "irsRateCents", "deductionCents")
      SELECT ${userId}, id, ${record.mileageDate ? `${record.mileageDate}T00:00:00Z` : record.endedAt.toISOString()}::timestamp,
        ${record.totalMiles}, 'business', ${record.irsRateCents ?? "0.00"}, ${record.deductionCents}
      FROM updated_work
      WHERE ${record.totalMiles}::numeric > 0 AND NOT EXISTS (SELECT 1 FROM linked_mileage)
      RETURNING id
    ) SELECT id, to_char("updatedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt" FROM updated_work
  `);
  const row = result.rows[0];
  return row
    ? { id: Number(row.id), updatedAt: String(row.updatedAt) }
    : undefined;
}
