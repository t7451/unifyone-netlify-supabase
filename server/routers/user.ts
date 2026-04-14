import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, userPreferences } from "../../drizzle/schema";

export const userRouter = router({
  /** Update the current user's display name */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
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
});
