import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { Resend } from "resend";
import {
  requireDb,
  listMembers as repoListMembers,
  listInvites as repoListInvites,
  findMemberByEmail,
  revokePendingInvitesForEmail,
  insertInvite,
  findInviteByIdForTenant,
  revokeInviteById,
  findMemberByIdForTenant,
  updateMemberRole as repoUpdateMemberRole,
  unlinkMemberFromTenant,
  findPendingInviteByToken,
  linkUserToTenant,
  markInviteAccepted,
} from "./team.repo";

/**
 * Business logic / use-cases for the team router.
 *
 * Logic is relocated verbatim from the original router. The acting user (id,
 * name, email, tenantId) is passed explicitly so the service has no dependency
 * on tRPC ctx. Tenant scoping is enforced here exactly as before.
 */

const INVITE_EXPIRY_DAYS = 7;

type Actor = {
  id: number;
  name?: string | null;
  email?: string | null;
  tenantId: number | null | undefined;
};

function requireTenant(actor: Actor): number {
  const tenantId = actor.tenantId;
  if (!tenantId)
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
  return tenantId;
}

export async function listMembers(actor: Actor) {
  const tenantId = requireTenant(actor);
  const db = await requireDb();
  return repoListMembers(db, tenantId);
}

export async function listInvites(actor: Actor) {
  const tenantId = requireTenant(actor);
  const db = await requireDb();
  return repoListInvites(db, tenantId);
}

export async function invite(
  actor: Actor,
  input: { email: string; role: "user" | "admin" }
) {
  const tenantId = requireTenant(actor);
  const db = await requireDb();

  // Check if already a member
  const existing = await findMemberByEmail(db, tenantId, input.email);
  if (existing.length > 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "User is already a team member",
    });
  }

  // Revoke any existing pending invite for this email
  await revokePendingInvitesForEmail(db, tenantId, input.email);

  // Create new invite
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await insertInvite(db, {
    tenantId,
    email: input.email,
    role: input.role,
    token,
    invitedBy: actor.id,
    status: "pending",
    expiresAt,
  });

  // PATCHED:CR3 — fire the invite email so the invitee actually knows
  // they were invited. Without this, team.invite was DB-only and the UI
  // told the inviter to copy/paste the link manually.
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const inviteUrl = `${
        process.env.VITE_APP_URL ?? "https://1commerce.online"
      }/accept-invite?token=${token}`;
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: "UnifyOne <hello@1commerce.online>",
        to: input.email,
        subject: `You've been invited to a UnifyOne workspace`,
        text:
          `${actor.name ?? actor.email} invited you to join their UnifyOne workspace as ${input.role}.\n\n` +
          `Accept your invitation:\n${inviteUrl}\n\n` +
          `This invite expires in ${INVITE_EXPIRY_DAYS} days. ` +
          `If you weren't expecting this email you can safely ignore it.`,
        html:
          `<p>${actor.name ?? actor.email} invited you to join their UnifyOne workspace as <strong>${input.role}</strong>.</p>` +
          `<p><a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;background:#0a0c0f;color:#fff;text-decoration:none;border-radius:6px">Accept invitation</a></p>` +
          `<p style="font-size:12px;color:#666">Or copy this link: <code>${inviteUrl}</code><br/>` +
          `Expires in ${INVITE_EXPIRY_DAYS} days. If unexpected, ignore this email.</p>`,
      });
    } else {
      console.warn(
        "[team.invite] RESEND_API_KEY not set — invite email skipped"
      );
    }
  } catch (err) {
    console.error("[team.invite] Resend send failed:", err);
    // Non-fatal — invite row exists; inviter can resend or copy link from UI
  }

  return { token, expiresAt };
}

export async function revokeInvite(actor: Actor, input: { id: number }) {
  const tenantId = requireTenant(actor);
  const db = await requireDb();

  const invite = await findInviteByIdForTenant(db, input.id, tenantId);

  if (!invite[0])
    throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });

  await revokeInviteById(db, input.id, tenantId);

  return { success: true };
}

export async function updateMemberRole(
  actor: Actor,
  input: { userId: number; role: "user" | "admin" }
) {
  const tenantId = requireTenant(actor);
  if (input.userId === actor.id)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot change your own role",
    });
  const db = await requireDb();

  const member = await findMemberByIdForTenant(db, input.userId, tenantId);

  if (!member[0])
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

  await repoUpdateMemberRole(db, input.userId, tenantId, input.role);

  return { success: true };
}

export async function removeMember(actor: Actor, input: { userId: number }) {
  const tenantId = requireTenant(actor);
  if (input.userId === actor.id)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot remove yourself",
    });
  const db = await requireDb();

  const member = await findMemberByIdForTenant(db, input.userId, tenantId);

  if (!member[0])
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

  await unlinkMemberFromTenant(db, input.userId, tenantId);

  return { success: true };
}

export async function acceptInvite(actor: Actor, input: { token: string }) {
  const db = await requireDb();

  const invite = await findPendingInviteByToken(db, input.token);

  if (!invite[0]) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite not found or expired",
    });
  }

  // Link user to tenant with the invited role
  await linkUserToTenant(db, actor.id, invite[0].tenantId, invite[0].role);

  // Mark invite as accepted
  await markInviteAccepted(db, invite[0].id);

  return { tenantId: invite[0].tenantId, role: invite[0].role };
}
