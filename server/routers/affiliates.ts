import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { affiliatePrograms } from "../../drizzle/schema";

const commissionTypeEnum = z.enum(["percentage", "flat", "recurring"]);

export const affiliatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(affiliatePrograms)
      .where(eq(affiliatePrograms.userId, ctx.user.id))
      .orderBy(desc(affiliatePrograms.monthlyEarnings));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        category: z.string().max(100).optional(),
        platform: z.string().max(100).optional(),
        commissionRate: z.number().min(0).max(100),
        commissionType: commissionTypeEnum.default("percentage"),
        cookieDuration: z.number().min(0).default(30),
        affiliateLink: z.string().optional(),
        monthlyEarnings: z.number().min(0).default(0),
        pendingPayout: z.number().min(0).default(0),
        instantPayout: z.boolean().default(false),
        active: z.boolean().default(true),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.insert(affiliatePrograms).values({
        userId: ctx.user.id,
        name: input.name,
        category: input.category ?? null,
        platform: input.platform ?? null,
        commissionRate: String(input.commissionRate),
        commissionType: input.commissionType,
        cookieDuration: input.cookieDuration,
        affiliateLink: input.affiliateLink || null,
        monthlyEarnings: String(input.monthlyEarnings),
        pendingPayout: String(input.pendingPayout),
        instantPayout: input.instantPayout,
        active: input.active,
        notes: input.notes ?? null,
      });

      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        category: z.string().optional(),
        platform: z.string().optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        commissionType: commissionTypeEnum.optional(),
        cookieDuration: z.number().min(0).optional(),
        affiliateLink: z.string().optional(),
        monthlyEarnings: z.number().min(0).optional(),
        pendingPayout: z.number().min(0).optional(),
        instantPayout: z.boolean().optional(),
        active: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { id, ...rest } = input;
      const updateData: Record<string, unknown> = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.category !== undefined) updateData.category = rest.category;
      if (rest.platform !== undefined) updateData.platform = rest.platform;
      if (rest.commissionRate !== undefined) updateData.commissionRate = String(rest.commissionRate);
      if (rest.commissionType !== undefined) updateData.commissionType = rest.commissionType;
      if (rest.cookieDuration !== undefined) updateData.cookieDuration = rest.cookieDuration;
      if (rest.affiliateLink !== undefined) updateData.affiliateLink = rest.affiliateLink || null;
      if (rest.monthlyEarnings !== undefined) updateData.monthlyEarnings = String(rest.monthlyEarnings);
      if (rest.pendingPayout !== undefined) updateData.pendingPayout = String(rest.pendingPayout);
      if (rest.instantPayout !== undefined) updateData.instantPayout = rest.instantPayout;
      if (rest.active !== undefined) updateData.active = rest.active;
      if (rest.notes !== undefined) updateData.notes = rest.notes;

      await db
        .update(affiliatePrograms)
        .set(updateData)
        .where(and(eq(affiliatePrograms.id, id), eq(affiliatePrograms.userId, ctx.user.id)));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .delete(affiliatePrograms)
        .where(and(eq(affiliatePrograms.id, input.id), eq(affiliatePrograms.userId, ctx.user.id)));

      return { success: true };
    }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalMonthly: 0, totalPending: 0, activeCount: 0, instantPayoutCount: 0 };

    const programs = await db
      .select()
      .from(affiliatePrograms)
      .where(eq(affiliatePrograms.userId, ctx.user.id));

    const active = programs.filter((p) => p.active);
    const totalMonthly = active.reduce((s, p) => s + parseFloat(String(p.monthlyEarnings)), 0);
    const totalPending = active.reduce((s, p) => s + parseFloat(String(p.pendingPayout)), 0);
    const instantPayoutCount = active.filter((p) => p.instantPayout).length;

    return {
      totalMonthly,
      totalPending,
      activeCount: active.length,
      totalCount: programs.length,
      instantPayoutCount,
    };
  }),
});
