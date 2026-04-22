import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, userPreferences } from "../../drizzle/schema";

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
  return ![".", "-", "_"].includes(firstCharacter ?? "") &&
    ![".", "-", "_"].includes(lastCharacter ?? "");
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
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) updateData.name = input.name;

      if (input.username !== undefined) {
        const existingUsername = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);

        if (existingUsername[0] && existingUsername[0].id !== ctx.user.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That username is already in use.",
          });
        }

        updateData.username = input.username;
      }

      await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));

      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);
      return result[0];
    }),

  /** Get notification & display preferences */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    const result = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.user.id))
      .limit(1);

    if (result[0]) return result[0];

    // Create default preferences
    const inserted = await db
      .insert(userPreferences)
      .values({ userId: ctx.user.id })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { updatedAt: new Date() },
      })
      .returning();
    return inserted[0];
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
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });

      // Ensure row exists
      await db
        .insert(userPreferences)
        .values({ userId: ctx.user.id })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { updatedAt: new Date() },
        });

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) updateData[key] = value;
      }

      await db
        .update(userPreferences)
        .set(updateData)
        .where(eq(userPreferences.userId, ctx.user.id));

      const result = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .limit(1);
      return result[0];
    }),

  /**
   * Revoke all sessions by setting passwordChangedAt to now.
   * Any JWT with iat < passwordChangedAt is rejected by the SDK.
   */
  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });

    await db
      .update(users)
      .set({ passwordChangedAt: new Date() })
      .where(eq(users.id, ctx.user.id));

    return { success: true };
  }),
});
