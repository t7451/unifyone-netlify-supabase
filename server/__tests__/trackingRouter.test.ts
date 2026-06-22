/**
 * tracking.ingest — first-party behavioral event ingest
 *
 * Verifies:
 *  - Authenticated callers are attributed to ctx.user.tenantId (never the
 *    client-supplied tenantId — that's anonymous-only).
 *  - Anonymous callers may supply tenantId; without one, ingest is a safe no-op.
 *  - Event fields + top-level anonymousId/sessionId are folded into properties.
 *  - Unknown event types are rejected by the input schema.
 *  - A DB failure is swallowed (best-effort) rather than thrown to the client.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "../_core/context";

const { trackBehaviorEventsMock } = vi.hoisted(() => ({
  trackBehaviorEventsMock: vi.fn(
    async (_tenantId: number, events: unknown[]) => events.length
  ),
}));

vi.mock("../db", () => ({
  trackBehaviorEvents: trackBehaviorEventsMock,
}));

vi.mock("../_core/rateLimiter", () => ({
  publicFormLimiter: {
    check: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
  },
}));

import { trackingRouter } from "../routers/tracking";

type UserLike = { id: number; tenantId: number | null };

function makeCtx(
  user: UserLike | null = null,
  headers: Record<string, string> = {}
): TrpcContext {
  return {
    req: { ip: "127.0.0.1", headers } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: user as TrpcContext["user"],
  };
}

beforeEach(() => {
  trackBehaviorEventsMock.mockClear();
  trackBehaviorEventsMock.mockImplementation(
    async (_t, events) => events.length
  );
});

describe("tracking.ingest", () => {
  it("attributes authenticated callers to ctx.user.tenantId, ignoring input.tenantId", async () => {
    const caller = trackingRouter.createCaller(
      makeCtx({ id: 7, tenantId: 100 })
    );

    const res = await caller.ingest({
      tenantId: 999, // anonymous-only field; must be ignored for authed users
      anonymousId: "anon-1",
      sessionId: "sess-1",
      events: [{ type: "product_view", productId: 42 }],
    });

    expect(res).toEqual({ ok: true, stored: 1 });
    expect(trackBehaviorEventsMock).toHaveBeenCalledTimes(1);
    const [tenantId, events] = trackBehaviorEventsMock.mock.calls[0] as [
      number,
      Array<Record<string, unknown>>,
    ];
    expect(tenantId).toBe(100);
    expect(events[0]).toMatchObject({
      eventType: "product_view",
      productId: 42,
      userId: 7,
    });
    expect(events[0].properties).toMatchObject({
      anonymousId: "anon-1",
      sessionId: "sess-1",
    });
  });

  it("uses input.tenantId for anonymous callers", async () => {
    const caller = trackingRouter.createCaller(makeCtx(null));

    const res = await caller.ingest({
      tenantId: 55,
      events: [{ type: "search", query: "blue widgets", resultCount: 0 }],
    });

    expect(res.ok).toBe(true);
    const [tenantId, events] = trackBehaviorEventsMock.mock.calls[0] as [
      number,
      Array<Record<string, unknown>>,
    ];
    expect(tenantId).toBe(55);
    expect(events[0]).toMatchObject({ eventType: "search", userId: null });
    expect(events[0].properties).toMatchObject({
      query: "blue widgets",
      resultCount: 0,
    });
  });

  it("does not let an authenticated null-tenant user borrow input.tenantId", async () => {
    // An authed user whose JWT carries no tenant must never be attributed to a
    // client-supplied tenantId — that would defeat tenant isolation.
    const caller = trackingRouter.createCaller(
      makeCtx({ id: 9, tenantId: null })
    );

    const res = await caller.ingest({
      tenantId: 777,
      events: [{ type: "product_view", productId: 1 }],
    });

    expect(res).toEqual({ ok: true, stored: 0 });
    expect(trackBehaviorEventsMock).not.toHaveBeenCalled();
  });

  it("is a no-op when no tenant can be resolved", async () => {
    const caller = trackingRouter.createCaller(makeCtx(null));

    const res = await caller.ingest({
      events: [{ type: "page_view", path: "/" }],
    });

    expect(res).toEqual({ ok: true, stored: 0 });
    expect(trackBehaviorEventsMock).not.toHaveBeenCalled();
  });

  it("rejects unknown event types", async () => {
    const caller = trackingRouter.createCaller(makeCtx({ id: 1, tenantId: 1 }));

    await expect(
      caller.ingest({
        // @ts-expect-error — exercise the schema rejection path
        events: [{ type: "definitely_not_an_event" }],
      })
    ).rejects.toThrow();
    expect(trackBehaviorEventsMock).not.toHaveBeenCalled();
  });

  it("swallows DB failures and reports ok:false instead of throwing", async () => {
    trackBehaviorEventsMock.mockRejectedValueOnce(new Error("db down"));
    const caller = trackingRouter.createCaller(makeCtx({ id: 1, tenantId: 1 }));

    const res = await caller.ingest({
      events: [{ type: "add_to_cart", productId: 3, value: 19.99 }],
    });

    expect(res).toEqual({ ok: false, stored: 0 });
  });

  it("derives the destination domain from an outbound_click url", async () => {
    const caller = trackingRouter.createCaller(makeCtx({ id: 1, tenantId: 5 }));

    await caller.ingest({
      anonymousId: "anon-9",
      events: [
        { type: "outbound_click", url: "https://www.partner-shop.com/item/42" },
      ],
    });

    const [, events] = trackBehaviorEventsMock.mock.calls[0] as [
      number,
      Array<Record<string, unknown>>,
    ];
    expect(events[0].eventType).toBe("outbound_click");
    expect(events[0].properties).toMatchObject({
      url: "https://www.partner-shop.com/item/42",
      destination: "partner-shop.com",
    });
  });

  it("accepts product_engagement with dwell/scroll in props", async () => {
    const caller = trackingRouter.createCaller(makeCtx({ id: 1, tenantId: 5 }));

    const res = await caller.ingest({
      anonymousId: "anon-11",
      events: [
        {
          type: "product_engagement",
          productId: 7,
          props: { dwellMs: 8200, scrollPct: 75 },
        },
      ],
    });

    expect(res.ok).toBe(true);
    const [, events] = trackBehaviorEventsMock.mock.calls[0] as [
      number,
      Array<Record<string, unknown>>,
    ];
    expect(events[0]).toMatchObject({
      eventType: "product_engagement",
      productId: 7,
    });
    expect(events[0].properties).toMatchObject({
      dwellMs: 8200,
      scrollPct: 75,
    });
  });

  it("enriches events with coarse geo from the edge header (server-side)", async () => {
    const nfGeo = Buffer.from(
      JSON.stringify({
        country: { code: "US" },
        subdivision: { code: "CA" },
        city: "San Francisco",
      })
    ).toString("base64");
    const caller = trackingRouter.createCaller(
      makeCtx({ id: 1, tenantId: 5 }, { "x-nf-geo": nfGeo })
    );

    await caller.ingest({
      anonymousId: "anon-10",
      // A client trying to spoof geo via props must be overridden server-side.
      events: [{ type: "page_view", path: "/", props: { country: "ZZ" } }],
    });

    const [, events] = trackBehaviorEventsMock.mock.calls[0] as [
      number,
      Array<Record<string, unknown>>,
    ];
    expect(events[0].properties).toMatchObject({
      country: "US",
      region: "CA",
      city: "San Francisco",
    });
  });
});
