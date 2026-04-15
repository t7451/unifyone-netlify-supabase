import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { revenueStreams } from "../../drizzle/schema";

const streamTypeEnum = z.enum(["affiliate", "saas", "consulting", "physical", "digital", "passive"]);
const streamStatusEnum = z.enum(["active", "pending", "inactive", "broken"]);

export const revenueStreamsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(revenueStreams)
      .where(eq(revenueStreams.userId, ctx.user.id))
      .orderBy(desc(revenueStreams.monthlyValue));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        type: streamTypeEnum,
        platform: z.string().max(100).optional(),
        monthlyValue: z.number().min(0).default(0),
        commissionRate: z.number().min(0).max(100).optional(),
        status: streamStatusEnum.default("active"),
        affiliateLink: z.string().url().optional().or(z.literal("")),
        cookieDuration: z.number().min(0).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.insert(revenueStreams).values({
        userId: ctx.user.id,
        name: input.name,
        type: input.type,
        platform: input.platform ?? null,
        monthlyValue: String(input.monthlyValue),
        commissionRate: input.commissionRate != null ? String(input.commissionRate) : null,
        status: input.status,
        affiliateLink: input.affiliateLink || null,
        cookieDuration: input.cookieDuration ?? null,
        notes: input.notes ?? null,
      });

      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        type: streamTypeEnum.optional(),
        platform: z.string().max(100).optional(),
        monthlyValue: z.number().min(0).optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        status: streamStatusEnum.optional(),
        affiliateLink: z.string().optional(),
        cookieDuration: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { id, ...rest } = input;
      const updateData: Record<string, unknown> = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.type !== undefined) updateData.type = rest.type;
      if (rest.platform !== undefined) updateData.platform = rest.platform;
      if (rest.monthlyValue !== undefined) updateData.monthlyValue = String(rest.monthlyValue);
      if (rest.commissionRate !== undefined) updateData.commissionRate = String(rest.commissionRate);
      if (rest.status !== undefined) updateData.status = rest.status;
      if (rest.affiliateLink !== undefined) updateData.affiliateLink = rest.affiliateLink || null;
      if (rest.cookieDuration !== undefined) updateData.cookieDuration = rest.cookieDuration;
      if (rest.notes !== undefined) updateData.notes = rest.notes;

      await db
        .update(revenueStreams)
        .set(updateData)
        .where(and(eq(revenueStreams.id, id), eq(revenueStreams.userId, ctx.user.id)));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .delete(revenueStreams)
        .where(and(eq(revenueStreams.id, input.id), eq(revenueStreams.userId, ctx.user.id)));

      return { success: true };
    }),

  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalMonthly: 0, activeCount: 0, brokenCount: 0, byType: {} };

    const streams = await db
      .select()
      .from(revenueStreams)
      .where(eq(revenueStreams.userId, ctx.user.id));

    const active = streams.filter((s) => s.status === "active");
    const broken = streams.filter((s) => s.status === "broken");
    const totalMonthly = active.reduce((sum, s) => sum + parseFloat(String(s.monthlyValue)), 0);

    const byType: Record<string, number> = {};
    for (const s of active) {
      byType[s.type] = (byType[s.type] ?? 0) + parseFloat(String(s.monthlyValue));
    }

    return {
      totalMonthly,
      activeCount: active.length,
      brokenCount: broken.length,
      totalCount: streams.length,
      byType,
    };
  }),
});
