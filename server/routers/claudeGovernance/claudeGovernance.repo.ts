import { eq, and } from "drizzle-orm";
import {
  auditLogs,
  escalationQueue,
  governanceRules,
} from "../../../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof import("../../db").getDb>>>;

/**
 * Data access for the Claude governance reasoning engine. Callers obtain the
 * `db` handle (and perform the null check) before invoking these helpers — this
 * keeps the existing "database unavailable" error semantics in the procedures.
 */
export async function getActiveRulesForEntity(db: Db, entityType: string) {
  return db
    .select()
    .from(governanceRules)
    .where(
      and(
        eq(governanceRules.isActive, true),
        eq(governanceRules.entityType, entityType)
      )
    );
}

export async function insertAuditLog(
  db: Db,
  values: typeof auditLogs.$inferInsert
) {
  return db.insert(auditLogs).values(values).returning();
}

export async function insertEscalation(
  db: Db,
  values: typeof escalationQueue.$inferInsert
) {
  return db
    .insert(escalationQueue)
    .values(values)
    .returning({ id: escalationQueue.id });
}

export async function getEscalationById(db: Db, escalationId: number) {
  return db
    .select()
    .from(escalationQueue)
    .where(eq(escalationQueue.id, escalationId))
    .limit(1);
}
