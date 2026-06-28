import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { users, userPreferences } from "../../../drizzle/schema";

/**
 * Data access for the user router.
 *
 * Wraps the shared `getDb` helper plus the `users` / `userPreferences` tables.
 * Queries are relocated verbatim from the original router — same columns, same
 * filters, same upsert semantics.
 */

/** Public-safe user columns — never leak passwordHash, tokens, deletedAt, etc. */
const safeUserColumns = {
  id: users.id,
  openId: users.openId,
  name: users.name,
  email: users.email,
  username: users.username,
  role: users.role,
  tenantId: users.tenantId,
  emailVerified: users.emailVerified,
  loginMethod: users.loginMethod,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastSignedIn: users.lastSignedIn,
  creditBalance: users.creditBalance,
  referralCode: users.referralCode,
};

export async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  return db;
}

type Db = Awaited<ReturnType<typeof requireDb>>;

export async function findUserIdByUsername(db: Db, username: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return rows[0];
}

export async function findUserIdByEmail(db: Db, email: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0];
}

export async function updateUserById(
  db: Db,
  userId: number,
  updateData: Record<string, unknown>
) {
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function getSafeUserById(db: Db, userId: number) {
  const rows = await db
    .select(safeUserColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0];
}

export async function getUserPasswordHash(db: Db, userId: number) {
  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0];
}

export async function getUserEmailAndHash(db: Db, userId: number) {
  const rows = await db
    .select({
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0];
}

export async function getPreferences(db: Db, userId: number) {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return rows[0];
}

export async function insertDefaultPreferencesReturning(
  db: Db,
  userId: number
) {
  const inserted = await db
    .insert(userPreferences)
    .values({ userId })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { updatedAt: new Date() },
    })
    .returning();
  return inserted[0];
}

export async function ensurePreferencesRow(db: Db, userId: number) {
  await db
    .insert(userPreferences)
    .values({ userId })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { updatedAt: new Date() },
    });
}

export async function updatePreferences(
  db: Db,
  userId: number,
  updateData: Record<string, unknown>
) {
  await db
    .update(userPreferences)
    .set(updateData)
    .where(eq(userPreferences.userId, userId));
}
