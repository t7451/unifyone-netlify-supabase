import { TRPCError } from "@trpc/server";
import { logAudit } from "../../auditLogger";
import { logger } from "../../_core/logger";
import { getStripe } from "../../_core/stripeClient";
import {
  StripeVerificationError,
  verifyStripeCheckoutSession,
  verifyStripePaymentIntent,
} from "../../_core/verifyPurchase";
import { fireAutomations } from "../../lib/automationDispatch";
import { ordersRepo } from "./orders.repo";

type PaymentInput =
  | { provider: "stripe_payment_intent"; paymentIntentId: string }
  | { provider: "stripe_checkout_session"; sessionId: string }
  | { provider: "paypal"; orderId: string }
  | { provider: "square"; paymentId: string; orderId?: string }
  | { provider: "shopify"; orderId: string };

interface OrderItemInput {
  productId?: number;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

interface CreateOrderInput {
  customerEmail?: string;
  customerName?: string;
  items: OrderItemInput[];
  shippingAmount: number;
  taxAmount: number;
  currency: string;
  notes?: string;
  discountCode?: string;
  payment: PaymentInput;
}

export const ordersService = {
  async list(
    tenantId: number,
    input:
      | {
          status?: Parameters<typeof ordersRepo.listPage>[2]["status"];
          paymentStatus?: Parameters<
            typeof ordersRepo.listPage
          >[2]["paymentStatus"];
          search?: string;
          dateFrom?: string;
          dateTo?: string;
          page?: number;
          limit?: number;
        }
      | undefined
  ) {
    const db = await ordersRepo.getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });
    }

    const page = input?.page ?? 1;
    const limit = input?.limit ?? 25;
    const search = input?.search?.trim();

    const [items, totalResult] = await ordersRepo.listPage(db, tenantId, {
      status: input?.status,
      paymentStatus: input?.paymentStatus,
      search,
      dateFrom: input?.dateFrom,
      dateTo: input?.dateTo,
      page,
      limit,
    });

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async get(tenantId: number, id: number) {
    const order = await ordersRepo.getOrderWithItems(id, tenantId);
    if (!order) throw new TRPCError({ code: "NOT_FOUND" });
    return order;
  },

  async create(tenantId: number, userId: number, input: CreateOrderInput) {
    const subtotal = input.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const grossTotal = subtotal + input.shippingAmount + input.taxAmount;

    // PATCHED:DISCOUNT — resolve discount code before computing final total.
    // Failed lookups silently produce a 0 discount so a typoed code never
    // blocks a checkout that would otherwise succeed. The audit log row
    // captures whether the code was applied for forensic review.
    let discountAmount = 0;
    let discountCodeApplied: string | null = null;
    let discountIdApplied: number | null = null;
    if (input.discountCode) {
      try {
        const code = input.discountCode.toUpperCase().trim();
        const db2 = await ordersRepo.getDb();
        if (db2) {
          const rows = await ordersRepo.findActiveDiscountByCode(
            db2,
            tenantId,
            code
          );
          const d = rows[0];
          const now = new Date();
          const inWindow =
            d &&
            (!d.validFrom || d.validFrom <= now) &&
            (!d.validUntil || d.validUntil >= now);
          const underLimit =
            d && (d.usageLimit === 0 || d.usageCount < d.usageLimit);
          if (d && inWindow && underLimit) {
            const v = Number(d.value);
            if (Number.isFinite(v) && v > 0) {
              discountAmount =
                d.type === "percentage"
                  ? Math.round(grossTotal * (v / 100) * 100) / 100
                  : Math.min(v, grossTotal);
              discountCodeApplied = d.code;
              discountIdApplied = d.id;
            }
          }
        }
      } catch (err) {
        logger.warn("discount lookup failed; proceeding without discount", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    const total = Math.max(0, grossTotal - discountAmount);
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const providerFields: {
      stripePaymentIntentId?: string;
      stripeSessionId?: string;
      paypalOrderId?: string;
      squarePaymentId?: string;
      squareOrderId?: string;
      shopifyOrderId?: string;
      paymentMethod: "stripe" | "paypal" | "square" | "shopify";
      paymentStatus: "paid" | "pending";
    } = { paymentMethod: "stripe", paymentStatus: "pending" };

    try {
      switch (input.payment.provider) {
        case "stripe_payment_intent": {
          const intent = await verifyStripePaymentIntent(
            input.payment.paymentIntentId,
            { amount: total, currency: input.currency }
          );
          providerFields.stripePaymentIntentId = intent.id;
          providerFields.paymentMethod = "stripe";
          providerFields.paymentStatus = "paid";
          break;
        }
        case "stripe_checkout_session": {
          const session = await verifyStripeCheckoutSession(
            input.payment.sessionId,
            { amount: total, currency: input.currency }
          );
          providerFields.stripeSessionId = session.id;
          if (typeof session.payment_intent === "string") {
            providerFields.stripePaymentIntentId = session.payment_intent;
          }
          providerFields.paymentMethod = "stripe";
          providerFields.paymentStatus = "paid";
          break;
        }
        case "paypal":
          providerFields.paypalOrderId = input.payment.orderId;
          providerFields.paymentMethod = "paypal";
          break;
        case "square":
          providerFields.squarePaymentId = input.payment.paymentId;
          providerFields.squareOrderId = input.payment.orderId;
          providerFields.paymentMethod = "square";
          break;
        case "shopify":
          providerFields.shopifyOrderId = input.payment.orderId;
          providerFields.paymentMethod = "shopify";
          break;
      }
    } catch (err) {
      if (err instanceof StripeVerificationError) {
        const code =
          err.reason === "stripe_unavailable"
            ? "PRECONDITION_FAILED"
            : err.reason === "not_found"
              ? "NOT_FOUND"
              : "BAD_REQUEST";
        throw new TRPCError({ code, message: err.message });
      }
      throw err;
    }

    // For Stripe-backed orders, write a verification audit row BEFORE the
    // order insert so a DB failure between "Stripe captured the payment" and
    // "we wrote the order" can be reconciled. Pure-Stripe ids drive
    // idempotency: the same paymentIntentId/sessionId always returns the
    // same order, even on retry.
    const isStripe =
      providerFields.stripePaymentIntentId !== undefined ||
      providerFields.stripeSessionId !== undefined;

    let auditId: number | null = null;

    if (isStripe) {
      // Prefer paymentIntentId for the idempotency key — a session collapses
      // to a single intent at payment time, but the intent id is the
      // canonical "this money moved" handle.
      const stripeKey =
        providerFields.stripePaymentIntentId ?? providerFields.stripeSessionId;
      if (!stripeKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe verification produced no usable id.",
        });
      }
      const idempotencyKey = providerFields.stripePaymentIntentId
        ? `stripe:pi:${providerFields.stripePaymentIntentId}`
        : `stripe:cs:${providerFields.stripeSessionId}`;

      const { audit, isReplay } =
        await ordersRepo.recordStripePaymentVerification({
          tenantId,
          userId,
          idempotencyKey,
          stripePaymentIntentId: providerFields.stripePaymentIntentId,
          stripeSessionId: providerFields.stripeSessionId,
          amount: String(total),
          currency: input.currency,
          status: "pending",
        });
      auditId = audit.id;

      if (isReplay) {
        // Replay path: a previous attempt for this Stripe payment exists.
        // Try to return the previously-written order if it landed.
        if (audit.linkedOrderId) {
          const existing = await ordersRepo.getOrderById(
            audit.linkedOrderId,
            tenantId
          );
          if (existing) return existing;
        }
        // Audit was orphaned (DB write failed mid-flight) but the order may
        // still have landed before the audit was linked. Look it up by
        // Stripe id and reattach.
        const existingOrder = await ordersRepo.getOrderByStripeId(tenantId, {
          stripePaymentIntentId: providerFields.stripePaymentIntentId,
          stripeSessionId: providerFields.stripeSessionId,
        });
        if (existingOrder) {
          await ordersRepo.linkPaymentAuditToOrder(audit.id, existingOrder.id);
          return existingOrder;
        }
        // Fall through and create the order — the partial unique index on
        // orders.stripePaymentIntentId/stripeSessionId guarantees we can't
        // double-book.
      }
    }

    let order: Awaited<ReturnType<typeof ordersRepo.createOrder>>;
    try {
      order = await ordersRepo.createOrder(
        {
          tenantId,
          orderNumber,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          subtotal: String(subtotal),
          taxAmount: String(input.taxAmount),
          shippingAmount: String(input.shippingAmount),
          discountAmount: String(discountAmount),
          total: String(total),
          currency: input.currency,
          status: "pending",
          fulfillmentStatus: "unfulfilled",
          notes: input.notes,
          ...providerFields,
        },
        input.items
      );
    } catch (err) {
      // The partial unique index on orders.stripePaymentIntentId / stripeSessionId
      // can fire under concurrent retries — in that case fetch the winner.
      if (isStripe) {
        const existingOrder = await ordersRepo.getOrderByStripeId(tenantId, {
          stripePaymentIntentId: providerFields.stripePaymentIntentId,
          stripeSessionId: providerFields.stripeSessionId,
        });
        if (existingOrder) {
          if (auditId)
            await ordersRepo.linkPaymentAuditToOrder(auditId, existingOrder.id);
          return existingOrder;
        }
        if (auditId) {
          await ordersRepo.markPaymentAuditOrphaned(
            auditId,
            err instanceof Error ? err.message : String(err)
          );
          logger.error("Stripe payment audit orphaned", {
            auditId,
            tenantId,
            stripePaymentIntentId: providerFields.stripePaymentIntentId,
            stripeSessionId: providerFields.stripeSessionId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      throw err;
    }

    if (auditId && order) {
      await ordersRepo.linkPaymentAuditToOrder(auditId, order.id);
    }

    // Upsert customer record
    if (input.customerEmail) {
      await ordersRepo.upsertCustomer(tenantId, input.customerEmail, {
        firstName: input.customerName?.split(" ")[0],
        lastName: input.customerName?.split(" ").slice(1).join(" "),
      });
    }

    // PATCHED:H7 — observability. Fire-and-forget; a failed audit or
    // notification must NEVER break order creation (the money already moved).
    logAudit({
      userId,
      tenantId,
      action: "order.create",
      resource: "order",
      resourceId: String(order.id),
      severity: "low",
      metadata: {
        orderNumber: order.orderNumber,
        total: String(total),
        currency: input.currency,
        paymentMethod: providerFields.paymentMethod,
        paymentStatus: providerFields.paymentStatus,
        itemCount: input.items.length,
        customerEmail: input.customerEmail ?? null,
      },
    }).catch(() => {});

    try {
      const notifDb = await ordersRepo.getDb();
      if (notifDb) {
        await ordersRepo.insertNotification(notifDb, {
          userId,
          tenantId,
          type: "order",
          title: `New order ${order.orderNumber}`,
          body: `${input.items.length} item${
            input.items.length === 1 ? "" : "s"
          } — ${input.currency} ${total.toFixed(2)}${
            input.customerEmail ? " — " + input.customerEmail : ""
          }`,
          link: `/orders/${order.id}`,
        });
      }
    } catch (err) {
      logger.warn("order notification insert failed", {
        orderId: order.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // PATCHED:DISCOUNT — bump usageCount fire-and-forget after the order
    // committed. If this fails, the order is still valid; the count is
    // best-effort.
    if (discountIdApplied !== null) {
      try {
        const db3 = await ordersRepo.getDb();
        if (db3) {
          await ordersRepo.incrementDiscountUsage(
            db3,
            discountIdApplied,
            tenantId
          );
        }
      } catch (err) {
        logger.warn("discount usageCount increment failed", {
          discountId: discountIdApplied,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      logAudit({
        userId,
        tenantId,
        action: "discount.applied",
        resource: "discount",
        resourceId: String(discountIdApplied),
        severity: "low",
        metadata: {
          code: discountCodeApplied,
          orderId: order.id,
          discountAmount: String(discountAmount),
          grossTotal: String(grossTotal),
        },
      }).catch(() => {});
    }

    // Fire automation hooks (n8n + Zapier) for order.created and, if the
    // order was paid synchronously, payment.succeeded. Operators wire the
    // matching trigger events in /automations.
    void fireAutomations(tenantId, "order.created", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: String(total),
      currency: input.currency,
      itemCount: input.items.length,
      customerEmail: input.customerEmail ?? null,
      paymentMethod: providerFields.paymentMethod,
      paymentStatus: providerFields.paymentStatus,
    });
    if (providerFields.paymentStatus === "paid") {
      void fireAutomations(tenantId, "payment.succeeded", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: String(total),
        currency: input.currency,
        paymentMethod: providerFields.paymentMethod,
      });
    }

    return order;
  },

  async updateStatus(
    tenantId: number,
    input: {
      id: number;
      status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded";
      paymentStatus?: "pending" | "paid" | "failed" | "refunded" | "partial";
    }
  ) {
    const order = await ordersRepo.getOrderById(input.id, tenantId);
    if (!order) throw new TRPCError({ code: "NOT_FOUND" });
    await ordersRepo.updateOrderStatus(
      input.id,
      tenantId,
      input.status,
      input.paymentStatus
    );

    // Fire automation hooks for the new status. The trigger event names
    // (`order.status.shipped` etc.) are exposed in /automations so
    // operators can wire n8n/Zapier flows against them.
    const statusChanged = order.status !== input.status;
    if (statusChanged) {
      void fireAutomations(tenantId, `order.status.${input.status}`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        status: input.status,
      });
    }
    if (input.paymentStatus && input.paymentStatus !== order.paymentStatus) {
      const paymentEvent =
        input.paymentStatus === "paid"
          ? "payment.succeeded"
          : input.paymentStatus === "failed"
            ? "payment.failed"
            : null;
      if (paymentEvent) {
        void fireAutomations(tenantId, paymentEvent, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.total,
          currency: order.currency,
          paymentMethod: order.paymentMethod,
        });
      }
    }
    return { success: true };
  },

  async bulkDelete(tenantId: number, ids: number[]) {
    const deletedCount = await ordersRepo.bulkDeleteOrders(tenantId, ids);
    return { success: true, deletedCount };
  },

  /**
   * H6 — Issue a Stripe refund for an order. Idempotent at the order level via
   * paymentStatus="refunded" guard. Partial refunds supported via amountMinor.
   * Tenant-scoped: caller must belong to the order's tenant.
   */
  async refund(
    tenantId: number,
    userId: number,
    input: {
      orderId: number;
      amountMinor?: number;
      reason?: "duplicate" | "fraudulent" | "requested_by_customer";
    }
  ) {
    const order = await ordersRepo.getOrderById(input.orderId, tenantId);
    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found.",
      });
    }
    if (!order.stripePaymentIntentId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Refund only supported for Stripe-backed orders right now. " +
          "PayPal/Square refunds must be issued from their dashboards.",
      });
    }
    if (order.paymentStatus === "refunded") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Order has already been fully refunded.",
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe is not configured on this server.",
      });
    }

    let refund;
    try {
      refund = await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        amount: input.amountMinor,
        reason: input.reason,
        metadata: {
          unifyone_order_id: String(order.id),
          unifyone_order_number: order.orderNumber,
          unifyone_tenant_id: String(tenantId),
          unifyone_initiated_by: String(userId),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("stripe refund failed", {
        orderId: order.id,
        stripePaymentIntentId: order.stripePaymentIntentId,
        error: msg,
      });
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Stripe rejected the refund: ${msg}`,
      });
    }

    // Determine if this is a full or partial refund.
    const orderTotalMinor = Math.round(Number(order.total) * 100);
    const refundedMinor = refund.amount;
    const isFull =
      input.amountMinor === undefined || refundedMinor >= orderTotalMinor;

    const newPaymentStatus = isFull ? "refunded" : "partial";
    const newStatus = isFull ? "refunded" : order.status;
    await ordersRepo.updateOrderStatus(
      order.id,
      tenantId,
      newStatus,
      newPaymentStatus
    );

    // Audit + notify (fire-and-forget; the refund already happened).
    logAudit({
      userId,
      tenantId,
      action: "order.refund",
      resource: "order",
      resourceId: String(order.id),
      severity: isFull ? "medium" : "low",
      metadata: {
        orderNumber: order.orderNumber,
        stripeRefundId: refund.id,
        stripePaymentIntentId: order.stripePaymentIntentId,
        refundedMinor,
        orderTotalMinor,
        currency: order.currency,
        isFull,
        reason: input.reason ?? null,
      },
    }).catch(() => {});

    try {
      const notifDb = await ordersRepo.getDb();
      if (notifDb) {
        await ordersRepo.insertNotification(notifDb, {
          userId,
          tenantId,
          type: "payment",
          title: `${isFull ? "Refunded" : "Partially refunded"} order ${order.orderNumber}`,
          body: `${order.currency} ${(refundedMinor / 100).toFixed(2)} refunded via Stripe (${refund.id}).`,
          link: `/orders/${order.id}`,
        });
      }
    } catch (err) {
      logger.warn("refund notification insert failed", {
        orderId: order.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      success: true,
      refundId: refund.id,
      refundedMinor,
      isFull,
      newPaymentStatus,
      newStatus,
    };
  },

  async recentOrders(tenantId: number) {
    const rows = await ordersRepo.getOrders(tenantId, { limit: 10, offset: 0 });
    return rows.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: o.total,
      status: o.status,
      customerEmail: o.customerEmail ?? null,
      customerName: o.customerName ?? null,
      createdAt: o.createdAt,
    }));
  },

  async customers(
    tenantId: number,
    input: { search?: string; limit?: number; offset?: number } | undefined
  ) {
    return ordersRepo.getCustomers(tenantId, input);
  },

  async getCustomer(tenantId: number, id: number) {
    const customer = await ordersRepo.getCustomerById(id, tenantId);
    if (!customer) throw new TRPCError({ code: "NOT_FOUND" });
    return customer;
  },

  async customerOrders(tenantId: number, email: string) {
    return ordersRepo.getOrdersByCustomerEmail(tenantId, email);
  },

  async updateCustomer(
    tenantId: number,
    input: {
      id: number;
      firstName?: string;
      lastName?: string;
      phone?: string;
      tags?: string[];
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
      };
    }
  ) {
    const { id, ...data } = input;
    await ordersRepo.updateCustomer(id, tenantId, data);
    return { success: true };
  },
};
