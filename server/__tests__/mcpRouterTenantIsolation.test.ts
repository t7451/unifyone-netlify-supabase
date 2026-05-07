/**
 * Tenant Isolation — MCP-proxy routers
 *
 * Regression tests for `dealflow`, `pixelforge`, `terpforge`, and
 * `knowledgeGraph`. These routers proxy to an external Cloudflare MCP
 * worker. Before the fix, they accepted `tenantId` from client input and
 * forwarded it verbatim, letting an authenticated user query/mutate any
 * tenant's data. The fix: the routers must always pass
 * `{ authoritativeTenantId: ctx.user.tenantId }` to mcpCallTool, and
 * `tenantId` must not be in the input schemas at all.
 *
 * Strategy:
 *  - Mock `mcpCallTool` to capture every invocation.
 *  - Build a tRPC caller with a context whose user.tenantId = 100.
 *  - Call each procedure (where applicable, with a `tenantId` field in the
 *    request to verify Zod rejects it).
 *  - Assert the captured 3rd arg has `authoritativeTenantId: 100`.
 *  - Assert the captured args do NOT contain a client-supplied tenant_id.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "../_core/context";

// Capture all calls to mcpCallTool. The mock returns an empty object so
// the procedure resolves without surprises. Hoisted so vi.mock can see it.
const { mcpCallToolMock } = vi.hoisted(() => ({
  mcpCallToolMock: vi.fn(async () => ({}) as unknown),
}));

vi.mock("../lib/mcpClient", () => ({
  mcpCallTool: mcpCallToolMock,
}));

// Rate limiter is lazy-touched by terpforge/knowledgeGraph procedures.
// Provide a permissive stub so the procedure body actually executes.
vi.mock("../_core/rateLimiter", () => ({
  mcpRateLimiter: {
    check: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
  },
  llmRateLimiter: {
    check: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
  },
  publicFormLimiter: {
    check: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
  },
}));

import { dealflowRouter } from "../routers/dealflow";
import { pixelforgeRouter } from "../routers/pixelforge";
import { terpforgeRouter } from "../routers/terpforge";
import { knowledgeGraphRouter } from "../routers/knowledgeGraph";

type UserLike = {
  id: number;
  tenantId: number | null;
  role: string;
  email: string;
  openId: string;
  name: string | null;
  creditBalance: number;
  emailVerified: boolean | null;
};

function makeUser(overrides: Partial<UserLike> = {}): UserLike {
  return {
    id: 1,
    tenantId: 100,
    role: "user",
    email: "alice@example.com",
    openId: "open-1",
    name: "Alice",
    creditBalance: 0,
    emailVerified: true,
    ...overrides,
  };
}

function makeCtx(user: UserLike | null = null): TrpcContext {
  return {
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: user as TrpcContext["user"],
  };
}

beforeEach(() => {
  mcpCallToolMock.mockClear();
  mcpCallToolMock.mockResolvedValue({});
});

// ──────────────────────────────────────────────────────────────────────────────
// Helper assertions
// ──────────────────────────────────────────────────────────────────────────────

function lastCall() {
  expect(mcpCallToolMock).toHaveBeenCalledTimes(1);
  const [toolName, args, options] = mcpCallToolMock.mock.calls[0] as [
    string,
    Record<string, unknown>,
    { authoritativeTenantId?: number } | undefined,
  ];
  return { toolName, args, options };
}

function assertScopedToTenant(expectedTenantId: number) {
  const { args, options } = lastCall();
  expect(options).toBeDefined();
  expect(options?.authoritativeTenantId).toBe(expectedTenantId);
  // The router must not pass `tenant_id` in args — that comes from the
  // authoritative option, not from client-controlled fields.
  expect(args).not.toHaveProperty("tenant_id");
  expect(args).not.toHaveProperty("tenantId");
}

// ──────────────────────────────────────────────────────────────────────────────
// dealflow
// ──────────────────────────────────────────────────────────────────────────────

describe("dealflow router — tenant isolation", () => {
  it("listDeals: passes ctx.user.tenantId, ignores client-supplied tenantId", async () => {
    const caller = dealflowRouter.createCaller(makeCtx(makeUser()));

    // Cast lets us pass `tenantId` so we exercise the "Zod strips it" path.
    await caller.listDeals({
      // @ts-expect-error — this property has been removed from the schema
      tenantId: 999,
      limit: 5,
    } as unknown as Parameters<typeof caller.listDeals>[0]);

    assertScopedToTenant(100);
  });

  it("searchDeals: scopes to ctx tenant", async () => {
    const caller = dealflowRouter.createCaller(makeCtx(makeUser()));
    await caller.searchDeals({ query: "shopify" });
    assertScopedToTenant(100);
  });

  it("getRecommendations: scopes to ctx tenant", async () => {
    const caller = dealflowRouter.createCaller(makeCtx(makeUser()));
    await caller.getRecommendations({ userId: "user-7" });
    assertScopedToTenant(100);
  });

  it("listDeals: rejects when user has no tenantId", async () => {
    const caller = dealflowRouter.createCaller(
      makeCtx(makeUser({ tenantId: null }))
    );
    await expect(caller.listDeals({})).rejects.toThrow("No active tenant");
    expect(mcpCallToolMock).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// pixelforge
// ──────────────────────────────────────────────────────────────────────────────

describe("pixelforge router — tenant isolation", () => {
  it("listAssets: scopes to ctx tenant", async () => {
    const caller = pixelforgeRouter.createCaller(makeCtx(makeUser()));
    await caller.listAssets({ limit: 50 });
    assertScopedToTenant(100);
  });

  it("createAsset: scopes to ctx tenant, ignores client tenantId", async () => {
    const caller = pixelforgeRouter.createCaller(makeCtx(makeUser()));
    await caller.createAsset({
      // @ts-expect-error — this property has been removed from the schema
      tenantId: 999,
      name: "hero-sprite",
      width: 32,
      height: 32,
      assetType: "sprite",
    } as unknown as Parameters<typeof caller.createAsset>[0]);
    assertScopedToTenant(100);
  });

  it("createAsset: rejects when user has no tenantId", async () => {
    const caller = pixelforgeRouter.createCaller(
      makeCtx(makeUser({ tenantId: null }))
    );
    await expect(
      caller.createAsset({
        name: "x",
        width: 8,
        height: 8,
        assetType: "sprite",
      })
    ).rejects.toThrow("No active tenant");
    expect(mcpCallToolMock).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// terpforge
// ──────────────────────────────────────────────────────────────────────────────

describe("terpforge router — tenant isolation", () => {
  it("listCompounds: scopes to ctx tenant", async () => {
    const caller = terpforgeRouter.createCaller(makeCtx(makeUser()));
    await caller.listCompounds({});
    assertScopedToTenant(100);
  });

  it("getCompound: scopes to ctx tenant", async () => {
    const caller = terpforgeRouter.createCaller(makeCtx(makeUser()));
    await caller.getCompound({ slug: "myrcene" });
    assertScopedToTenant(100);
  });

  it("listCompounds: rejects when user has no tenantId", async () => {
    const caller = terpforgeRouter.createCaller(
      makeCtx(makeUser({ tenantId: null }))
    );
    await expect(caller.listCompounds({})).rejects.toThrow("No active tenant");
    expect(mcpCallToolMock).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// knowledgeGraph
// ──────────────────────────────────────────────────────────────────────────────

describe("knowledgeGraph router — tenant isolation", () => {
  it("queryGraph: scopes to ctx tenant", async () => {
    const caller = knowledgeGraphRouter.createCaller(makeCtx(makeUser()));
    await caller.queryGraph({ nodeType: "project" });
    assertScopedToTenant(100);
  });

  it("getStats: scopes to ctx tenant", async () => {
    const caller = knowledgeGraphRouter.createCaller(makeCtx(makeUser()));
    await caller.getStats();
    assertScopedToTenant(100);
  });

  it("queryGraph: rejects when user has no tenantId", async () => {
    const caller = knowledgeGraphRouter.createCaller(
      makeCtx(makeUser({ tenantId: null }))
    );
    await expect(caller.queryGraph({})).rejects.toThrow("No active tenant");
    expect(mcpCallToolMock).not.toHaveBeenCalled();
  });
});
