import { TRPCError } from "@trpc/server";
import { hashPassword, verifyPassword } from "../../_core/customAuth";
import { logAudit } from "../../auditLogger";
import {
  requireDb,
  findUserIdByUsername,
  findUserIdByEmail,
  updateUserById,
  getSafeUserById,
  getUserPasswordHash,
  getUserEmailAndHash,
  getPreferences as repoGetPreferences,
  insertDefaultPreferencesReturning,
  ensurePreferencesRow,
  updatePreferences as repoUpdatePreferences,
} from "./user.repo";

/**
 * Business logic / use-cases for the user router.
 *
 * Logic is relocated verbatim from the original router. The actor's id and
 * tenantId are passed explicitly so the service has no dependency on tRPC ctx.
 */

type Actor = { id: number; tenantId: number | null | undefined };

export async function updateProfile(
  actor: Actor,
  input: { name?: string; username?: string }
) {
  const db = await requireDb();

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updateData.name = input.name;

  if (input.username !== undefined) {
    const existingUsername = await findUserIdByUsername(db, input.username);

    if (existingUsername && existingUsername.id !== actor.id) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "That username is already in use.",
      });
    }

    updateData.username = input.username;
  }

  await updateUserById(db, actor.id, updateData);

  // PATCHED:H1 — narrow returning columns so we never leak passwordHash,
  // emailVerificationToken, passwordResetToken, passwordResetExpiresAt,
  // passwordChangedAt, deletedAt to the client.
  return getSafeUserById(db, actor.id);
}

export async function getPreferences(actor: Actor) {
  const db = await requireDb();

  const result = await repoGetPreferences(db, actor.id);
  if (result) return result;

  // Create default preferences
  return insertDefaultPreferencesReturning(db, actor.id);
}

export async function updatePreferences(
  actor: Actor,
  input: Record<string, unknown>
) {
  const db = await requireDb();

  // Ensure row exists
  await ensurePreferencesRow(db, actor.id);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) updateData[key] = value;
  }

  await repoUpdatePreferences(db, actor.id, updateData);

  return repoGetPreferences(db, actor.id);
}

/**
 * Revoke all sessions by setting passwordChangedAt to now.
 * Any JWT with iat < passwordChangedAt is rejected by the SDK.
 */
export async function revokeAllSessions(actor: Actor) {
  const db = await requireDb();

  await updateUserById(db, actor.id, { passwordChangedAt: new Date() });

  return { success: true };
}

/** H3 — Change password. Requires current password. Bumping
 *  passwordChangedAt invalidates every session including this one. */
export async function changePassword(
  actor: Actor,
  input: { currentPassword: string; newPassword: string }
) {
  const db = await requireDb();

  const row = await getUserPasswordHash(db, actor.id);

  const existingHash = row?.passwordHash;
  if (!existingHash) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "No password set for this account. Use the password reset flow first.",
    });
  }

  const ok = await verifyPassword(input.currentPassword, existingHash);
  if (!ok) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Current password is incorrect.",
    });
  }
  if (input.currentPassword === input.newPassword) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "New password must differ from current password.",
    });
  }

  const newHash = await hashPassword(input.newPassword);
  const now = new Date();
  await updateUserById(db, actor.id, {
    passwordHash: newHash,
    passwordChangedAt: now,
    updatedAt: now,
  });

  logAudit({
    userId: actor.id,
    tenantId: actor.tenantId ?? undefined,
    action: "user.changePassword",
    resource: "user",
    resourceId: String(actor.id),
    severity: "high",
  }).catch(() => {});

  return { success: true };
}

/** H4 — Change email. Requires password. Sets emailVerified=false; user
 *  re-verifies via the existing verification flow. Bumps passwordChangedAt
 *  so the new email takes effect on next sign-in. */
export async function changeEmail(
  actor: Actor,
  input: { newEmail: string; currentPassword: string }
) {
  const db = await requireDb();

  const row = await getUserEmailAndHash(db, actor.id);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  if (row.email === input.newEmail) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That is already your current email.",
    });
  }
  if (!row.passwordHash) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Set a password on this account before changing email.",
    });
  }

  const ok = await verifyPassword(input.currentPassword, row.passwordHash);
  if (!ok) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Password is incorrect.",
    });
  }

  const conflict = await findUserIdByEmail(db, input.newEmail);
  if (conflict && conflict.id !== actor.id) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That email is already in use.",
    });
  }

  const now = new Date();
  const oldEmail = row.email;
  await updateUserById(db, actor.id, {
    email: input.newEmail,
    emailVerified: false,
    emailVerificationToken: null,
    passwordChangedAt: now,
    updatedAt: now,
  });

  logAudit({
    userId: actor.id,
    tenantId: actor.tenantId ?? undefined,
    action: "user.changeEmail",
    resource: "user",
    resourceId: String(actor.id),
    severity: "high",
    metadata: { oldEmail, newEmail: input.newEmail },
  }).catch(() => {});

  return { success: true, newEmail: input.newEmail };
}

/** H2 — Soft-delete the user's account (GDPR Art. 17 / CCPA right-to-delete).
 *  Sets users.deletedAt and bumps passwordChangedAt to invalidate sessions.
 *  authenticateRequest enforces deletedAt on every subsequent request. */
export async function deleteAccount(
  actor: Actor,
  input: { confirmEmail: string; currentPassword: string }
) {
  const db = await requireDb();

  const row = await getUserEmailAndHash(db, actor.id);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  if ((row.email ?? "").toLowerCase() !== input.confirmEmail) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Confirmation email does not match the account on file.",
    });
  }
  if (!row.passwordHash) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Password required to delete account. Set one via password reset first.",
    });
  }

  const ok = await verifyPassword(input.currentPassword, row.passwordHash);
  if (!ok) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Password is incorrect.",
    });
  }

  const now = new Date();
  await updateUserById(db, actor.id, {
    deletedAt: now,
    passwordChangedAt: now,
    updatedAt: now,
  });

  logAudit({
    userId: actor.id,
    tenantId: actor.tenantId ?? undefined,
    action: "user.deleteAccount",
    resource: "user",
    resourceId: String(actor.id),
    severity: "critical",
    metadata: { email: row.email },
  }).catch(() => {});

  return { success: true };
}
