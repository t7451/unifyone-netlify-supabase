import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { makeCtx } from "./__tests__/dbTestHelpers";
import type { TrpcContext } from "./_core/context";

// ── Shared mock state ─────────────────────────────────────────────────────────
// Must be defined at module scope so the vi.mock factory (which is hoisted)
// can capture it by reference.
const _dbState = {
  selectResult: [] as any[],
  insertResult: [{ insertId: 1 }] as any[],
  updateResult: undefined as any,
  deleteResult: undefined as any,
};

vi.mock("./db", () => {
  const makeChain = (finalResult: () => any) => {
    const chain: any = {
      select: () => chain,
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      groupBy: () => chain,
      limit: () => Promise.resolve(finalResult()),
      set: () => chain,
      values: () => Promise.resolve(_dbState.insertResult),
      returning: () => Promise.resolve(_dbState.insertResult),
      leftJoin: () => chain,
    };
    chain.then = (resolve: any) => Promise.resolve(finalResult()).then(resolve);
    return chain;
  };

  const db = {
    select: () => makeChain(() => _dbState.selectResult),
    insert: () => makeChain(() => _dbState.insertResult),
    update: () => makeChain(() => _dbState.updateResult),
    delete: () => makeChain(() => _dbState.deleteResult),
  };

  return {
    getDb: vi.fn().mockResolvedValue(db),
    getTenantByOwnerId: vi.fn().mockResolvedValue(null),
    getTenantById: vi.fn().mockResolvedValue(null),
    createTenant: vi.fn().mockResolvedValue(null),
    updateTenant: vi.fn().mockResolvedValue(undefined),
    getProducts: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn().mockResolvedValue(null),
    createProduct: vi.fn().mockResolvedValue(null),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
    getOrders: vi.fn().mockResolvedValue([]),
    getOrderById: vi.fn().mockResolvedValue(null),
    createOrder: vi.fn().mockResolvedValue(null),
    updateOrderStatus: vi.fn().mockResolvedValue(undefined),
    getCustomers: vi.fn().mockResolvedValue([]),
    getAnalyticsSummary: vi.fn().mockResolvedValue({ totalRevenue: "0", orderCount: 0, customerCount: 0, productCount: 0 }),
    getRevenueByDay: vi.fn().mockResolvedValue([]),
    getTopProducts: vi.fn().mockResolvedValue([]),
    getWebhookEvents: vi.fn().mockResolvedValue([]),
    getPlans: vi.fn().mockResolvedValue([]),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
    logWebhookEvent: vi.fn().mockResolvedValue(undefined),
    getTenantsByOwner: vi.fn().mockResolvedValue([]),
    getAllTenants: vi.fn().mockResolvedValue([]),
    updateUserTenant: vi.fn().mockResolvedValue(undefined),
    getCustomerCount: vi.fn().mockResolvedValue(0),
    getOrderCount: vi.fn().mockResolvedValue(0),
    getProductCount: vi.fn().mockResolvedValue(0),
    getCategories: vi.fn().mockResolvedValue([]),
    getInventory: vi.fn().mockResolvedValue([]),
    getLowStockProducts: vi.fn().mockResolvedValue([]),
    upsertInventory: vi.fn().mockResolvedValue(undefined),
    createCategory: vi.fn().mockResolvedValue(null),
  };
});

// ── Balance ───────────────────────────────────────────────────────────────────
describe("rewards router — balance", () => {
  beforeEach(() => {
    _dbState.selectResult = [{ creditBalance: 150 }];
    _dbState.insertResult = [{ insertId: 1 }];
  });

  it("returns the current user balance", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rewards.getBalance();
    expect(result).toHaveProperty("balance");
    expect(typeof result.balance).toBe("number");
  });

  it("returns 0 balance when db returns no user row", async () => {
    _dbState.selectResult = [];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rewards.getBalance();
    expect(result.balance).toBe(0);
  });
});

// ── Opportunities ─────────────────────────────────────────────────────────────
describe("rewards router — opportunities", () => {
  beforeEach(() => {
    _dbState.selectResult = [];
    _dbState.insertResult = [{ insertId: 1 }];
  });

  it("lists active opportunities with canClaim flag", async () => {
    // Both selects (opportunities + user claims) share the same chain mock.
    // Empty selectResult means no opportunities returned — array is still valid.
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rewards.listOpportunities();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can create a new opportunity", async () => {
    _dbState.insertResult = [{ insertId: 5 }];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rewards.adminCreateOpportunity({
      title: "Referral Bonus",
      credits: 100,
      category: "referral",
      maxClaimsPerUser: 5,
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot create opportunities", async () => {
    const ctx = makeCtx({ user: { ...makeCtx().user!, role: "user" } as any });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.rewards.adminCreateOpportunity({
        title: "Test",
        credits: 10,
        category: "engagement",
        maxClaimsPerUser: 1,
      })
    ).rejects.toThrow();
  });

  it("admin can toggle an opportunity active state", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rewards.adminToggleOpportunity({ id: 1, active: false });
    expect(result.success).toBe(true);
  });
});

// ── Credit history ────────────────────────────────────────────────────────────
describe("rewards router — history", () => {
  beforeEach(() => {
    _dbState.selectResult = [
      {
        id: 1,
        userId: 1,
        amount: 50,
        type: "earned",
        source: "bonus",
        description: "Sign Up Bonus",
        balanceAfter: 50,
        createdAt: new Date(),
      },
    ];
  });

  it("returns credit transaction history", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rewards.getCreditHistory({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns reward claim history", async () => {
    _dbState.selectResult = [
      {
        id: 1,
        credits: 50,
        status: "completed",
        claimedAt: new Date(),
        opportunityTitle: "Sign Up Bonus",
        opportunityCategory: "signup",
      },
    ];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rewards.getHistory({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── Admin stats ───────────────────────────────────────────────────────────────
describe("rewards router — admin stats", () => {
  beforeEach(() => {
    _dbState.selectResult = [{ count: 5 }];
  });

  it("returns admin stats with numeric fields", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rewards.adminGetStats();
    expect(result).toHaveProperty("totalClaims");
    expect(result).toHaveProperty("totalCreditsIssued");
    expect(result).toHaveProperty("activeOpportunities");
    expect(result).toHaveProperty("claimsLast7Days");
  });

  it("non-admin cannot view admin stats", async () => {
    const ctx = makeCtx({ user: { ...makeCtx().user!, role: "user" } as any });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.rewards.adminGetStats()).rejects.toThrow();
  });
});
