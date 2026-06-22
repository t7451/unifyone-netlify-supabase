import { z } from "zod";
import { isBehaviorEventType } from "@shared/behaviorEvents";
import { publicRateLimitedProcedure, router } from "../_core/trpc";
import { publicFormLimiter } from "../_core/rateLimiter";
import { trackBehaviorEvents, type BehaviorEventInput } from "../db";
import { logger } from "../_core/logger";

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
    .mutation(async ({ ctx, input }) => {
      try {
        // Authenticated users are always attributed to their own tenant; only
        // anonymous visitors may pass a tenant context in the payload. An
        // authenticated user without a tenant must NOT fall back to the
        // client-supplied tenantId — that would let them target any tenant.
        const tenantId = ctx.user
          ? ctx.user.tenantId
          : (input.tenantId ?? null);
        if (!tenantId) return { ok: true, stored: 0 };

        const base = {
          ...(input.anonymousId ? { anonymousId: input.anonymousId } : {}),
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        };

        const events: BehaviorEventInput[] = input.events.map(e => ({
          eventType: e.type,
          userId: ctx.user?.id ?? null,
          orderId: e.orderId ?? null,
          productId: e.productId ?? null,
          value: e.value ?? null,
          properties: {
            // Caller-supplied props first so reserved fields below always win
            // and cannot be overwritten by a malicious/buggy client.
            ...(e.props ?? {}),
            ...base,
            ...(e.path ? { path: e.path } : {}),
            ...(e.query ? { query: e.query } : {}),
            ...(e.resultCount != null ? { resultCount: e.resultCount } : {}),
          },
        }));

        const stored = await trackBehaviorEvents(tenantId, events);
        return { ok: true, stored };
      } catch (err) {
        logger.error("[tracking.ingest] failed to record events", {
          error: err instanceof Error ? err.message : String(err),
        });
        return { ok: false, stored: 0 };
      }
    }),
});
