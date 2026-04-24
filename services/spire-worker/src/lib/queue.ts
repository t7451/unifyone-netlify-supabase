import { sql, type ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type {
  PostgresJsDatabase,
  PostgresJsQueryResultHKT,
} from "drizzle-orm/postgres-js";
import type postgres from "postgres";
import { schema } from "@1commerce/spire";

// SELECT ... FOR UPDATE SKIP LOCKED: one active worker row per concurrent
// tick, no Redis required. Returns the locked row's id so the caller can
// drive it through the state machine — or null when the queue is empty.
//
// Drizzle 0.45 return types: the top-level db from `drizzle()` carries a
// `$client` accessor; the tx passed into `db.transaction(callback)` is a
// `PgTransaction` that does NOT. The queue helpers work on both — the
// caller passes the top-level db; the tx inside the callback accepts
// update calls without the `$client` field.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- drizzle 0.45's $client accessor is typed with the empty-object postgres generic by design; replicating it here is the only way to match the inferred type from `drizzle(sql, ...)`.
type DB = PostgresJsDatabase<typeof schema> & { $client: postgres.Sql<{}> };
type Tx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
// The API surface callers use inside the tx — union so either works.
type DbOrTx = DB | Tx;

const MAX_ATTEMPTS = 3;

export type ClaimedSubmission = {
  submissionId: string;
  attempt: number;
};

/**
 * Claim one queued submission atomically. Runs inside a transaction so the
 * FOR UPDATE SKIP LOCKED row-lock is enforceable.
 *
 * The caller passes a handler that's invoked with the claimed submission
 * id; the transaction commits after the handler returns. The handler is
 * expected to do its own `await tx.update(...)` calls to move the row
 * through `in_progress` → `sent | failed | queued`.
 */
export async function claimAndProcess(
  db: DB,
  handler: (ctx: {
    tx: Tx;
    submissionId: string;
    attempt: number;
  }) => Promise<void>
): Promise<ClaimedSubmission | null> {
  let claimed: ClaimedSubmission | null = null;

  await db.transaction(async tx => {
    // Pull one row from the head of the queue. FOR UPDATE SKIP LOCKED
    // makes this safe to run from N concurrent workers.
    const rows = await tx.execute(sql`
      select id, attempts
      from spire_submissions
      where status = 'queued'
      order by queued_at asc
      limit 1
      for update skip locked
    `);

    const row = (rows as unknown as Array<{ id: string; attempts: number }>)[0];
    if (!row) return;

    const nextAttempt = row.attempts + 1;
    await tx.execute(sql`
      update spire_submissions
      set status = 'in_progress',
          attempts = ${nextAttempt}
      where id = ${row.id}
    `);

    claimed = { submissionId: row.id, attempt: nextAttempt };
    await handler({ tx, submissionId: row.id, attempt: nextAttempt });
  });

  return claimed;
}

/**
 * Mark a claimed submission as sent. Called from a handler callback.
 */
export async function markSent(
  tx: DbOrTx,
  submissionId: string,
  result: { liveUrl?: string | null; response?: unknown }
): Promise<void> {
  await tx
    .update(schema.submissions)
    .set({
      status: "sent",
      sentAt: new Date(),
      liveUrl: result.liveUrl ?? null,
      response: (result.response ?? null) as Record<string, unknown> | null,
      error: null,
    })
    .where(sqlEq(schema.submissions.id, submissionId));
}

/**
 * Mark a claimed submission as failed or re-queued depending on attempt
 * count. Retries up to MAX_ATTEMPTS times for transient failures; callers
 * pass `retryable: false` for permanent errors (bad auth, deleted directory).
 */
export async function markFailedOrRetry(
  tx: DbOrTx,
  submissionId: string,
  params: {
    error: string;
    attempt: number;
    retryable: boolean;
    response?: unknown;
  }
): Promise<"retry" | "failed"> {
  const { error, attempt, retryable, response } = params;
  const shouldRetry = retryable && attempt < MAX_ATTEMPTS;
  const nextStatus = shouldRetry ? "queued" : "failed";
  await tx
    .update(schema.submissions)
    .set({
      status: nextStatus,
      error: error.slice(0, 2000),
      response: (response ?? null) as Record<string, unknown> | null,
      // When retrying, push queued_at forward a little so we don't hammer
      // the same failing row on every tick.
      ...(shouldRetry
        ? { queuedAt: new Date(Date.now() + 5 * 60 * 1000) }
        : {}),
    })
    .where(sqlEq(schema.submissions.id, submissionId));
  return shouldRetry ? "retry" : "failed";
}

// Drizzle re-export helpers — avoid importing `eq` separately in every caller.
import { eq } from "drizzle-orm";
const sqlEq = eq;
