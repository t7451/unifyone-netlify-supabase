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

const mockProgram = {
  id: 1,
  userId: 1,
  name: "Shopify Partners",
  category: "ecommerce",
  platform: "Shopify",
  commissionRate: "20.00",
  commissionType: "percentage" as const,
  cookieDuration: 30,
  affiliateLink: "https://shopify.com/affiliates/example",
  monthlyEarnings: "800.00",
  pendingPayout: "200.00",
  instantPayout: false,
  active: true,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── List ──────────────────────────────────────────────────────────────────────
describe("affiliates router — list", () => {
  beforeEach(() => {
    _dbState.selectResult = [mockProgram];
    _dbState.insertResult = [{ insertId: 1 }];
  });

  it("returns affiliate programs for the current user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.affiliates.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns empty list when user has no programs", async () => {
    _dbState.selectResult = [];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.affiliates.list();
    expect(result).toEqual([]);
  });
});

// ── Create ────────────────────────────────────────────────────────────────────
describe("affiliates router — create", () => {
  beforeEach(() => {
    _dbState.insertResult = [{ insertId: 2 }];
  });

  it("creates a percentage-commission affiliate program", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.affiliates.create({
      name: "Amazon Associates",
      category: "general",
      platform: "Amazon",
      commissionRate: 5,
      commissionType: "percentage",
      cookieDuration: 24,
      monthlyEarnings: 300,
      pendingPayout: 75,
      instantPayout: false,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("creates a flat-fee affiliate program", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.affiliates.create({
      name: "Software Referral",
      commissionRate: 50,
      commissionType: "flat",
      cookieDuration: 90,
      monthlyEarnings: 500,
      pendingPayout: 0,
      instantPayout: true,
      active: true,
    });
    expect(result.success).toBe(true);
  });
});

// ── Update ────────────────────────────────────────────────────────────────────
describe("affiliates router — update", () => {
  beforeEach(() => {
    _dbState.updateResult = undefined;
  });

  it("updates an affiliate program", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.affiliates.update({
      id: 1,
      monthlyEarnings: 1000,
      pendingPayout: 250,
    });
    expect(result.success).toBe(true);
  });

  it("can deactivate an affiliate program", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.affiliates.update({ id: 1, active: false });
    expect(result.success).toBe(true);
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────
describe("affiliates router — delete", () => {
  beforeEach(() => {
    _dbState.deleteResult = undefined;
  });

  it("deletes an affiliate program owned by the user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.affiliates.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────
describe("affiliates router — getSummary", () => {
  it("returns summary with total earnings and payout counts", async () => {
    _dbState.selectResult = [
      { ...mockProgram, monthlyEarnings: "800.00", pendingPayout: "200.00", active: true, instantPayout: false },
      { ...mockProgram, id: 2, name: "ConvertKit", monthlyEarnings: "400.00", pendingPayout: "100.00", active: true, instantPayout: true },
      { ...mockProgram, id: 3, name: "Inactive Program", monthlyEarnings: "0.00", pendingPayout: "0.00", active: false, instantPayout: false },
    ];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.affiliates.getSummary();
    expect(result).toHaveProperty("totalMonthly");
    expect(result).toHaveProperty("totalPending");
    expect(result).toHaveProperty("activeCount");
    expect(result).toHaveProperty("instantPayoutCount");
    // Active programs: 800 + 400 = 1200
    expect(result.totalMonthly).toBe(1200);
    expect(result.activeCount).toBe(2);
    expect(result.instantPayoutCount).toBe(1);
  });

  it("returns zero summary when user has no programs", async () => {
    _dbState.selectResult = [];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.affiliates.getSummary();
    expect(result.totalMonthly).toBe(0);
    expect(result.activeCount).toBe(0);
  });
});
