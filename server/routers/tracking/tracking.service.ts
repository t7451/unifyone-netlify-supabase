import type { TrpcContext } from "../../_core/context";
import { extractGeo } from "../../lib/geo";
import { resolveAnalyticsTenant } from "../../lib/analyticsTenant";
import { logger } from "../../_core/logger";
import { storeBehaviorEvents, type BehaviorEventInput } from "./tracking.repo";

/** Host portion of a URL, or undefined if it can't be parsed. */
function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export type TrackingEventInput = {
  type: string;
  productId?: number;
  orderId?: number;
  value?: number;
  path?: string;
  query?: string;
  resultCount?: number;
  url?: string;
  props?: Record<string, string | number | boolean>;
};

export type IngestInput = {
  tenantId?: number;
  anonymousId?: string;
  sessionId?: string;
  events: TrackingEventInput[];
};

export type IngestContext = Pick<TrpcContext, "user" | "req">;

/**
 * Ingest a batch of consent-gated behavioral events.
 *
 * Best-effort: never throws to the client — a tracking failure must never break
 * the page the customer is on. Behaviour is preserved verbatim from the
 * original router (tenant resolution, server-side geo, reserved-field ordering).
 */
export async function ingestEvents(
  ctx: IngestContext,
  input: IngestInput
): Promise<{ ok: boolean; stored: number }> {
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

    const stored = await storeBehaviorEvents(tenantId, events);
    return { ok: true, stored };
  } catch (err) {
    logger.error("[tracking.ingest] failed to record events", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, stored: 0 };
  }
}
