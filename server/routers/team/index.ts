import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../../_core/trpc";
import * as teamService from "./team.service";

export const teamRouter = router({
  // List all team members for the current tenant
  listMembers: protectedProcedure.query(async ({ ctx }) => {
    return teamService.listMembers(ctx.user);
  }),

  // List all invites (all statuses) for the current tenant
  listInvites: protectedProcedure.query(async ({ ctx }) => {
    return teamService.listInvites(ctx.user);
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
      return teamService.invite(ctx.user, input);
    }),

  // Revoke a pending invite
  revokeInvite: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return teamService.revokeInvite(ctx.user, input);
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
      return teamService.updateMemberRole(ctx.user, input);
    }),

  // Remove a team member (unlink from tenant, admin only)
  removeMember: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return teamService.removeMember(ctx.user, input);
    }),

  // Accept an invite by token (called after OAuth login)
  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return teamService.acceptInvite(ctx.user, input);
    }),
});
