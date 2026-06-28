import { getDb } from "../../db";
import { teamInvites, users } from "../../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Data access for the team router.
 *
 * Wraps the shared `getDb` helper plus the `users` / `teamInvites` tables.
 * Every tenant-scoped query keeps its existing `tenantId` filter exactly.
 */

export async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

type Db = Awaited<ReturnType<typeof requireDb>>;

export async function listMembers(db: Db, tenantId: number) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(eq(users.tenantId, tenantId));
}

export async function listInvites(db: Db, tenantId: number) {
  return db
    .select()
    .from(teamInvites)
    .where(eq(teamInvites.tenantId, tenantId));
}

export async function findMemberByEmail(
  db: Db,
  tenantId: number,
  email: string
) {
  return db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.tenantId, tenantId)));
}

export async function revokePendingInvitesForEmail(
  db: Db,
  tenantId: number,
  email: string
) {
  await db
    .update(teamInvites)
    .set({ status: "revoked" })
    .where(
      and(
        eq(teamInvites.tenantId, tenantId),
        eq(teamInvites.email, email),
        eq(teamInvites.status, "pending")
      )
    );
}

export async function insertInvite(
  db: Db,
  values: {
    tenantId: number;
    email: string;
    role: "user" | "admin";
    token: string;
    invitedBy: number;
    status: "pending";
    expiresAt: Date;
  }
) {
  await db.insert(teamInvites).values(values);
}

export async function findInviteByIdForTenant(
  db: Db,
  id: number,
  tenantId: number
) {
  return db
    .select()
    .from(teamInvites)
    .where(and(eq(teamInvites.id, id), eq(teamInvites.tenantId, tenantId)));
}

export async function revokeInviteById(db: Db, id: number, tenantId: number) {
  await db
    .update(teamInvites)
    .set({ status: "revoked" })
    .where(and(eq(teamInvites.id, id), eq(teamInvites.tenantId, tenantId)));
}

export async function findMemberByIdForTenant(
  db: Db,
  userId: number,
  tenantId: number
) {
  return db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
}

export async function updateMemberRole(
  db: Db,
  userId: number,
  tenantId: number,
  role: "user" | "admin"
) {
  await db
    .update(users)
    .set({ role })
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
}

export async function unlinkMemberFromTenant(
  db: Db,
  userId: number,
  tenantId: number
) {
  // Unlink from tenant (don't delete the user account)
  await db
    .update(users)
    .set({ tenantId: null as unknown as number })
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));
}

export async function findPendingInviteByToken(db: Db, token: string) {
  return db
    .select()
    .from(teamInvites)
    .where(
      and(
        eq(teamInvites.token, token),
        eq(teamInvites.status, "pending"),
        gt(teamInvites.expiresAt, new Date())
      )
    );
}

export async function linkUserToTenant(
  db: Db,
  userId: number,
  tenantId: number,
  role: typeof users.$inferInsert.role
) {
  await db.update(users).set({ tenantId, role }).where(eq(users.id, userId));
}

export async function markInviteAccepted(db: Db, inviteId: number) {
  await db
    .update(teamInvites)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(teamInvites.id, inviteId));
}
