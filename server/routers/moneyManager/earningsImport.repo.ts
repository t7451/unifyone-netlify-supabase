import { and, desc, eq, sql } from "drizzle-orm";
import {
  earningsImportBatches,
  importedEarnings,
} from "../../../drizzle/schema";
import { getDb } from "../../db";

export { getDb };
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export type ImportPayloadRow = {
  earnedDate: string;
  grossEarnings: string;
  tips: string;
  bonuses: string;
  totalMiles: string | null;
  rawRow: Record<string, string>;
};

export async function insertAtomic(
  db: Db,
  userId: number,
  input: {
    platform: string;
    fileName: string | null;
    contentFingerprint: string;
    rows: ImportPayloadRow[];
  }
) {
  // JSON binds the bounded payload once instead of exceeding Postgres's bind
  // limit. A row failure rolls back the batch header and every imported row.
  const result = await db.execute<{ batchId: number; inserted: number }>(sql`
    WITH new_batch AS (
      INSERT INTO earnings_import_batches
        ("userId", platform, "fileName", "rowCount", status, "contentFingerprint")
      VALUES (${userId}, ${input.platform}, ${input.fileName}, ${input.rows.length},
        'committed', ${input.contentFingerprint})
      ON CONFLICT ("userId", "contentFingerprint") DO NOTHING
      RETURNING id
    ), new_rows AS (
      INSERT INTO imported_earnings
        ("userId", platform, "earnedDate", "grossEarnings", tips, bonuses,
          "totalMiles", source, "importBatchId", "rawRow")
      SELECT ${userId}, ${input.platform}, r."earnedDate"::timestamptz AT TIME ZONE 'UTC',
        r."grossEarnings"::numeric, r.tips::numeric, r.bonuses::numeric,
        r."totalMiles"::numeric, 'csv', b.id, r."rawRow"
      FROM new_batch b CROSS JOIN jsonb_to_recordset(${JSON.stringify(input.rows)}::jsonb)
        AS r("earnedDate" text, "grossEarnings" text, tips text, bonuses text,
          "totalMiles" text, "rawRow" jsonb)
      RETURNING id
    ) SELECT id AS "batchId", (SELECT count(*)::int FROM new_rows) AS inserted
      FROM new_batch
  `);
  return result.rows[0];
}

function batchTotals() {
  return {
    id: earningsImportBatches.id,
    userId: earningsImportBatches.userId,
    platform: earningsImportBatches.platform,
    fileName: earningsImportBatches.fileName,
    status: earningsImportBatches.status,
    createdAt: earningsImportBatches.createdAt,
    rowCount: sql<number>`count(${importedEarnings.id})::int`.mapWith(Number),
    totalDollars:
      sql<number>`coalesce(sum(${importedEarnings.grossEarnings} + ${importedEarnings.tips} + ${importedEarnings.bonuses}), 0)`.mapWith(
        Number
      ),
  };
}
export async function findByFingerprint(
  db: Db,
  userId: number,
  fingerprint: string
) {
  const [batch] = await db
    .select(batchTotals())
    .from(earningsImportBatches)
    .leftJoin(
      importedEarnings,
      and(
        eq(importedEarnings.importBatchId, earningsImportBatches.id),
        eq(importedEarnings.userId, userId)
      )
    )
    .where(
      and(
        eq(earningsImportBatches.userId, userId),
        eq(earningsImportBatches.contentFingerprint, fingerprint)
      )
    )
    .groupBy(earningsImportBatches.id);
  return batch;
}
export function getImportBatches(db: Db, userId: number) {
  return db
    .select(batchTotals())
    .from(earningsImportBatches)
    .leftJoin(
      importedEarnings,
      and(
        eq(importedEarnings.importBatchId, earningsImportBatches.id),
        eq(importedEarnings.userId, userId)
      )
    )
    .where(eq(earningsImportBatches.userId, userId))
    .groupBy(earningsImportBatches.id)
    .orderBy(
      desc(earningsImportBatches.createdAt),
      desc(earningsImportBatches.id)
    );
}
export async function deleteAtomic(db: Db, userId: number, batchId: number) {
  const result = await db.execute<{ id: number }>(sql`
    WITH owned_batch AS (
      SELECT id FROM earnings_import_batches
      WHERE id = ${batchId} AND "userId" = ${userId} FOR UPDATE
    ), removed_rows AS (
      DELETE FROM imported_earnings WHERE "userId" = ${userId}
        AND "importBatchId" IN (SELECT id FROM owned_batch)
      RETURNING id
    ) DELETE FROM earnings_import_batches
      WHERE id IN (SELECT id FROM owned_batch) AND "userId" = ${userId}
        AND (SELECT count(*) FROM removed_rows) >= 0
      RETURNING id
  `);
  return result.rows.length > 0;
}

// Legacy batches have no fingerprint. Only inspect this owner's candidate
// batches; the service verifies complete normalized contents before matching.
export function getLegacyCandidateRows(
  db: Db,
  userId: number,
  platformKey: string,
  rowCount: number
) {
  return db
    .select({
      batchId: earningsImportBatches.id,
      platform: importedEarnings.platform,
      earnedDate: importedEarnings.earnedDate,
      grossEarnings: importedEarnings.grossEarnings,
      tips: importedEarnings.tips,
      bonuses: importedEarnings.bonuses,
      totalMiles: importedEarnings.totalMiles,
      rawRow: importedEarnings.rawRow,
    })
    .from(earningsImportBatches)
    .innerJoin(
      importedEarnings,
      and(
        eq(importedEarnings.importBatchId, earningsImportBatches.id),
        eq(importedEarnings.userId, userId)
      )
    )
    .where(
      and(
        eq(earningsImportBatches.userId, userId),
        sql`${earningsImportBatches.contentFingerprint} IS NULL`,
        eq(earningsImportBatches.status, "committed"),
        eq(earningsImportBatches.rowCount, rowCount),
        sql`regexp_replace(lower(${earningsImportBatches.platform}), '[^a-z0-9]', '', 'g') = ${platformKey}`
      )
    )
    .orderBy(earningsImportBatches.id, importedEarnings.id)
    .limit(25_001);
}
