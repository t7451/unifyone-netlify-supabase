/**
 * Tenant Isolation Tests
 *
 * Verifies that cross-tenant access is blocked at the router layer.
 * Tests call router procedures directly with crafted contexts — no HTTP layer.
 *
 * Strategy:
 *  - Inject a mock DB (via vi.mock) that returns controlled data
 *  - Call procedure functions with a user context from tenant A
 *  - Confirm that when the DB returns data owned by tenant B the handler
 *    throws "Forbidden" (or the tRPC equivalent)
 *  - Confirm that an admin can bypass tenant isolation where intended
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "../_core/context";

// ── Shared mutable DB state ───────────────────────────────────────────────────

const _db = {
  selectRows: [] as unknown[],
  insertedRows: [] as unknown[],
};

/**
 * A "queryChain" is an object that:
 *  - resolves (via .then) to _db.selectRows when awaited
 *  - exposes chainable methods (.where, .limit, .orderBy) that also return
 *    queryChains, so the caller can chain arbitrarily and await at any point.
 *
 * This mirrors Drizzle's fluent API where:
 *   await db.select().from(t)
 *   await db.select().from(t).where(x)
 *   await db.select().from(t).where(x).limit(1)
 *   await db.select().from(t).orderBy(x)
 *   ... must all work.
 */
function makeQueryChain(): Promise<unknown[]> & {
  where: (...args: unknown[]) => ReturnType<typeof makeQueryChain>;
  limit: (...args: unknown[]) => ReturnType<typeof makeQueryChain>;
  orderBy: (...args: unknown[]) => ReturnType<typeof makeQueryChain>;
  returning: () => Promise<unknown[]>;
} {
  const base = Promise.resolve(_db.selectRows);
  return Object.assign(base, {
    where: (..._args: unknown[]) => makeQueryChain(),
    limit: (..._args: unknown[]) => makeQueryChain(),
    orderBy: (..._args: unknown[]) => makeQueryChain(),
    returning: () => Promise.resolve(_db.insertedRows),
  });
}

const mockSelect = vi.fn(() => ({ from: vi.fn(() => makeQueryChain()) }));

const mockUpdateWhere = vi.fn(() => Promise.resolve());
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockInsertValues = vi.fn(() => ({
  returning: vi.fn(() => Promise.resolve(_db.insertedRows)),
  onConflictDoUpdate: vi.fn(() => Promise.resolve()),
}));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockDelete = vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) }));

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

// ── Module mocks (must be hoisted before imports) ─────────────────────────────

vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("@neondatabase/serverless", () => ({ neon: vi.fn(() => ({})) }));
vi.mock("drizzle-orm/neon-http", () => ({ drizzle: vi.fn(() => mockDb) }));

// ── Router imports (after mocks) ──────────────────────────────────────────────

import { shopifyStoresRouter } from "../routers/shopifyStores";
import { notificationsRouter } from "../routers/notifications";
import { rewardsRouter } from "../routers/rewards";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/**
 * Build a minimal fake tRPC context.
 * `req` and `res` are stubbed — procedures under test don't use them directly.
 */
function makeCtx(user: UserLike | null = null): TrpcContext {
  return {
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: user as TrpcContext["user"],
  };
}

