import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module to avoid real DB connections in tests
vi.mock("./db", () => ({
  getTenantByOwnerId: vi.fn().mockResolvedValue(null),
  getTenantById: vi.fn().mockResolvedValue(null),
  createTenant: vi.fn().mockResolvedValue({ id: 1, name: "Test Store", slug: "test-store", status: "active", planId: 1, ownerId: 1, createdAt: new Date(), updatedAt: new Date() }),
  updateTenant: vi.fn().mockResolvedValue(undefined),
  getProducts: vi.fn().mockResolvedValue([]),
  getProductById: vi.fn().mockResolvedValue(null),
  createProduct: vi.fn().mockResolvedValue({ id: 1, name: "Test Product", price: "29.99", tenantId: 1, status: "active", createdAt: new Date(), updatedAt: new Date() }),
  updateProduct: vi.fn().mockResolvedValue(undefined),
  deleteProduct: vi.fn().mockResolvedValue(undefined),
  getOrders: vi.fn().mockResolvedValue([]),
  getOrderById: vi.fn().mockResolvedValue(null),
  createOrder: vi.fn().mockResolvedValue({ id: 1, orderNumber: "ORD-001", status: "pending", total: "29.99", tenantId: 1, createdAt: new Date(), updatedAt: new Date() }),
  updateOrderStatus: vi.fn().mockResolvedValue(undefined),
  getCustomers: vi.fn().mockResolvedValue([]),
  getAnalyticsSummary: vi.fn().mockResolvedValue({ totalRevenue: "0", orderCount: 0, customerCount: 0, productCount: 0 }),
  getRevenueByDay: vi.fn().mockResolvedValue([]),
  getTopProducts: vi.fn().mockResolvedValue([]),
  getWebhookEvents: vi.fn().mockResolvedValue([]),
  getPlans: vi.fn().mockResolvedValue([
    { id: 1, name: "Starter", slug: "starter", price: "0", maxProducts: 50, maxOrders: 100, maxUsers: 1, features: null, createdAt: new Date() },
    { id: 2, name: "Pro", slug: "pro", price: "49", maxProducts: 500, maxOrders: 1000, maxUsers: 5, features: null, createdAt: new Date() },
    { id: 3, name: "Enterprise", slug: "enterprise", price: "199", maxProducts: 9999, maxOrders: 99999, maxUsers: 25, features: null, createdAt: new Date() },
  ]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  logWebhookEvent: vi.fn().mockResolvedValue(undefined),
  getIntegrationStatus: vi.fn().mockResolvedValue({ stripe: { connected: false }, shopify: { connected: false, shopDomain: null }, n8n: { configured: false, webhookUrl: null } }),
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
  createCategory: vi.fn().mockResolvedValue({ id: 1, name: "Test", slug: "test", tenantId: 1, parentId: null, createdAt: new Date() }),
}));

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "local",
      role: "admin",
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

describe("auth router", () => {
  it("returns the current user from me query", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@example.com");
  });

  it("clears the session cookie on logout", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });

  it("returns null for unauthenticated me query", async () => {
    const ctx = makeCtx({ user: null });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("tenant router", () => {
  it("returns subscription plans", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const plans = await caller.tenant.getPlans();
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBe(3);
    expect(plans[0].name).toBe("Starter");
  });

  it("creates a new tenant", async () => {
    const ctx = makeCtx();
    const { getTenantsByOwner } = await import("./db");
    vi.mocked(getTenantsByOwner).mockResolvedValueOnce([{
      id: 1, name: "Test Store", slug: "test-store", status: "active" as const, planId: 1, ownerId: 1,
      domain: null, logoUrl: null, stripeCustomerId: null, stripeSubscriptionId: null,
      stripePriceId: null, shopifyShopDomain: null, shopifyAccessToken: null,
      shopifySyncEnabled: false, n8nWebhookUrl: null, createdAt: new Date(), updatedAt: new Date()
    }]);
    const caller = appRouter.createCaller(ctx);
    const tenant = await caller.tenant.create({ name: "Test Store", slug: "test-store" });
    expect(tenant).toBeDefined();
    expect(tenant?.name).toBe("Test Store");
  });
});

const mockTenant = {
  id: 1, name: "Test", slug: "test", status: "active" as const, planId: 1, ownerId: 1,
  domain: null, logoUrl: null, stripeCustomerId: null, stripeSubscriptionId: null,
  stripePriceId: null, shopifyShopDomain: null, shopifyAccessToken: null,
  shopifySyncEnabled: false, n8nWebhookUrl: null, createdAt: new Date(), updatedAt: new Date()
};

describe("analytics router", () => {
  it("returns analytics summary", async () => {
    const ctx = makeCtx();
    const { getTenantByOwnerId } = await import("./db");
    vi.mocked(getTenantByOwnerId).mockResolvedValue(mockTenant);
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.analytics.summary();
    expect(summary).toBeDefined();
    expect(typeof summary.orderCount).toBe("number");
  });
});

describe("products router", () => {
  it("returns empty product list for new tenant", async () => {
    const ctx = makeCtx();
    const { getTenantByOwnerId } = await import("./db");
    vi.mocked(getTenantByOwnerId).mockResolvedValue(mockTenant);
    const caller = appRouter.createCaller(ctx);
    const products = await caller.products.list();
    expect(Array.isArray(products)).toBe(true);
  });
});
