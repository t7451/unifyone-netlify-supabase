import { randomUUID } from "node:crypto";
import {
  and,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
  desc,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  financialActivity,
  financialConnections,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import type { Provider, ProviderEnvironment, SyncResult } from "./providers";

export async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connected money needs a configured database.",
    });
  return db;
}
export type Connection = typeof financialConnections.$inferSelect;
export const ownership = (userId: number, connectionId: string) =>
  and(
    eq(financialConnections.userId, userId),
    eq(financialConnections.id, connectionId)
  );
export async function listConnections(userId: number) {
  return (await database())
    .select()
    .from(financialConnections)
    .where(eq(financialConnections.userId, userId))
    .orderBy(desc(financialConnections.createdAt));
}
export async function ownedConnection(userId: number, connectionId: string) {
  const [connection] = await (await database())
    .select()
    .from(financialConnections)
    .where(ownership(userId, connectionId))
    .limit(1);
  if (!connection)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Connection not found.",
    });
  return connection;
}
export async function createConnection(
  userId: number,
  provider: Provider,
  environment: ProviderEnvironment,
  externalId?: string,
  encryptedToken?: string
) {
  const db = await database();
  const existing = await listConnections(userId);
  if (existing.length >= 10)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Disconnect an unused connection before adding another.",
    });
  const [connection] = await db
    .insert(financialConnections)
    .values({
      id: randomUUID(),
      userId,
      provider,
      environment,
      externalId,
      encryptedToken,
    })
    .onConflictDoNothing()
    .returning();
  return connection;
}
export async function completeArgyle(
  userId: number,
  connectionId: string,
  externalId: string
) {
  await (await database())
    .update(financialConnections)
    .set({ externalId })
    .where(ownership(userId, connectionId));
}
export async function deleteConnection(userId: number, connectionId: string) {
  // FK cascade removes the local copy of all imported activity.
  await (await database())
    .delete(financialConnections)
    .where(ownership(userId, connectionId));
}
export async function acquireLease(
  userId: number,
  connectionId: string,
  disconnect = false
) {
  const lease = randomUUID();
  const [connection] = await (
    await database()
  )
    .update(financialConnections)
    .set({
      syncLease: lease,
      syncLeaseUntil: new Date(Date.now() + 300_000),
      ...(disconnect ? { status: "disconnecting" } : {}),
    })
    .where(
      and(
        ownership(userId, connectionId),
        or(
          isNull(financialConnections.syncLeaseUntil),
          lt(financialConnections.syncLeaseUntil, new Date())
        ),
        ...(disconnect
          ? []
          : [
              ne(financialConnections.status, "disconnecting"),
              ne(financialConnections.status, "disconnect_failed"),
            ])
      )
    )
    .returning();
  if (!connection) {
    await ownedConnection(userId, connectionId);
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "This connection is busy or awaiting disconnection. Try again shortly.",
    });
  }
  return { connection, lease };
}
export async function releaseLease(
  userId: number,
  connectionId: string,
  lease: string,
  status: string
) {
  await (
    await database()
  )
    .update(financialConnections)
    .set({ syncLease: null, syncLeaseUntil: null, status })
    .where(
      and(
        ownership(userId, connectionId),
        eq(financialConnections.syncLease, lease)
      )
    );
}

