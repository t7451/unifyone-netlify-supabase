import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { metaPixelEvents } from "../../drizzle/schema";
import { sendCAPIEvent, capi, type CAPIUserData } from "../meta/capi";

// ─── Router ───────────────────────────────────────────────────────────────────

export const metaRouter = router({
  /**
   * Generic CAPI relay — receives event data from client Pixel hook
   * and forwards server-side for deduplication.
   */
  relayEvent: publicProcedure
    .input(
      z.object({
        eventName: z.string().min(1).max(100),
        eventId: z.string().min(1).max(100),
        eventSourceUrl: z.string().url(),
        userData: z
          .object({
            email: z.string().optional(),
            externalId: z.string().optional(),
            fbp: z.string().optional(),
            fbc: z.string().optional(),
          })
          .optional(),
        customData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Enrich with server-side signals
      const userData: CAPIUserData = {
        ...input.userData,
        clientIp:
          (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
          (ctx.req.headers["x-real-ip"] as string) ??
          undefined,
        userAgent: ctx.req.headers["user-agent"] ?? undefined,
      };

      let status: "sent" | "failed" | "skipped" = "sent";
      let responseCode: number | undefined;

      try {
        const result = await sendCAPIEvent({
          eventName: input.eventName,
          eventId: input.eventId,
          eventSourceUrl: input.eventSourceUrl,
          userData,
          customData: input.customData,
        });

        if (result.error) {
          status = "failed";
          responseCode = result.error.code;
        } else {
          responseCode = 200;
        }
      } catch {
        status = "failed";
      }

      // Log the event
      if (db) {
        await db.insert(metaPixelEvents).values({
          userId: (ctx.user as { id: number } | null)?.id ?? null,
          eventName: input.eventName,
          eventId: input.eventId,
          eventSourceUrl: input.eventSourceUrl,
          customData: input.customData ?? null,
          status,
          responseCode: responseCode ?? null,
        });
      }

      return { success: status === "sent", status };
    }),

  /**
   * Fire RewardsKeyEarned CAPI event after a successful reward claim.
   * Called server-side from the rewards.claimOpportunity procedure result.
   */
  fireRewardsKeyEarned: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        credits: z.number(),
        source: z.string(),
        eventSourceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const url = input.eventSourceUrl ?? `${process.env.PUBLIC_APP_URL || process.env.APP_URL || process.env.URL || "https://1commerce.online"}/rewards`;

      const userData: CAPIUserData = {
        externalId: String(ctx.user.id),
        email: ctx.user.email ?? undefined,
      };

      let status: "sent" | "failed" | "skipped" = "sent";

      try {
        const result = await capi.rewardsKeyEarned(
          input.eventId,
          userData,
          url,
          input.credits,
          input.source
        );

        if (result.error) status = "failed";

        // Also fire Purchase for high-value claims (≥ 500 credits)
        if (input.credits >= 500) {
          await capi.purchase(
            `${input.eventId}-purchase`,
            userData,
            url,
            parseFloat((input.credits * 0.01).toFixed(2))
          );
        }
      } catch {
        status = "failed";
      }

      if (db) {
        await db.insert(metaPixelEvents).values({
          userId: ctx.user.id,
          eventName: "RewardsKeyEarned",
          eventId: input.eventId,
          eventSourceUrl: url,
          customData: { credits: input.credits, source: input.source },
          status,
          responseCode: status === "sent" ? 200 : null,
        });
      }

      return { success: status === "sent" };
    }),

  /** Admin: view recent CAPI event log */
  getEventLog: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(metaPixelEvents)
        .orderBy(desc(metaPixelEvents.sentAt))
        .limit(input.limit);
    }),

  /** Admin: get CAPI event stats */
  getEventStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return { total: 0, sent: 0, failed: 0, skipped: 0 };

    const all = await db.select().from(metaPixelEvents);
    const sent = all.filter((e) => e.status === "sent").length;
    const failed = all.filter((e) => e.status === "failed").length;
    const skipped = all.filter((e) => e.status === "skipped").length;

    return { total: all.length, sent, failed, skipped };
  }),
});
