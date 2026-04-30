import { z } from "zod";
import {
  publicProcedure,
  publicRateLimitedProcedure,
  adminProcedure,
  router,
} from "../_core/trpc";
import { publicFormLimiter } from "../_core/rateLimiter";
import { getDb } from "../db";
import { sovereignWaitlist } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const sovereignRouter = router({
  // Public: join the waitlist — IP rate-limited to prevent waitlist spam.
  joinWaitlist: publicRateLimitedProcedure(publicFormLimiter, "waitlist:join")
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(255).optional(),
        company: z.string().max(255).optional(),
        currentStack: z.string().max(1000).optional(),
        monthlyRevenue: z
          .enum(["pre_revenue", "under_5k", "5k_25k", "25k_100k", "over_100k"])
          .optional(),
        biggestChallenge: z.string().max(2000).optional(),
        referralSource: z.string().max(100).optional(),
        utmSource: z.string().max(100).optional(),
        utmMedium: z.string().max(100).optional(),
        utmCampaign: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Check if already on waitlist
      const existing = await db
        .select({
          id: sovereignWaitlist.id,
          position: sovereignWaitlist.position,
        })
        .from(sovereignWaitlist)
        .where(eq(sovereignWaitlist.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        return {
          success: true,
          alreadyJoined: true,
          position: existing[0].position,
          message: "You're already on the waitlist!",
        };
      }

      // Get current count for position
      const [{ total }] = await db
        .select({ total: count() })
        .from(sovereignWaitlist);
      const position = (total || 0) + 1;

      await db.insert(sovereignWaitlist).values({
        ...input,
        position,
        status: "pending",
      });

      // Notify owner
      await notifyOwner({
        title: `🎯 New Sovereign Stack Waitlist Signup #${position}`,
        content: `**${input.name || input.email}** (${input.company || "No company"}) joined the Sovereign Stack waitlist.\n\nRevenue tier: ${input.monthlyRevenue || "not specified"}\nBiggest challenge: ${input.biggestChallenge || "not specified"}\nSource: ${input.utmSource || input.referralSource || "direct"}`,
      });

      return {
        success: true,
        alreadyJoined: false,
        position,
        message: `You're #${position} on the waitlist. We'll be in touch.`,
      };
    }),

  // Public: get waitlist count (for social proof)
  getCount: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const [{ total }] = await db
      .select({ total: count() })
      .from(sovereignWaitlist);
    return { count: total || 0 };
  }),

  // Admin: list all waitlist entries
  listWaitlist: adminProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "contacted", "qualified", "converted", "rejected"])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { entries: [], total: 0 };

      const query = db
        .select()
        .from(sovereignWaitlist)
        .orderBy(desc(sovereignWaitlist.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      const entries = await query;
      const [{ total }] = await db
        .select({ total: count() })
        .from(sovereignWaitlist);

      return { entries, total: total || 0 };
    }),

  // Admin: update waitlist entry status
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "pending",
          "contacted",
          "qualified",
          "converted",
          "rejected",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .update(sovereignWaitlist)
        .set({ status: input.status, notes: input.notes })
        .where(eq(sovereignWaitlist.id, input.id));

      return { success: true };
    }),
});