export async function commitSync(
  userId: number,
  connectionId: string,
  lease: string,
  result: SyncResult
) {
  const db = await database();
  const connection = await ownedConnection(userId, connectionId);
  if (
    connection.syncLease !== lease ||
    !connection.syncLeaseUntil ||
    connection.syncLeaseUntil.getTime() <= Date.now()
  )
    throw new TRPCError({
      code: "CONFLICT",
      message: "Sync expired. Please refresh again.",
    });
  // Deduplicate modified records across pages, and let removals win.
  const removed = new Set(result.removed);
  const records = Array.from(
    new Map(
      result.records
        .filter(row => !removed.has(row.providerRecordId))
        .map(row => [row.providerRecordId, row])
    ).values()
  );
  const writes = [];
  for (let offset = 0; offset < records.length; offset += 200) {
    writes.push(
      db
        .insert(financialActivity)
        .values(
          records.slice(offset, offset + 200).map(record => ({
            ...record,
            id: randomUUID(),
            userId,
            connectionId,
          }))
        )
        .onConflictDoUpdate({
          target: [
            financialActivity.connectionId,
            financialActivity.providerRecordId,
          ],
          set: {
            sourceAccountId: sql`excluded."sourceAccountId"`,
            kind: sql`excluded.kind`,
            date: sql`excluded.date`,
            description: sql`excluded.description`,
            amount: sql`excluded.amount`,
            currency: sql`excluded.currency`,
            pending: sql`excluded.pending`,
            durationSeconds: sql`excluded."durationSeconds"`,
            updatedAt: new Date(),
          },
        })
    );
  }
  const deletes = [];
  if (result.replace)
    deletes.push(
      db
        .delete(financialActivity)
        .where(
          and(
            eq(financialActivity.userId, userId),
            eq(financialActivity.connectionId, connectionId)
          )
        )
    );
  else
    for (let offset = 0; offset < result.removed.length; offset += 200)
      deletes.push(
        db
          .delete(financialActivity)
          .where(
            and(
              eq(financialActivity.userId, userId),
              eq(financialActivity.connectionId, connectionId),
              inArray(
                financialActivity.providerRecordId,
                result.removed.slice(offset, offset + 200)
              )
            )
          )
      );
  // Neon HTTP batch is transactional. Cursor and activity change together;
  // never advance the cursor if any insert/delete fails.
  await db.batch([
    db
      .update(financialConnections)
      .set({
        cursor: result.cursor,
        accounts: result.accounts,
        status: "ready",
        lastSyncedAt: new Date(),
        syncLease: null,
        syncLeaseUntil: null,
      })
      .where(
        and(
          ownership(userId, connectionId),
          eq(financialConnections.syncLease, lease)
        )
      ),
    ...deletes,
    ...writes,
  ]);
  return { imported: records.length, accounts: result.accounts.length };
}

export async function activityOverview(
  userId: number,
  days: number,
  offset: number
) {
  const db = await database();
  const since = new Date(Date.now() - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const filter = and(
    eq(financialActivity.userId, userId),
    gte(financialActivity.date, since)
  );
  const [activity, totals, count] = await Promise.all([
    db
      .select({
        id: financialActivity.id,
        connectionId: financialActivity.connectionId,
        kind: financialActivity.kind,
        date: financialActivity.date,
        description: financialActivity.description,
        amount: financialActivity.amount,
        currency: financialActivity.currency,
        pending: financialActivity.pending,
        sourceAccountId: financialActivity.sourceAccountId,
        environment: financialConnections.environment,
      })
      .from(financialActivity)
      .innerJoin(
        financialConnections,
        eq(financialActivity.connectionId, financialConnections.id)
      )
      .where(filter)
      .orderBy(desc(financialActivity.date), desc(financialActivity.id))
      .limit(50)
      .offset(offset),
    db
      .select({
        environment: financialConnections.environment,
        kind: financialActivity.kind,
        currency: financialActivity.currency,
        incoming: sql<string>`coalesce(sum(case when ${financialActivity.amount} > 0 then ${financialActivity.amount} else 0 end), 0)`,
        outgoing: sql<string>`coalesce(sum(case when ${financialActivity.amount} < 0 then -${financialActivity.amount} else 0 end), 0)`,
        net: sql<string>`coalesce(sum(${financialActivity.amount}), 0)`,
      })
      .from(financialActivity)
      .innerJoin(
        financialConnections,
        eq(financialActivity.connectionId, financialConnections.id)
      )
      .where(and(filter, eq(financialActivity.pending, false)))
      .groupBy(
        financialConnections.environment,
        financialActivity.kind,
        financialActivity.currency
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(financialActivity)
      .where(filter),
  ]);
  return { activity, totals, total: count[0]?.count ?? 0 };
}
