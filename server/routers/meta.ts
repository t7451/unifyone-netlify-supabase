import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { metaPixelEvents } from "../../drizzle/schema";
import { sendCAPIEvent, capi, type CAPIUserData } from "../meta/capi";
import { getAppUrl } from "../_core/env";

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
      const url = input.eventSourceUrl ?? `${getAppUrl()}/rewards`;

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

  /**
   * Fire a Lead CAPI event — typically called after a lead form submission.
   */
  fireLead: publicProcedure
    .input(
      z.object({
        eventId: z.string().min(1),
        email: z.string().email().optional(),
        contentName: z.string().optional(),
        eventSourceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const url = input.eventSourceUrl ?? getAppUrl();

      const userData: CAPIUserData = {
        email: input.email,
        clientIp:
          (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
          (ctx.req.headers["x-real-ip"] as string) ??
          undefined,
        userAgent: ctx.req.headers["user-agent"] ?? undefined,
      };

      let status: "sent" | "failed" | "skipped" = "sent";

      try {
        const result = await capi.lead(input.eventId, userData, url, input.contentName);
        if (result.error) status = "failed";
      } catch {
        status = "failed";
      }

      if (db) {
        await db.insert(metaPixelEvents).values({
          userId: (ctx.user as { id: number } | null)?.id ?? null,
          eventName: "Lead",
          eventId: input.eventId,
          eventSourceUrl: url,
          customData: input.contentName ? { content_name: input.contentName } : null,
          status,
          responseCode: status === "sent" ? 200 : null,
        });
      }

      return { success: status === "sent", status };
    }),

  /**
   * Fire a Purchase CAPI event — typically called after a successful payment.
   */
  firePurchase: protectedProcedure
    .input(
      z.object({
        eventId: z.string().min(1),
        value: z.number().min(0),
        currency: z.string().default("USD"),
        eventSourceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const url = input.eventSourceUrl ?? `${getAppUrl()}/checkout`;

      const userData: CAPIUserData = {
        externalId: String(ctx.user.id),
        email: ctx.user.email ?? undefined,
      };

      let status: "sent" | "failed" | "skipped" = "sent";

      try {
        const result = await capi.purchase(input.eventId, userData, url, input.value, input.currency);
        if (result.error) status = "failed";
      } catch {
        status = "failed";
      }

      if (db) {
        await db.insert(metaPixelEvents).values({
          userId: ctx.user.id,
          eventName: "Purchase",
          eventId: input.eventId,
          eventSourceUrl: url,
          customData: { value: input.value, currency: input.currency },
          status,
          responseCode: status === "sent" ? 200 : null,
        });
      }

      return { success: status === "sent", status };
    }),

  /**
   * Fire a CompleteRegistration CAPI event — typically called on signup or reward key claim.
   */
  fireCompleteRegistration: protectedProcedure
    .input(
      z.object({
        eventId: z.string().min(1),
        eventSourceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const url = input.eventSourceUrl ?? `${getAppUrl()}/rewards`;

      const userData: CAPIUserData = {
        externalId: String(ctx.user.id),
        email: ctx.user.email ?? undefined,
      };

      let status: "sent" | "failed" | "skipped" = "sent";

      try {
        const result = await capi.completeRegistration(input.eventId, userData, url);
        if (result.error) status = "failed";
      } catch {
        status = "failed";
      }

      if (db) {
        await db.insert(metaPixelEvents).values({
          userId: ctx.user.id,
          eventName: "CompleteRegistration",
          eventId: input.eventId,
          eventSourceUrl: url,
          customData: { status: "registered" },
          status,
          responseCode: status === "sent" ? 200 : null,
        });
      }

      return { success: status === "sent", status };
    }),

  /**
   * Fire a custom CAPI event — for non-standard event names (e.g. GigShiftCompleted, FriendChallengeAccepted).
   */
  fireCustomEvent: protectedProcedure
    .input(
      z.object({
        eventName: z.string().min(1).max(100),
        eventId: z.string().min(1),
        customData: z.record(z.string(), z.unknown()).optional(),
        eventSourceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const url = input.eventSourceUrl ?? getAppUrl();

      const userData: CAPIUserData = {
        externalId: String(ctx.user.id),
        email: ctx.user.email ?? undefined,
      };

      let status: "sent" | "failed" | "skipped" = "sent";

      try {
        const result = await capi.custom(input.eventName, input.eventId, userData, url, input.customData);
        if (result.error) status = "failed";
      } catch {
        status = "failed";
      }

      if (db) {
        await db.insert(metaPixelEvents).values({
          userId: ctx.user.id,
          eventName: input.eventName,
          eventId: input.eventId,
          eventSourceUrl: url,
          customData: input.customData ?? null,
          status,
          responseCode: status === "sent" ? 200 : null,
        });
      }

      return { success: status === "sent", status };
    }),

  /**
   * List recent CAPI events for the current user (non-admin) or all events (admin).
   */
  listEvents: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      if (ctx.user.role === "admin") {
        return db
          .select()
          .from(metaPixelEvents)
          .orderBy(desc(metaPixelEvents.sentAt))
          .limit(input.limit);
      }

      return db
        .select()
        .from(metaPixelEvents)
        .where(eq(metaPixelEvents.userId, ctx.user.id))
        .orderBy(desc(metaPixelEvents.sentAt))
        .limit(input.limit);
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
