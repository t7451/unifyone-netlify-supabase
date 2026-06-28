import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  cliCommandHistory,
  cliSessions,
  cliVpsConnections,
  orders,
  products,
  tenants,
  webhookEvents,
} from "../../../drizzle/schema";

/**
 * Data-access layer for the in-website CLI. Wraps the existing ../../db helper
 * (getDb) and the Drizzle queries used by the platform command handler and the
 * VPS/session procedures — relocated verbatim, not rewritten.
 *
 * Query helpers take the already-resolved `db` handle so the service layer can
 * keep the original control flow (e.g. the `!db || !tenantId` guards) intact.
 */

export { getDb };

// db handle type used by the query helpers below.
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function selectTenantStatus(db: Db, tenantId: number) {
  return db
    .select({
      name: tenants.name,
      status: tenants.status,
      subscriptionStatus: tenants.subscriptionStatus,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
}

export function selectTenant(db: Db, tenantId: number) {
  return db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
}

export function selectRecentOrders(db: Db, tenantId: number) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.tenantId, tenantId))
    .orderBy(desc(orders.createdAt))
    .limit(10);
}

export function selectOrderById(db: Db, tenantId: number, id: number) {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tenantId), eq(orders.id, id)))
    .limit(1);
}

export function selectActiveProducts(db: Db, tenantId: number) {
  return db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      status: products.status,
    })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), eq(products.status, "active")))
    .limit(10);
}

export function selectOrderTotals(db: Db, tenantId: number) {
  return db
    .select({
      total: orders.total,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.tenantId, tenantId));
}

export function selectWebhookEvents(db: Db, tenantId: number, limit: number) {
  return db
    .select({
      id: webhookEvents.id,
      source: webhookEvents.source,
      eventType: webhookEvents.eventType,
      status: webhookEvents.status,
      createdAt: webhookEvents.createdAt,
    })
    .from(webhookEvents)
    .where(eq(webhookEvents.tenantId, tenantId))
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}

export function insertCommandHistory(
  db: Db,
  values: {
    userId: number;
    tenantId: number | null;
    sessionId: number | null;
    command: string;
    output: string;
    exitCode: number;
  }
) {
  return db.insert(cliCommandHistory).values(values);
}

export function selectCommandHistory(
  db: Db,
  userId: number,
  limit: number,
  offset: number
) {
  return db
    .select()
    .from(cliCommandHistory)
    .where(eq(cliCommandHistory.userId, userId))
    .orderBy(desc(cliCommandHistory.executedAt))
    .limit(limit)
    .offset(offset);
}

export function selectVpsConnections(db: Db, userId: number) {
  return db
    .select({
      id: cliVpsConnections.id,
      label: cliVpsConnections.label,
      host: cliVpsConnections.host,
      port: cliVpsConnections.port,
      username: cliVpsConnections.username,
      hasKey: cliVpsConnections.encryptedPrivateKey,
      createdAt: cliVpsConnections.createdAt,
    })
    .from(cliVpsConnections)
    .where(eq(cliVpsConnections.userId, userId));
}

export function insertVpsConnection(
  db: Db,
  values: {
    tenantId: number | null;
    userId: number;
    label: string;
    host: string;
    port: number;
    username: string;
    encryptedPrivateKey: string | null;
  }
) {
  return db.insert(cliVpsConnections).values(values).returning({
    id: cliVpsConnections.id,
    label: cliVpsConnections.label,
    host: cliVpsConnections.host,
    port: cliVpsConnections.port,
    username: cliVpsConnections.username,
  });
}

export function deleteVpsConnection(db: Db, userId: number, id: number) {
  return db
    .delete(cliVpsConnections)
    .where(
      and(eq(cliVpsConnections.id, id), eq(cliVpsConnections.userId, userId))
    );
}

export function selectVpsConnectionById(db: Db, userId: number, id: number) {
  return db
    .select()
    .from(cliVpsConnections)
    .where(
      and(eq(cliVpsConnections.id, id), eq(cliVpsConnections.userId, userId))
    )
    .limit(1);
}

export function insertSession(
  db: Db,
  values: {
    userId: number;
    tenantId: number | null;
    mode: "platform" | "vps" | "local";
    vpsId: number | null;
  }
) {
  return db
    .insert(cliSessions)
    .values(values)
    .returning({ id: cliSessions.id });
}

export function closeSession(
  db: Db,
  userId: number,
  sessionId: number,
  exitCode: number
) {
  return db
    .update(cliSessions)
    .set({ endedAt: new Date(), exitCode })
    .where(and(eq(cliSessions.id, sessionId), eq(cliSessions.userId, userId)));
}
