import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockOnConflictDoNothing = vi.fn(() => Promise.resolve());
const mockInsertValues = vi.fn(() => ({
  onConflictDoNothing: mockOnConflictDoNothing,
}));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

// db mock — createTenant returns a full tenant row; other helpers are stubs
vi.mock("../../db", () => ({
  createTenant: vi.fn(),
  getAllTenants: vi.fn(() => Promise.resolve([])),
  getDb: vi.fn(),
  getPlans: vi.fn(() => Promise.resolve([])),
  getTenantById: vi.fn(() => Promise.resolve(null)),
  getTenantsByOwner: vi.fn(() => Promise.resolve([])),
  getTenantBySlug: vi.fn(() => Promise.resolve(null)),
  updateTenant: vi.fn(() => Promise.resolve()),
  updateUserTenant: vi.fn(() => Promise.resolve()),
  createProduct: vi.fn(() => Promise.resolve()),
  upsertInventory: vi.fn(() => Promise.resolve()),
  createOrder: vi.fn(() => Promise.resolve()),
  upsertCustomer: vi.fn(() => Promise.resolve()),
  createCategory: vi.fn(() => Promise.resolve()),
  getProductCount: vi.fn(() => Promise.resolve(0)),
  getOrderCountThisMonth: vi.fn(() => Promise.resolve(0)),
  getUserCount: vi.fn(() => Promise.resolve(0)),
}));

// drizzle schema — expose kaiCreditLedger with a stable idempotencyKey sentinel
vi.mock("../../../drizzle/schema", () => ({
  kaiCreditLedger: {
    idempotencyKey: "__sentinel_idempotencyKey__",
  },
  products: {},
}));

// Audit logger — fire-and-forget, suppress in tests
vi.mock("../../auditLogger", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

// Cache control helper — no-op
vi.mock("../../_core/cacheControl", () => ({
  setEdgeCache: vi.fn(),
  EDGE_CACHE: {},
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { getDb, createTenant, updateUserTenant, getTenantBySlug } from "../../db";
import { tenantRouter } from "../tenant";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 10,
      email: "owner@example.com",
      tenantId: null,
      role: "user",
      openId: "openid-owner",
      ...overrides,
    },
    req: {} as unknown,
    res: {} as unknown,
  };
}

function makeTenant(id: number) {
  return {
    id,
    name: "My Store",
    slug: "my-store",
    ownerId: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeDb() {
  return { insert: mockInsert };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("tenant.create — Kai welcome credit grant", () => {
  beforeEach(() => {
    vi.mocked(getTenantBySlug).mockResolvedValue(null);
    vi.mocked(createTenant).mockResolvedValue(makeTenant(99) as any);
    vi.mocked(updateUserTenant).mockResolvedValue(undefined as any);
    vi.mocked(getDb).mockResolvedValue(makeDb() as any);
    mockInsert.mockClear();
    mockInsertValues.mockClear();
    mockOnConflictDoNothing.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a 25-credit adjustment row for a new tenant", async () => {
    const caller = tenantRouter.createCaller(makeCtx() as any);
    const result = await caller.create({ name: "My Store", slug: "my-store" });

    expect(result.id).toBe(99);

    // Allow the fire-and-forget credit grant microtask to settle
    await vi.waitFor(() => expect(mockInsert).toHaveBeenCalled(), {
      timeout: 500,
    });

    expect(mockInsert).toHaveBeenCalledWith(expect.anything()); // kaiCreditLedger table
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 99,
        userId: 10,
        type: "adjustment",
        creditDelta: 25,
        idempotencyKey: "kai_welcome_bonus:99:10",
        description: "Welcome bonus — 25 free Kai credits",
      })
    );
    expect(mockOnConflictDoNothing).toHaveBeenCalledWith({
      target: "__sentinel_idempotencyKey__",
    });
  });

  it("does not insert credits when the database is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const caller = tenantRouter.createCaller(makeCtx() as any);
    await caller.create({ name: "My Store", slug: "my-store" });

    // Give the fire-and-forget a chance to run, then confirm no insert
    await new Promise(r => setTimeout(r, 50));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns the existing tenant without re-inserting credits on slug retry", async () => {
    // Slug already taken by the same owner — idempotent resume path
    const existing = makeTenant(99);
    vi.mocked(getTenantBySlug).mockResolvedValue({
      ...existing,
      ownerId: 10,
    } as any);

    const caller = tenantRouter.createCaller(makeCtx() as any);
    const result = await caller.create({ name: "My Store", slug: "my-store" });

    expect(result.id).toBe(99);

    // Give fire-and-forget time to run — no credit insert should happen
    await new Promise(r => setTimeout(r, 50));
    expect(mockInsert).not.toHaveBeenCalled();
    expect(createTenant).not.toHaveBeenCalled();
  });

  it("uses an idempotency key scoped to the tenant and user", async () => {
    const caller = tenantRouter.createCaller(makeCtx() as any);
    await caller.create({ name: "My Store", slug: "my-store" });

    await vi.waitFor(() => expect(mockInsertValues).toHaveBeenCalled(), {
      timeout: 500,
    });

    const [insertedRow] = mockInsertValues.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(insertedRow.idempotencyKey).toBe("kai_welcome_bonus:99:10");
  });
});
