import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Shared mock state (mutated per test via beforeEach) ───────────────────────
// We cannot reference outer variables inside vi.mock factory (hoisting).
// Instead we use a module-level object that the factory captures by reference.
const _dbState = {
  selectResult: [] as any[],
  insertResult: [{ id: 1 }] as any[],
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
      values: () => chain,
      returning: () => Promise.resolve(_dbState.insertResult),
    };
    // Make the chain itself awaitable (for .where().then())
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
    // Keep legacy named exports so other test files still work
    getTenantByOwnerId: vi.fn().mockResolvedValue(null),
    getTenantById: vi.fn().mockResolvedValue(null),
    createTenant: vi.fn().mockResolvedValue({
      id: 1,
      name: "T",
      slug: "t",
      status: "active",
      planId: 1,
      ownerId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    updateTenant: vi.fn().mockResolvedValue(undefined),
    getProducts: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn().mockResolvedValue(null),
    createProduct: vi.fn().mockResolvedValue({
      id: 1,
      name: "P",
      price: "9.99",
      tenantId: 1,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
    getOrders: vi.fn().mockResolvedValue([]),
    getOrderById: vi.fn().mockResolvedValue(null),
    createOrder: vi.fn().mockResolvedValue({
      id: 1,
      orderNumber: "ORD-001",
      status: "pending",
      total: "9.99",
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    updateOrderStatus: vi.fn().mockResolvedValue(undefined),
    getCustomers: vi.fn().mockResolvedValue([]),
    getAnalyticsSummary: vi.fn().mockResolvedValue({
      totalRevenue: "0",
      orderCount: 0,
      customerCount: 0,
      productCount: 0,
    }),
    getRevenueByDay: vi.fn().mockResolvedValue([]),
    getTopProducts: vi.fn().mockResolvedValue([]),
    getWebhookEvents: vi.fn().mockResolvedValue([]),
    getPlans: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Starter",
        slug: "starter",
        price: "0",
        maxProducts: 50,
        maxOrders: 100,
        maxUsers: 1,
        features: null,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: "Pro",
        slug: "pro",
        price: "49",
        maxProducts: 500,
        maxOrders: 1000,
        maxUsers: 5,
        features: null,
        createdAt: new Date(),
      },
      {
        id: 3,
        name: "Enterprise",
        slug: "enterprise",
        price: "199",
        maxProducts: 9999,
        maxOrders: 99999,
        maxUsers: 25,
        features: null,
        createdAt: new Date(),
      },
    ]),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
    logWebhookEvent: vi.fn().mockResolvedValue(undefined),
    getIntegrationStatus: vi.fn().mockResolvedValue({
      stripe: { connected: false },
      shopify: { connected: false, shopDomain: null },
      n8n: { configured: false, webhookUrl: null },
    }),
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
    createCategory: vi.fn().mockResolvedValue({
      id: 1,
      name: "Test",
      slug: "test",
      tenantId: 1,
      parentId: null,
      createdAt: new Date(),
    }),
  };
});

// ── Context helper ────────────────────────────────────────────────────────────
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

