import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import * as userService from "./user.service";

function isValidUsername(username: string): boolean {
  if (username.length < 3 || username.length > 32) return false;

  for (const character of username) {
    const isLowercaseLetter = character >= "a" && character <= "z";
    const isDigit = character >= "0" && character <= "9";
    const isAllowedSymbol =
      character === "." || character === "-" || character === "_";
    if (!isLowercaseLetter && !isDigit && !isAllowedSymbol) return false;
  }

  const firstCharacter = username[0];
  const lastCharacter = username[username.length - 1];
  return (
    ![".", "-", "_"].includes(firstCharacter ?? "") &&
    ![".", "-", "_"].includes(lastCharacter ?? "")
  );
}

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .refine(isValidUsername, {
    message:
      "Username can only contain lowercase letters, numbers, dots, hyphens, and underscores",
  });

export const userRouter = router({
  /** Update the current user's display name */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        username: usernameSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.updateProfile(ctx.user, input);
    }),

  /** Get notification & display preferences */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return userService.getPreferences(ctx.user);
  }),

  /** Update notification & display preferences */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
        orderUpdates: z.boolean().optional(),
        teamAlerts: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
        weeklyDigest: z.boolean().optional(),
        analyticsSharing: z.boolean().optional(),
        theme: z.enum(["light", "dark"]).optional(),
        language: z.string().max(10).optional(),
        timezone: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.updatePreferences(ctx.user, input);
    }),

  /**
   * Revoke all sessions by setting passwordChangedAt to now.
   * Any JWT with iat < passwordChangedAt is rejected by the SDK.
   */
  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    return userService.revokeAllSessions(ctx.user);
  }),
  /** H3 — Change password. Requires current password. Bumping
   *  passwordChangedAt invalidates every session including this one. */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.changePassword(ctx.user, input);
    }),

  /** H4 — Change email. Requires password. Sets emailVerified=false; user
   *  re-verifies via the existing verification flow. Bumps passwordChangedAt
   *  so the new email takes effect on next sign-in. */
  changeEmail: protectedProcedure
    .input(
      z.object({
        newEmail: z.string().email().toLowerCase(),
        currentPassword: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.changeEmail(ctx.user, input);
    }),

  /** H2 — Soft-delete the user's account (GDPR Art. 17 / CCPA right-to-delete).
   *  Sets users.deletedAt and bumps passwordChangedAt to invalidate sessions.
   *  authenticateRequest enforces deletedAt on every subsequent request. */
  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmEmail: z.string().email().toLowerCase(),
        currentPassword: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.deleteAccount(ctx.user, input);
    }),
});
