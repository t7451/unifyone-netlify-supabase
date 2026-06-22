import { z } from "zod";
import { isBehaviorEventType } from "@shared/behaviorEvents";
import { publicRateLimitedProcedure, router } from "../_core/trpc";
import { publicFormLimiter } from "../_core/rateLimiter";
import { trackBehaviorEvents, type BehaviorEventInput } from "../db";
import { extractGeo } from "../lib/geo";
import { resolveAnalyticsTenant } from "../lib/analyticsTenant";
import { logger } from "../_core/logger";

/** Host portion of a URL, or undefined if it can't be parsed. */
function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

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
    .mutation(async ({ ctx, input }) => {
      try {
        // Authenticated users are always attributed to their own tenant; only
        // anonymous visitors fall back to the client-supplied tenant or the
        // configured default (ANALYTICS_DEFAULT_TENANT_ID). An authenticated
        // user without a tenant must NOT borrow another tenant's id.
        const tenantId = resolveAnalyticsTenant({
          user: ctx.user,
          inputTenantId: input.tenantId,
        });
        if (!tenantId) return { ok: true, stored: 0 };

        // Coarse geo from the CDN edge (country/region/city) — derived
        // server-side so the client can't spoof it. Privacy-friendly: no IP,
        // no precise coordinates.
        const geo = extractGeo(ctx.req);

        const base = {
          ...(input.anonymousId ? { anonymousId: input.anonymousId } : {}),
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
          ...(geo.country ? { country: geo.country } : {}),
          ...(geo.region ? { region: geo.region } : {}),
          ...(geo.city ? { city: geo.city } : {}),
        };

        const events: BehaviorEventInput[] = input.events.map(e => {
          const destination = e.url ? hostOf(e.url) : undefined;
          return {
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
              ...(e.url ? { url: e.url } : {}),
              ...(destination ? { destination } : {}),
            },
          };
        });

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
