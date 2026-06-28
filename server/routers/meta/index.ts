import { z } from "zod";

import {
  adminProcedure,
  protectedProcedure,
  publicRateLimitedProcedure,
  router,
} from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import type { CAPIUserData } from "../../meta/capi";
import { getAppUrl } from "../../_core/env";
import {
  buildUserDataFromHeaders,
  fireCompleteRegistration,
  fireCustomEvent,
  fireLead,
  firePurchase,
  fireRewardsKeyEarned,
  getEventLog,
  getEventStats,
  listEvents,
  relayEvent,
} from "./meta.service";

export const metaRouter = router({
  /**
   * Generic CAPI relay — receives event data from client Pixel hook
   * and forwards server-side for deduplication.
   */
  relayEvent: publicRateLimitedProcedure(publicFormLimiter, "meta:relay")
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
      const userData = buildUserDataFromHeaders(
        ctx.req.headers,
        input.userData
      );

      return relayEvent({
        userId: (ctx.user as { id: number } | null)?.id ?? null,
        eventName: input.eventName,
        eventId: input.eventId,
        eventSourceUrl: input.eventSourceUrl,
        userData,
        customData: input.customData,
      });
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
      const url = input.eventSourceUrl ?? `${getAppUrl()}/rewards`;
      const userData: CAPIUserData = {
        externalId: String(ctx.user.id),
        email: ctx.user.email ?? undefined,
      };

      return fireRewardsKeyEarned({
        userId: ctx.user.id,
        userData,
        eventId: input.eventId,
        url,
        credits: input.credits,
        source: input.source,
      });
    }),

  /**
   * Fire a Lead CAPI event — typically called after a lead form submission.
   */
  fireLead: publicRateLimitedProcedure(publicFormLimiter, "meta:lead")
    .input(
      z.object({
        eventId: z.string().min(1),
        email: z.string().email().optional(),
        contentName: z.string().optional(),
        eventSourceUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const url = input.eventSourceUrl ?? getAppUrl();
      const userData = buildUserDataFromHeaders(ctx.req.headers, {
        email: input.email,
      });

      return fireLead({
        userId: (ctx.user as { id: number } | null)?.id ?? null,
        userData,
        eventId: input.eventId,
        url,
        contentName: input.contentName,
      });
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
      const url = input.eventSourceUrl ?? `${getAppUrl()}/checkout`;
      const userData: CAPIUserData = {
        externalId: String(ctx.user.id),
        email: ctx.user.email ?? undefined,
      };

      return firePurchase({
        userId: ctx.user.id,
        userData,
        eventId: input.eventId,
        url,
        value: input.value,
        currency: input.currency,
      });
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
      const url = input.eventSourceUrl ?? `${getAppUrl()}/rewards`;
      const userData: CAPIUserData = {
        externalId: String(ctx.user.id),
        email: ctx.user.email ?? undefined,
      };

      return fireCompleteRegistration({
        userId: ctx.user.id,
        userData,
        eventId: input.eventId,
        url,
      });
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
      const url = input.eventSourceUrl ?? getAppUrl();
      const userData: CAPIUserData = {
        externalId: String(ctx.user.id),
        email: ctx.user.email ?? undefined,
      };

      return fireCustomEvent({
        userId: ctx.user.id,
        userData,
        eventName: input.eventName,
        eventId: input.eventId,
        url,
        customData: input.customData,
      });
    }),

  /**
   * List recent CAPI events for the current user (non-admin) or all events (admin).
   */
  listEvents: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) =>
      listEvents({
        isAdmin: ctx.user.role === "admin",
        userId: ctx.user.id,
        limit: input.limit,
      })
    ),

  /** Admin: view recent CAPI event log */
  getEventLog: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx: _ctx, input }) => getEventLog(input.limit)),

  /** Admin: get CAPI event stats */
  getEventStats: adminProcedure.query(async ({ ctx: _ctx }) => getEventStats()),
});
