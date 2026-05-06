import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { teamInvites, users } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

import { Resend } from "resend";
const INVITE_EXPIRY_DAYS = 7;

async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

export const teamRouter = router({
  // List all team members for the current tenant
  listMembers: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    if (!tenantId)
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
    const db = await requireDb();

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
  }),

  // List all invites (all statuses) for the current tenant
  listInvites: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    if (!tenantId)
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
    const db = await requireDb();

    return db
      .select()
      .from(teamInvites)
      .where(eq(teamInvites.tenantId, tenantId));
  }),

  // Send an invite to an email address
  invite: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["user", "admin"]).default("user"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active tenant",
        });
      const db = await requireDb();

      // Check if already a member
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, input.email), eq(users.tenantId, tenantId)));
      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a team member",
        });
      }

      // Revoke any existing pending invite for this email
      await db
        .update(teamInvites)
        .set({ status: "revoked" })
        .where(
          and(
            eq(teamInvites.tenantId, tenantId),
            eq(teamInvites.email, input.email),
            eq(teamInvites.status, "pending")
          )
        );

      // Create new invite
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(
        Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      );

      await db.insert(teamInvites).values({
        tenantId,
        email: input.email,
        role: input.role,
        token,
        invitedBy: ctx.user.id,
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
              `${ctx.user.name ?? ctx.user.email} invited you to join their UnifyOne workspace as ${input.role}.\n\n` +
              `Accept your invitation:\n${inviteUrl}\n\n` +
              `This invite expires in ${INVITE_EXPIRY_DAYS} days. ` +
              `If you weren't expecting this email you can safely ignore it.`,
            html:
              `<p>${ctx.user.name ?? ctx.user.email} invited you to join their UnifyOne workspace as <strong>${input.role}</strong>.</p>` +
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
    }),

  // Revoke a pending invite
  revokeInvite: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active tenant",
        });
      const db = await requireDb();

      const invite = await db
        .select()
        .from(teamInvites)
        .where(
          and(eq(teamInvites.id, input.id), eq(teamInvites.tenantId, tenantId))
        );

      if (!invite[0])
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });

      await db
        .update(teamInvites)
        .set({ status: "revoked" })
        .where(
          and(eq(teamInvites.id, input.id), eq(teamInvites.tenantId, tenantId))
        );

      return { success: true };
    }),

  // Update a team member's role (admin only)
  updateMemberRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active tenant",
        });
      if (input.userId === ctx.user.id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      const db = await requireDb();

      const member = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)));

      if (!member[0])
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

      await db
        .update(users)
        .set({ role: input.role })
        .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)));

      return { success: true };
    }),

  // Remove a team member (unlink from tenant, admin only)
  removeMember: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active tenant",
        });
      if (input.userId === ctx.user.id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove yourself",
        });
      const db = await requireDb();

      const member = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)));

      if (!member[0])
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

      // Unlink from tenant (don't delete the user account)
      await db
        .update(users)
        .set({ tenantId: null as unknown as number })
        .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)));

      return { success: true };
    }),

  // Accept an invite by token (called after OAuth login)
  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const invite = await db
        .select()
        .from(teamInvites)
        .where(
          and(
            eq(teamInvites.token, input.token),
            eq(teamInvites.status, "pending"),
            gt(teamInvites.expiresAt, new Date())
          )
        );

      if (!invite[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found or expired",
        });
      }

      // Link user to tenant with the invited role
      await db
        .update(users)
        .set({ tenantId: invite[0].tenantId, role: invite[0].role })
        .where(eq(users.id, ctx.user.id));

      // Mark invite as accepted
      await db
        .update(teamInvites)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(teamInvites.id, invite[0].id));

      return { tenantId: invite[0].tenantId, role: invite[0].role };
    }),
});