// ── Tier 1: In-app notification center ───────────────────────────────────────
describe("notifications router — Tier 1: In-app notification center", () => {
  beforeEach(() => {
    _dbState.selectResult = [
      {
        id: 1,
        userId: 1,
        tenantId: 1,
        type: "info",
        title: "Welcome",
        body: null,
        link: null,
        read: false,
        readAt: null,
        createdAt: new Date(),
      },
      {
        id: 2,
        userId: 1,
        tenantId: 1,
        type: "order",
        title: "Order placed",
        body: null,
        link: null,
        read: true,
        readAt: new Date(),
        createdAt: new Date(),
      },
    ];
    _dbState.insertResult = [{ insertId: 1 }];
    _dbState.updateResult = undefined;
    _dbState.deleteResult = undefined;
  });

  it("lists notifications for the current user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns unread count as a number", async () => {
    _dbState.selectResult = [{ count: 1 }];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.unreadCount();
    expect(result).toHaveProperty("count");
    expect(typeof result.count).toBe("number");
  });

  it("marks a notification as read", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markRead({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("marks all notifications as read", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markAllRead();
    expect(result.success).toBe(true);
  });

  it("deletes a notification", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ── Tier 2: Admin broadcast ───────────────────────────────────────────────────
describe("notifications router — Tier 2: Admin broadcast", () => {
  beforeEach(() => {
    _dbState.selectResult = [];
    _dbState.insertResult = [{ insertId: 99 }];
  });

  it("admin can send a notification to a specific user", async () => {
    // Mock the target user DB lookup — must return a user in the same tenant
    _dbState.selectResult = [{ id: 2, tenantId: 1 }];
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.sendToUser({
      userId: 2,
      type: "info",
      title: "Test notification",
      body: "Hello from admin",
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot send notifications to users", async () => {
    const ctx = makeCtx({
      user: { ...makeCtx().user, role: "user" } as TrpcContext["user"],
    });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notifications.sendToUser({
        userId: 2,
        type: "info",
        title: "Test",
      })
    ).rejects.toThrow();
  });

  it("admin can broadcast to all tenant users", async () => {
    _dbState.selectResult = []; // no users in tenant — sent = 0
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.broadcastToTenant({
      tenantId: 1,
      type: "success",
      title: "Feature update",
      body: "New features are live!",
    });
    expect(result).toHaveProperty("sent");
    expect(typeof result.sent).toBe("number");
  });
});

// ── Tier 3: Announcements ─────────────────────────────────────────────────────
describe("notifications router — Tier 3: Announcements", () => {
  beforeEach(() => {
    _dbState.selectResult = [];
    _dbState.insertResult = [{ insertId: 1 }];
    _dbState.updateResult = undefined;
    _dbState.deleteResult = undefined;
  });

  it("admin can create an announcement", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.createAnnouncement({
      title: "Scheduled maintenance",
      body: "Brief downtime on Sunday at 2am UTC.",
      type: "banner",
      severity: "warning",
      dismissible: true,
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot create announcements", async () => {
    const ctx = makeCtx({
      user: { ...makeCtx().user, role: "user" } as TrpcContext["user"],
    });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.notifications.createAnnouncement({
        title: "T",
        body: "B",
        type: "banner",
        severity: "info",
        dismissible: true,
      })
    ).rejects.toThrow();
  });

  it("admin can toggle announcement active state", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.toggleAnnouncement({
      id: 1,
      active: false,
    });
    expect(result.success).toBe(true);
  });

  it("user can dismiss an announcement", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.dismissAnnouncement({
      announcementId: 1,
    });
    expect(result.success).toBe(true);
  });
});

// ── Tier 4: Trigger config ────────────────────────────────────────────────────
describe("notifications router — Tier 4: Trigger config", () => {
  beforeEach(() => {
    _dbState.selectResult = [
      {
        id: 1,
        tenantId: 1,
        event: "order.created",
        n8nEnabled: true,
        zapierEnabled: false,
        mailchimpEnabled: false,
        slackWebhookUrl: null,
        slackEnabled: false,
        emailEnabled: true,
        emailRecipients: "admin@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    _dbState.insertResult = [{ insertId: 1 }];
    _dbState.updateResult = undefined;
    _dbState.deleteResult = undefined;
  });

  it("lists notification triggers for a tenant", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.listTriggers({ tenantId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("upserts a notification trigger", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.upsertTrigger({
      tenantId: 1,
      event: "order.created",
      n8nEnabled: true,
      zapierEnabled: false,
      mailchimpEnabled: false,
      slackEnabled: false,
      emailEnabled: true,
      emailRecipients: "admin@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("deletes a notification trigger", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.deleteTrigger({ id: 1 });
    expect(result.success).toBe(true);
  });
});
