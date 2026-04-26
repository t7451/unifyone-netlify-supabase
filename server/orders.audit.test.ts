import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { makeCtx } from "./__tests__/dbTestHelpers";

// Stripe verification is unit-tested separately in
// server/_core/verifyPurchase.test.ts. Here we stub it out so the test
// focuses on the audit/idempotency wiring.
vi.mock("./_core/verifyPurchase", async () => {
  const actual = await vi.importActual<typeof import("./_core/verifyPurchase")>(
    "./_core/verifyPurchase"
  );
  return {
    ...actual,
    verifyStripePaymentIntent: vi.fn(async (id: string) => ({
      id,
      amount: 0,
      amount_received: 0,
      currency: "usd",
      status: "succeeded",
    })),
    verifyStripeCheckoutSession: vi.fn(async (id: string) => ({
      id,
      amount_total: 0,
      currency: "usd",
      payment_status: "paid",
      payment_intent: null,
    })),
  };
});

const _state = {
  audit: null as { id: number; linkedOrderId: number | null } | null,
  isReplay: false,
  existingOrderById: null as Record<string, unknown> | null,
  existingOrderByStripe: null as Record<string, unknown> | null,
  createOrderImpl: null as null | (() => Promise<Record<string, unknown>>),
  linkPaymentAuditCalls: [] as Array<{ auditId: number; orderId: number }>,
  markOrphanedCalls: [] as Array<{ auditId: number; error: string }>,
  recordCalls: 0,
};

vi.mock("./db", () => {
  return {
    getDb: vi.fn().mockResolvedValue({}),
    recordStripePaymentVerification: vi.fn(async () => {
      _state.recordCalls++;
      return {
        audit: _state.audit ?? { id: 99, linkedOrderId: null },
        isReplay: _state.isReplay,
      };
    }),
    getOrderById: vi.fn(async () => _state.existingOrderById),
    getOrderByStripeId: vi.fn(async () => _state.existingOrderByStripe),
    linkPaymentAuditToOrder: vi.fn(async (auditId: number, orderId: number) => {
      _state.linkPaymentAuditCalls.push({ auditId, orderId });
    }),
    markPaymentAuditOrphaned: vi.fn(async (auditId: number, error: string) => {
      _state.markOrphanedCalls.push({ auditId, error });
    }),
    createOrder: vi.fn(async () => {
      if (_state.createOrderImpl) return _state.createOrderImpl();
      return { id: 1234, orderNumber: "ORD-test" };
    }),
    upsertCustomer: vi.fn(async () => undefined),
    getOrders: vi.fn().mockResolvedValue([]),
    getOrderWithItems: vi.fn().mockResolvedValue(null),
    getCustomers: vi.fn().mockResolvedValue([]),
    getCustomerById: vi.fn().mockResolvedValue(null),
    getOrdersByCustomerEmail: vi.fn().mockResolvedValue([]),
    updateCustomer: vi.fn().mockResolvedValue(undefined),
    updateOrderStatus: vi.fn().mockResolvedValue(undefined),
  };
});

const baseInput = {
  customerEmail: "buyer@example.com",
  customerName: "Buyer",
  items: [{ productName: "Thing", quantity: 1, unitPrice: 10 }],
  shippingAmount: 0,
  taxAmount: 0,
  currency: "USD",
  payment: {
    provider: "stripe_payment_intent" as const,
    paymentIntentId: "pi_abc",
  },
};

beforeEach(() => {
  _state.audit = { id: 42, linkedOrderId: null };
  _state.isReplay = false;
  _state.existingOrderById = null;
  _state.existingOrderByStripe = null;
  _state.createOrderImpl = null;
  _state.linkPaymentAuditCalls = [];
  _state.markOrphanedCalls = [];
  _state.recordCalls = 0;
});

describe("orders.create — Stripe audit / idempotency", () => {
  it("happy path: records audit, creates order, links audit", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const order = await caller.orders.create(baseInput);
    expect(order).toMatchObject({ id: 1234 });
    expect(_state.recordCalls).toBe(1);
    expect(_state.linkPaymentAuditCalls).toEqual([
      { auditId: 42, orderId: 1234 },
    ]);
    expect(_state.markOrphanedCalls).toEqual([]);
  });

  it("idempotent replay: returns the previously-linked order without re-creating", async () => {
    _state.audit = { id: 42, linkedOrderId: 999 };
    _state.isReplay = true;
    _state.existingOrderById = { id: 999, orderNumber: "ORD-prev" };

    const caller = appRouter.createCaller(makeCtx());
    const order = await caller.orders.create(baseInput);

    expect(order).toMatchObject({ id: 999 });
    // No new linking and no new createOrder call should fire.
    expect(_state.linkPaymentAuditCalls).toEqual([]);
  });

  it("replay with orphaned audit but order exists by Stripe id: relinks", async () => {
    _state.audit = { id: 42, linkedOrderId: null };
    _state.isReplay = true;
    _state.existingOrderByStripe = { id: 555, orderNumber: "ORD-stranded" };

    const caller = appRouter.createCaller(makeCtx());
    const order = await caller.orders.create(baseInput);

    expect(order).toMatchObject({ id: 555 });
    expect(_state.linkPaymentAuditCalls).toEqual([
      { auditId: 42, orderId: 555 },
    ]);
  });

  it("DB write failure marks audit orphaned and rethrows", async () => {
    _state.createOrderImpl = async () => {
      throw new Error("DB exploded");
    };

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.orders.create(baseInput)).rejects.toThrow(
      "DB exploded"
    );

    expect(_state.markOrphanedCalls).toHaveLength(1);
    expect(_state.markOrphanedCalls[0]).toMatchObject({
      auditId: 42,
      error: "DB exploded",
    });
  });

  it("DB unique-conflict during INSERT recovers by linking the existing order", async () => {
    _state.createOrderImpl = async () => {
      throw new Error("duplicate key value violates unique constraint");
    };
    _state.existingOrderByStripe = { id: 777, orderNumber: "ORD-winner" };

    const caller = appRouter.createCaller(makeCtx());
    const order = await caller.orders.create(baseInput);

    expect(order).toMatchObject({ id: 777 });
    expect(_state.linkPaymentAuditCalls).toEqual([
      { auditId: 42, orderId: 777 },
    ]);
    // No orphan record — the order exists, just under a different audit attempt.
    expect(_state.markOrphanedCalls).toEqual([]);
  });

  it("non-Stripe payment (PayPal) skips audit/idempotency entirely", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const order = await caller.orders.create({
      ...baseInput,
      payment: { provider: "paypal", orderId: "PAYPAL-XYZ" },
    });

    expect(order).toMatchObject({ id: 1234 });
    expect(_state.recordCalls).toBe(0);
    expect(_state.linkPaymentAuditCalls).toEqual([]);
  });
});
