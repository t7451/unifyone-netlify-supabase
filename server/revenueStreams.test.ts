import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { makeCtx } from "./__tests__/dbTestHelpers";

// ── Shared mock state ─────────────────────────────────────────────────────────
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
      limit: () => Promise.resolve(finalResult()),
      set: () => chain,
      values: () => Promise.resolve(_dbState.insertResult),
      returning: () => Promise.resolve(_dbState.insertResult),
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

const mockStream = {
  id: 1,
  userId: 1,
  name: "Amazon Associates",
  type: "affiliate" as const,
  platform: "Amazon",
  monthlyValue: "250.00",
  commissionRate: "5.00",
  status: "active" as const,
  affiliateLink: "https://amzn.to/example",
  cookieDuration: 30,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── List ──────────────────────────────────────────────────────────────────────
describe("revenueStreams router — list", () => {
  beforeEach(() => {
    _dbState.selectResult = [mockStream];
    _dbState.insertResult = [{ insertId: 1 }];
  });

  it("returns revenue streams for the current user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.revenueStreams.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty list when user has no streams", async () => {
    _dbState.selectResult = [];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.revenueStreams.list();
    expect(result).toEqual([]);
  });
});

// ── Create ────────────────────────────────────────────────────────────────────
describe("revenueStreams router — create", () => {
  beforeEach(() => {
    _dbState.insertResult = [{ insertId: 2 }];
  });

  it("creates a new affiliate revenue stream", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.revenueStreams.create({
      name: "Shopify Affiliate",
      type: "affiliate",
      platform: "Shopify",
      monthlyValue: 500,
      commissionRate: 10,
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("creates a SaaS revenue stream", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.revenueStreams.create({
      name: "UnifyOne Subscription",
      type: "saas",
      monthlyValue: 4900,
      status: "active",
    });
    expect(result.success).toBe(true);
  });
});

// ── Update ────────────────────────────────────────────────────────────────────
describe("revenueStreams router — update", () => {
  beforeEach(() => {
    _dbState.updateResult = undefined;
  });

  it("updates a revenue stream", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.revenueStreams.update({
      id: 1,
      monthlyValue: 300,
      status: "active",
    });
    expect(result.success).toBe(true);
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────
describe("revenueStreams router — delete", () => {
  beforeEach(() => {
    _dbState.deleteResult = undefined;
  });

  it("deletes a revenue stream owned by the user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.revenueStreams.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────
describe("revenueStreams router — getSummary", () => {
  it("returns summary with totalMonthly and byType breakdown", async () => {
    _dbState.selectResult = [
      { ...mockStream, monthlyValue: "250.00", status: "active" },
      { ...mockStream, id: 2, name: "Consulting", type: "consulting", monthlyValue: "1500.00", status: "active" },
      { ...mockStream, id: 3, name: "Broken Stream", type: "affiliate", monthlyValue: "50.00", status: "broken" },
    ];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.revenueStreams.getSummary();
    expect(result).toHaveProperty("totalMonthly");
    expect(result).toHaveProperty("activeCount");
    expect(result).toHaveProperty("brokenCount");
    expect(result).toHaveProperty("byType");
    expect(typeof result.totalMonthly).toBe("number");
    // Active streams: 250 + 1500 = 1750
    expect(result.totalMonthly).toBe(1750);
    expect(result.activeCount).toBe(2);
    expect(result.brokenCount).toBe(1);
  });

  it("returns zero summary when user has no streams", async () => {
    _dbState.selectResult = [];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.revenueStreams.getSummary();
    expect(result.totalMonthly).toBe(0);
    expect(result.activeCount).toBe(0);
  });
});