function resetDb() {
  _db.selectRows = [];
  _db.insertedRows = [];
  // Re-wire mocks that capture _db by closure (makeQueryChain reads _db.selectRows
  // lazily so no re-wiring needed there; update/insert mocks are similarly closure-based)
  mockUpdateWhere.mockImplementation(() => Promise.resolve());
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Shopify Stores — tenant isolation
// ─────────────────────────────────────────────────────────────────────────────

describe("shopifyStores — tenant isolation", () => {
  beforeEach(resetDb);

  it("removeStore: blocks a user whose tenantId differs from the store's tenantId", async () => {
    // Store belongs to tenant 200; user belongs to tenant 100
    _db.selectRows = [{ userId: 1, tenantId: 200 }];

    const caller = shopifyStoresRouter.createCaller(
      makeCtx(makeUser({ id: 1, tenantId: 100, role: "user" }))
    );
    await expect(caller.removeStore({ storeId: 42 })).rejects.toThrow(
      "Forbidden"
    );
  });

  it("removeStore: allows a user whose tenantId matches the store's tenantId", async () => {
    // Store belongs to the same tenant (100) and same user (1)
    _db.selectRows = [{ userId: 1, tenantId: 100 }];

    const caller = shopifyStoresRouter.createCaller(
      makeCtx(makeUser({ id: 1, tenantId: 100, role: "user" }))
    );
    const result = await caller.removeStore({ storeId: 42 });
    expect(result).toEqual({ success: true });
  });

  it("removeStore: blocks when userId does not match, same tenant", async () => {
    // Store belongs to user 99 in the same tenant — different user
    _db.selectRows = [{ userId: 99, tenantId: 100 }];

    const caller = shopifyStoresRouter.createCaller(
      makeCtx(makeUser({ id: 1, tenantId: 100, role: "user" }))
    );
    await expect(caller.removeStore({ storeId: 42 })).rejects.toThrow(
      "Forbidden"
    );
  });

  it("removeStore: admin bypasses tenant isolation", async () => {
    // Store belongs to a completely different tenant
    _db.selectRows = [{ userId: 99, tenantId: 999 }];

    const caller = shopifyStoresRouter.createCaller(
      makeCtx(makeUser({ id: 1, tenantId: 100, role: "admin" }))
    );
    const result = await caller.removeStore({ storeId: 42 });
    expect(result).toEqual({ success: true });
  });

  it("getStore: blocks cross-tenant access via NOT_FOUND (no row returned)", async () => {
    // DB returns empty because WHERE includes tenantId = 100 and store is owned by tenant 200 —
    // the filter means zero rows come back; handler throws.
    _db.selectRows = [];

    const caller = shopifyStoresRouter.createCaller(
      makeCtx(makeUser({ id: 1, tenantId: 100, role: "user" }))
    );
    await expect(caller.getStore({ storeId: 7 })).rejects.toThrow(
      "Store not found"
    );
  });

  it("getStore: returns store when tenantId and userId match, strips accessToken", async () => {
    const storeRow = {
      id: 7,
      userId: 1,
      tenantId: 100,
      shopDomain: "acme.myshopify.com",
      shopName: "Acme",
      shopEmail: "shop@acme.com",
      shopCurrency: "USD",
      shopPlan: "basic",
      scopes: "read_products",
      status: "active",
      lastSyncAt: null,
      installedAt: new Date(),
      accessToken: "secret-should-be-stripped",
    };
    _db.selectRows = [storeRow];

    const caller = shopifyStoresRouter.createCaller(
      makeCtx(makeUser({ id: 1, tenantId: 100, role: "user" }))
    );
    const result = (await caller.getStore({
      storeId: 7,
    })) as typeof storeRow & {
      accessToken?: string;
    };
    // access token must never be returned
    expect(result.accessToken).toBeUndefined();
    expect(result.shopDomain).toBe("acme.myshopify.com");
  });

  it("syncNow: blocks cross-tenant access", async () => {
    _db.selectRows = [
      { userId: 1, tenantId: 999, shopDomain: "evil.myshopify.com" },
    ];

    const caller = shopifyStoresRouter.createCaller(
      makeCtx(makeUser({ id: 1, tenantId: 100, role: "user" }))
    );
    await expect(caller.syncNow({ storeId: 5 })).rejects.toThrow("Forbidden");
  });

  it("getScopes: blocks when store is in a different tenant", async () => {
    _db.selectRows = [{ scopes: "read_products", userId: 1, tenantId: 200 }];

    const caller = shopifyStoresRouter.createCaller(
      makeCtx(makeUser({ id: 1, tenantId: 100, role: "user" }))
    );
    await expect(caller.getScopes({ storeId: 9 })).rejects.toThrow("Forbidden");
  });

  it("removeStore: rejects unauthenticated request with UNAUTHORIZED", async () => {
    const caller = shopifyStoresRouter.createCaller(makeCtx(null));
    await expect(caller.removeStore({ storeId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Notifications — tenant isolation & admin guard
// ─────────────────────────────────────────────────────────────────────────────

describe("notifications — tenant isolation", () => {
  beforeEach(resetDb);

  it("sendToUser: non-admin receives FORBIDDEN", async () => {
    const caller = notificationsRouter.createCaller(
      makeCtx(makeUser({ role: "user" }))
    );
    await expect(
      caller.sendToUser({ userId: 2, type: "info", title: "Hello" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("sendToUser: admin cannot send to user in a different tenant", async () => {
    // Target user belongs to tenant 200; admin belongs to tenant 100
    _db.selectRows = [{ tenantId: 200 }];

    const caller = notificationsRouter.createCaller(
      makeCtx(makeUser({ tenantId: 100, role: "admin" }))
    );
    await expect(
      caller.sendToUser({ userId: 99, type: "info", title: "Cross-tenant" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("sendToUser: admin can send to user in the same tenant", async () => {
    _db.selectRows = [{ tenantId: 100 }];

    const caller = notificationsRouter.createCaller(
      makeCtx(makeUser({ tenantId: 100, role: "admin" }))
    );
    const result = await caller.sendToUser({
      userId: 2,
      type: "info",
      title: "Hello tenant-mate",
    });
    expect(result).toEqual({ success: true });
  });

  it("sendToUser: super-admin (tenantId=null) can send cross-tenant", async () => {
    _db.selectRows = [{ tenantId: 999 }];

    const caller = notificationsRouter.createCaller(
      makeCtx(makeUser({ tenantId: null, role: "admin" }))
    );
    const result = await caller.sendToUser({
      userId: 99,
      type: "success",
      title: "Super-admin message",
    });
    expect(result).toEqual({ success: true });
  });

  it("broadcastToTenant: blocks sending to a different tenantId than the caller's", async () => {
    const caller = notificationsRouter.createCaller(
      makeCtx(makeUser({ tenantId: 100, role: "admin" }))
    );
    await expect(
      caller.broadcastToTenant({
        tenantId: 200, // attacker passes a different tenant
        type: "info",
        title: "Hostile broadcast",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("broadcastToTenant: succeeds when tenantId matches the caller's", async () => {
    _db.selectRows = [{ id: 1 }, { id: 2 }]; // two users in the tenant

    const caller = notificationsRouter.createCaller(
      makeCtx(makeUser({ tenantId: 100, role: "admin" }))
    );
    const result = (await caller.broadcastToTenant({
      tenantId: 100,
      type: "info",
      title: "Broadcast",
    })) as { sent: number };
    expect(result.sent).toBe(2);
  });

  it("list: rejects unauthenticated request with UNAUTHORIZED", async () => {
    const caller = notificationsRouter.createCaller(makeCtx(null));
    await expect(caller.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("markAllRead: rejects unauthenticated request with UNAUTHORIZED", async () => {
    const caller = notificationsRouter.createCaller(makeCtx(null));
    await expect(caller.markAllRead()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. adminProcedure enforcement on reward admin operations
// ─────────────────────────────────────────────────────────────────────────────

describe("rewardsRouter — adminProcedure enforcement", () => {
  beforeEach(resetDb);

  it("adminListOpportunities: rejects non-admin with FORBIDDEN", async () => {
    const caller = rewardsRouter.createCaller(
      makeCtx(makeUser({ role: "user" }))
    );
    await expect(caller.adminListOpportunities()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("adminCreateOpportunity: rejects non-admin with FORBIDDEN", async () => {
    const caller = rewardsRouter.createCaller(
      makeCtx(makeUser({ role: "user" }))
    );
    await expect(
      caller.adminCreateOpportunity({ title: "Test", credits: 10 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("adminToggleOpportunity: rejects non-admin with FORBIDDEN", async () => {
    const caller = rewardsRouter.createCaller(
      makeCtx(makeUser({ role: "user" }))
    );
    await expect(
      caller.adminToggleOpportunity({ id: 1, active: false })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("adminGetStats: rejects non-admin with FORBIDDEN", async () => {
    const caller = rewardsRouter.createCaller(
      makeCtx(makeUser({ role: "user" }))
    );
    await expect(caller.adminGetStats()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("adminListOpportunities: succeeds for admin role", async () => {
    _db.selectRows = [];
    const caller = rewardsRouter.createCaller(
      makeCtx(makeUser({ role: "admin" }))
    );
    const result = await caller.adminListOpportunities();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getBalance: rejects unauthenticated request with UNAUTHORIZED", async () => {
    const caller = rewardsRouter.createCaller(makeCtx(null));
    await expect(caller.getBalance()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
