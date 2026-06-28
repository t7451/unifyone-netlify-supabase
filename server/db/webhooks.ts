import { and, count, desc, eq, ilike } from "drizzle-orm";
import { webhookEvents } from "../../drizzle/schema";
import { getDb } from "./connection";

// ── Webhooks ──────────────────────────────────────────────────────────────────

/**
 * Log a webhook event scoped to a specific tenant.
 * `tenantId` is required to prevent cross-tenant data leakage when querying events.
 * For system-level events with no tenant context, use `logSystemWebhookEvent`.
 */
export async function logWebhookEvent(
  source: "stripe" | "shopify" | "n8n" | "internal",
  eventType: string,
  payload: Record<string, unknown>,
  tenantId: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(webhookEvents)
    .values({ source, eventType, payload, tenantId });
}

/**
 * Log a system-level webhook event that has no tenant association
 * (e.g. Stripe events before tenant is resolved).
 * Only use this for events that genuinely cannot be scoped to a tenant.
 */
export async function logSystemWebhookEvent(
  source: "stripe" | "shopify" | "n8n" | "internal",
  eventType: string,
  payload: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookEvents).values({ source, eventType, payload });
}

/**
 * Retrieve webhook events for a specific tenant.
 * Always requires tenantId — callers must not pass undefined.
 */
export async function getWebhookEvents(tenantId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.tenantId, tenantId))
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}

/**
 * Admin-only: retrieve webhook events across all tenants.
 * Do NOT expose this to non-admin users.
 */
export async function getAllWebhookEventsAdmin(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}

/**
 * Retrieve webhook events for a tenant with optional source/status/eventType filters.
 */
export async function getFilteredWebhookEvents(
  tenantId: number,
  opts: {
    limit?: number;
    source?: "stripe" | "shopify" | "n8n" | "internal";
    status?: "pending" | "processed" | "failed" | "skipped";
    search?: string;
  } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50, source, status, search } = opts;

  const conditions = [eq(webhookEvents.tenantId, tenantId)];
  if (source) conditions.push(eq(webhookEvents.source, source));
  if (status) conditions.push(eq(webhookEvents.status, status));
  if (search) conditions.push(ilike(webhookEvents.eventType, `%${search}%`));

  return db
    .select()
    .from(webhookEvents)
    .where(and(...conditions))
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}

/**
 * Aggregate webhook event counts by status for a tenant.
 */
export async function getWebhookStats(tenantId: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, processed: 0, failed: 0, skipped: 0 };

  const rows = await db
    .select({
      status: webhookEvents.status,
      cnt: count(webhookEvents.id),
    })
    .from(webhookEvents)
    .where(eq(webhookEvents.tenantId, tenantId))
    .groupBy(webhookEvents.status);

  const result = { total: 0, pending: 0, processed: 0, failed: 0, skipped: 0 };
  for (const row of rows) {
    const n = Number(row.cnt);
    result.total += n;
    if (row.status === "pending") result.pending = n;
    else if (row.status === "processed") result.processed = n;
    else if (row.status === "failed") result.failed = n;
    else if (row.status === "skipped") result.skipped = n;
  }
  return result;
}

/**
 * Mark a failed webhook event as pending so it can be retried.
 * Only allows retrying events that belong to the given tenant.
 */
export async function retryWebhookEvent(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(webhookEvents)
    .set({ status: "pending", error: null, processedAt: null })
    .where(and(eq(webhookEvents.id, id), eq(webhookEvents.tenantId, tenantId)));
}
