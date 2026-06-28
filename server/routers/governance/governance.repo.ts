import { desc, eq, and, gte, lte, like, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../db";
import {
  auditLogs,
  escalationQueue,
  decisionAuthority,
  killSwitches,
  governanceRules,
} from "../../../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Escape LIKE-pattern wildcards so user input is treated literally. */
export const escapeLikeWildcards = (input: string): string =>
  input.replace(/%/g, "\\%").replace(/_/g, "\\_");

export { getDb };

// ── Audit Logs ───────────────────────────────────────────────────────────────
export function buildAuditLogConditions(input?: {
  dateRange?: { from: string; to: string };
  actor?: string;
  action?: string;
}): SQL | undefined {
  const conditions = [];
  if (input?.dateRange) {
    conditions.push(gte(auditLogs.createdAt, new Date(input.dateRange.from)));
    conditions.push(lte(auditLogs.createdAt, new Date(input.dateRange.to)));
  }
  if (input?.actor) {
    conditions.push(
      like(auditLogs.decisionAuthority, `%${escapeLikeWildcards(input.actor)}%`)
    );
  }
  if (input?.action) {
    conditions.push(
      like(auditLogs.action, `%${escapeLikeWildcards(input.action)}%`)
    );
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function queryAuditLogs(
  db: Db,
  whereClause: SQL | undefined,
  limit: number,
  offset: number
) {
  return Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause),
  ]);
}

export async function insertAuditLog(
  db: Db,
  values: typeof auditLogs.$inferInsert
) {
  return db.insert(auditLogs).values(values);
}

export async function insertAuditLogReturning(
  db: Db,
  values: typeof auditLogs.$inferInsert
) {
  return db.insert(auditLogs).values(values).returning();
}

// ── Escalation Queue ───────────────────────────────────────────────────────────
export async function insertEscalation(
  db: Db,
  values: typeof escalationQueue.$inferInsert
) {
  return db.insert(escalationQueue).values(values).returning();
}

export async function insertEscalationNoReturn(
  db: Db,
  values: typeof escalationQueue.$inferInsert
) {
  return db.insert(escalationQueue).values(values);
}

export async function queryEscalations(
  db: Db,
  whereClause: SQL | undefined,
  limit: number,
  offset: number
) {
  return Promise.all([
    db
      .select()
      .from(escalationQueue)
      .where(whereClause)
      .orderBy(desc(escalationQueue.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(escalationQueue)
      .where(whereClause),
  ]);
}

export function escalationStatusWhere(
  status: "pending" | "approved" | "rejected" | "expired" | "all"
): SQL | undefined {
  return status !== "all"
    ? eq(
        escalationQueue.status,
        status as "pending" | "approved" | "rejected" | "expired"
      )
    : undefined;
}

export async function updateEscalation(
  db: Db,
  id: number,
  values: {
    status: "approved" | "rejected";
    resolvedAt: Date;
    resolvedBy: number;
    resolutionNotes?: string;
  }
) {
  return db
    .update(escalationQueue)
    .set(values)
    .where(eq(escalationQueue.id, id));
}

export async function selectAllEscalations(db: Db) {
  return db.select().from(escalationQueue);
}

// ── Kill Switches ──────────────────────────────────────────────────────────────
export async function selectKillSwitches(db: Db) {
  return db.select().from(killSwitches).orderBy(killSwitches.switchName);
}

export async function findKillSwitchByName(db: Db, switchName: string) {
  return db
    .select()
    .from(killSwitches)
    .where(eq(killSwitches.switchName, switchName))
    .limit(1);
}

export async function updateKillSwitch(
  db: Db,
  switchName: string,
  values: {
    isActive: boolean;
    triggeredBy: number | null;
    triggeredAt: Date | null;
    reason?: string;
  }
) {
  return db
    .update(killSwitches)
    .set(values)
    .where(eq(killSwitches.switchName, switchName));
}

export async function insertKillSwitch(
  db: Db,
  values: typeof killSwitches.$inferInsert
) {
  return db.insert(killSwitches).values(values);
}

export async function selectActiveKillSwitches(db: Db) {
  return db.select().from(killSwitches).where(eq(killSwitches.isActive, true));
}

// ── Governance Rules ───────────────────────────────────────────────────────────
export async function selectActiveRules(db: Db) {
  return db
    .select()
    .from(governanceRules)
    .where(eq(governanceRules.isActive, true))
    .orderBy(governanceRules.ruleName);
}

export async function selectActiveRulesForEntity(db: Db, entityType: string) {
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

export async function insertRule(
  db: Db,
  values: typeof governanceRules.$inferInsert
) {
  return db.insert(governanceRules).values(values);
}

// ── Decision Authority ─────────────────────────────────────────────────────────
export async function selectActiveDecisionAuthority(db: Db) {
  return db
    .select()
    .from(decisionAuthority)
    .where(eq(decisionAuthority.active, true));
}
