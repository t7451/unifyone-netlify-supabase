import { z } from "zod";
import { isBehaviorEventType } from "@shared/behaviorEvents";
import { publicRateLimitedProcedure, router } from "../../_core/trpc";
import { publicFormLimiter } from "../../_core/rateLimiter";
import { ingestEvents } from "./tracking.service";

/**
 * First-party behavioral tracking ingest.
 *
 * The storefront client batches consent-gated behavioral events (product views,
 * searches, cart/checkout actions, purchases) and posts them here. Events are
 * written to `analytics_events` and surfaced as customer-behavior insights on
 * the Analytics dashboard.
 *
 * Design notes:
 * - Public + rate-limited: anonymous (pre-login) visitors must be trackable, so
 *   this cannot require auth. Abuse is bounded by the per-IP form limiter.
 * - Tenant resolution prefers the authenticated user's tenant; only anonymous
 *   callers may supply `tenantId` in the payload (storefront tenant context).
 * - Best-effort: ingest never throws to the client — a tracking failure must
 *   never break the page the customer is on.
 */

const eventSchema = z.object({
  type: z.string().refine(isBehaviorEventType, "Unknown event type"),
  productId: z.number().int().positive().optional(),
  orderId: z.number().int().positive().optional(),
  value: z.number().nonnegative().max(1_000_000).optional(),
  path: z.string().max(2048).optional(),
  query: z.string().max(512).optional(),
  resultCount: z.number().int().nonnegative().optional(),
  // Destination URL for outbound_click events (where the visitor goes next).
  url: z.string().url().max(2048).optional(),
  props: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export const trackingRouter = router({
  ingest: publicRateLimitedProcedure(publicFormLimiter, "tracking:ingest")
    .input(
      z.object({
        tenantId: z.number().int().positive().optional(),
        anonymousId: z.string().max(64).optional(),
        sessionId: z.string().max(64).optional(),
        events: z.array(eventSchema).min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) =>
      ingestEvents({ user: ctx.user, req: ctx.req }, input)
    ),
});
