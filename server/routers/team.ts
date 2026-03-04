import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { teamInvites, users } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

const INVITE_EXPIRY_DAYS = 7;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

export const teamRouter = router({
  // List all team members for the current tenant
  listMembers: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
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
    if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
    const db = await requireDb();

    return db
      .select()
      .from(teamInvites)
      .where(eq(teamInvites.tenantId, tenantId));
  }),

  // Send an invite to an email address
  invite: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(["user", "admin"]).default("user"),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
      const db = await requireDb();

      // Check if already a member
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, input.email), eq(users.tenantId, tenantId)));
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a team member" });
      }

      // Revoke any existing pending invite for this email
      await db
        .update(teamInvites)
        .set({ status: "revoked" })
        .where(and(
          eq(teamInvites.tenantId, tenantId),
          eq(teamInvites.email, input.email),
          eq(teamInvites.status, "pending"),
        ));

      // Create new invite
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await db.insert(teamInvites).values({
        tenantId,
        email: input.email,
        role: input.role,
        token,
        invitedBy: ctx.user.id,
        status: "pending",
        expiresAt,
      });

      return { token, expiresAt };
    }),

  // Revoke a pending invite
  revokeInvite: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
      const db = await requireDb();

      const invite = await db
        .select()
        .from(teamInvites)
        .where(and(eq(teamInvites.id, input.id), eq(teamInvites.tenantId, tenantId)));

      if (!invite[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });

      await db
        .update(teamInvites)
        .set({ status: "revoked" })
        .where(eq(teamInvites.id, input.id));

      return { success: true };
    }),

  // Update a team member's role (admin only)
  updateMemberRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
      const db = await requireDb();

      const member = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)));

      if (!member[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  // Remove a team member (unlink from tenant, admin only)
  removeMember: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant" });
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove yourself" });
      const db = await requireDb();

      const member = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)));

      if (!member[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

      // Unlink from tenant (don't delete the user account)
      await db
        .update(users)
        .set({ tenantId: null } as any)
        .where(eq(users.id, input.userId));

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
        .where(and(
          eq(teamInvites.token, input.token),
          eq(teamInvites.status, "pending"),
          gt(teamInvites.expiresAt, new Date()),
        ));

      if (!invite[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found or expired" });
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
