import { and, desc, eq, inArray } from "drizzle-orm";
import {
  auditLogs,
  gigAIUsage,
  gigWorkerSubscriptions,
  orders,
  paypalWebhookEvents,
  plans,
  squareWebhookEvents,
  stripeWebhookEvents,
  tenants,
  users,
  webhookEvents,
  type InsertTenant,
  type User,
} from "../../../drizzle/schema";
import { getDb } from "../../db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function safeRows<T>(query: Promise<T[]>): Promise<T[]> {
  try {
    return await query;
  } catch {
    return [];
  }
}

// ── Snapshot data fetch ────────────────────────────────────────────────────────
export async function fetchAllUsers(db: Db): Promise<User[]> {
  return safeRows(db.select().from(users));
}

/**
 * Fetch the five per-tenant/per-user datasets the snapshot aggregates over.
 * Returns the rows in the same tuple order the original snapshot query used.
 */
export async function fetchSnapshotDatasets(
  db: Db,
  tenantIds: number[],
  userIds: number[]
) {
  return Promise.all([
    userIds.length > 0
      ? safeRows(
          db
            .select()
            .from(gigAIUsage)
            .where(inArray(gigAIUsage.userId, userIds))
        )
      : [],
    tenantIds.length > 0
      ? safeRows(
          db
            .select()
            .from(webhookEvents)
            .where(inArray(webhookEvents.tenantId, tenantIds))
        )
      : [],
    tenantIds.length > 0
      ? safeRows(
          db.select().from(orders).where(inArray(orders.tenantId, tenantIds))
        )
      : [],
    safeRows(
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(50)
    ),
    userIds.length > 0
      ? safeRows(
          db
            .select()
            .from(gigWorkerSubscriptions)
            .where(inArray(gigWorkerSubscriptions.userId, userIds))
        )
      : [],
  ]);
}

// ── Plans / tenants ────────────────────────────────────────────────────────────
export async function findActivePlan(db: Db, planId: number) {
  return db
    .select({ id: plans.id })
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.isActive, true)))
    .limit(1);
}

export async function updateTenant(
  db: Db,
  tenantId: number,
  updates: Partial<InsertTenant>
) {
  return db.update(tenants).set(updates).where(eq(tenants.id, tenantId));
}

export async function updateTenantsByIds(
  db: Db,
  tenantIds: number[],
  updates: Partial<InsertTenant>
) {
  return db.update(tenants).set(updates).where(inArray(tenants.id, tenantIds));
}

export async function updateUsersCreditsByTenantIds(
  db: Db,
  tenantIds: number[],
  creditBalance: number
) {
  return db
    .update(users)
    .set({ creditBalance, updatedAt: new Date() })
    .where(inArray(users.tenantId, tenantIds));
}

export async function selectTenantsByIds(db: Db, tenantIds: number[]) {
  return safeRows(
    db.select().from(tenants).where(inArray(tenants.id, tenantIds))
  );
}

// ── Users ──────────────────────────────────────────────────────────────────────
export async function findUserIdByUsername(db: Db, username: string) {
  return db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
}

export async function updateOwnerAccess(
  db: Db,
  openId: string,
  values: { role: "admin"; username?: string; updatedAt: Date }
) {
  return db.update(users).set(values).where(eq(users.openId, openId));
}

export async function findUserIdByOpenId(db: Db, openId: string) {
  return db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
}

export async function findUserIdByEmail(db: Db, email: string) {
  return db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
}

// ── Export tenant ──────────────────────────────────────────────────────────────
export async function fetchTenantExportDatasets(
  db: Db,
  tenantId: number,
  includeAudit: boolean
) {
  return Promise.all([
    safeRows(db.select().from(users).where(eq(users.tenantId, tenantId))),
    safeRows(db.select().from(orders).where(eq(orders.tenantId, tenantId))),
    safeRows(
      db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.tenantId, tenantId))
    ),
    includeAudit
      ? safeRows(
          db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.entityId, tenantId))
            .orderBy(desc(auditLogs.createdAt))
        )
      : [],
  ]);
}

// ── Observability ──────────────────────────────────────────────────────────────
export async function fetchObservabilityDatasets(db: Db) {
  return Promise.all([
    safeRows(
      db
        .select()
        .from(stripeWebhookEvents)
        .orderBy(desc(stripeWebhookEvents.createdAt))
        .limit(50)
    ),
    safeRows(
      db
        .select()
        .from(paypalWebhookEvents)
        .orderBy(desc(paypalWebhookEvents.createdAt))
        .limit(50)
    ),
    safeRows(
      db
        .select()
        .from(squareWebhookEvents)
        .orderBy(desc(squareWebhookEvents.createdAt))
        .limit(50)
    ),
    safeRows(
      db
        .select()
        .from(webhookEvents)
        .orderBy(desc(webhookEvents.createdAt))
        .limit(50)
    ),
    safeRows(
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100)
    ),
  ]);
}

// ── Compliance export ──────────────────────────────────────────────────────────
export async function fetchComplianceDatasets(db: Db, tenantIds: number[]) {
  return Promise.all([
    tenantIds.length > 0
      ? safeRows(
          db.select().from(users).where(inArray(users.tenantId, tenantIds))
        )
      : [],
    safeRows(
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500)
    ),
  ]);
}
