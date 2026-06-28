import { and, eq, isNull, sql } from "drizzle-orm";
import { InsertUser, users } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { isMasterControlOpenId } from "../lib/masterControl";
import { getDb } from "./connection";

// ── Users ─────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  for (const field of ["name", "email", "loginMethod"] as const) {
    const v = user[field];
    if (v !== undefined) {
      values[field] = v ?? null;
      updateSet[field] = v ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (
    user.openId === ENV.ownerOpenId ||
    isMasterControlOpenId(user.openId)
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  // NOTE:GDPR — INTENTIONALLY return soft-deleted users so sdk.ts
  // authenticateRequest can throw ForbiddenError on user.deletedAt. Filtering
  // here would let sdk fall back to a synthetic anonymous user from the JWT
  // payload and the request would proceed (200 + account:null leak vector).
  // Filter at the auth layer, not the data layer.
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
export async function updateUserTenant(
  userId: number,
  tenantId: number,
  opts: { promoteToAdmin?: boolean } = {}
) {
  const db = await getDb();
  if (!db) return;
  // PATCHED:CR2 — when set, promote the user to role=admin so a tenant owner
  // can manage Team page (invite, role-change, member removal). Without this,
  // tenant.create silently leaves owners as role=user and the Team UI hides.
  const set: { tenantId: number; role?: "admin" } = { tenantId };
  if (opts.promoteToAdmin) set.role = "admin";
  await db.update(users).set(set).where(eq(users.id, userId));
}

export async function getUserCount(tenantId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)));

  return result[0]?.count ?? 0;
}
