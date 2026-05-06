import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  bulkDeleteOrders,
  createOrder,
  getCustomerById,
  getCustomers,
  getDb,
  getOrderById,
  getOrderByStripeId,
  getOrdersByCustomerEmail,
  getOrderWithItems,
  getOrders,
  linkPaymentAuditToOrder,
  markPaymentAuditOrphaned,
  recordStripePaymentVerification,
  updateCustomer,
  updateOrderStatus,
  upsertCustomer,
} from "../db";
import {
  discounts,
  notifications,
  orderStatusEnum,
  orders as ordersTable,
  paymentStatusEnum,
} from "../../drizzle/schema";
import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { logAudit } from "../auditLogger";
import {
  protectedIpRateLimitedProcedure,
  protectedProcedure,
  router,
} from "../_core/trpc";
import { logger } from "../_core/logger";
import { orderCreateLimiter } from "../_core/rateLimiter";
import { getStripe } from "../_core/stripeClient";
import {
  StripeVerificationError,
  verifyStripeCheckoutSession,
  verifyStripePaymentIntent,
} from "../_core/verifyPurchase";

// Discriminated union: every order must reference a real provider object so we
// can audit it back against the provider's API. Stripe ids are verified live
// against the Stripe API before the order is written; other providers rely on
// their own capture/webhook flows for confirmation.
const paymentInputSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("stripe_payment_intent"),
    paymentIntentId: z
      .string()
      .regex(/^pi_/, "Expected a Stripe PaymentIntent id (pi_...)"),
  }),
  z.object({
    provider: z.literal("stripe_checkout_session"),
    sessionId: z
      .string()
      .regex(/^cs_/, "Expected a Stripe Checkout Session id (cs_...)"),
  }),
  z.object({ provider: z.literal("paypal"), orderId: z.string().min(1) }),
  z.object({
    provider: z.literal("square"),
    paymentId: z.string().min(1),
    orderId: z.string().optional(),
  }),
  z.object({ provider: z.literal("shopify"), orderId: z.string().min(1) }),
]);

const requireTenant = (tenantId: number | null | undefined) => {
  if (!tenantId)
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant." });
  return tenantId;
};

export const ordersRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          tenantId: z.number().optional(),
          status: z.enum(orderStatusEnum.enumValues).optional(),
          paymentStatus: z.enum(paymentStatusEnum.enumValues).optional(),
          search: z.string().trim().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(25),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      if (input?.tenantId !== undefined && input.tenantId !== tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Tenant mismatch.",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      }

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 25;
      const conditions = [eq(ordersTable.tenantId, tenantId)];
      const search = input?.search?.trim();

      if (input?.status) {
        conditions.push(eq(ordersTable.status, input.status));
      }
      if (input?.paymentStatus) {
        conditions.push(eq(ordersTable.paymentStatus, input.paymentStatus));
      }
      if (search) {
        const searchPattern = `%${search}%`;
        const searchCondition = or(
          ilike(ordersTable.orderNumber, searchPattern),
          ilike(ordersTable.customerName, searchPattern),
          ilike(ordersTable.customerEmail, searchPattern),
          sql`cast(${ordersTable.id} as text) ilike ${searchPattern}`
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }
      if (input?.dateFrom) {
        const dateFrom = new Date(input.dateFrom);
        if (!Number.isNaN(dateFrom.getTime())) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(input.dateFrom)) {
            dateFrom.setUTCHours(0, 0, 0, 0);
          }
          conditions.push(gte(ordersTable.createdAt, dateFrom));
        }
      }
      if (input?.dateTo) {
        const dateTo = new Date(input.dateTo);
        if (!Number.isNaN(dateTo.getTime())) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(input.dateTo)) {
            dateTo.setUTCHours(23, 59, 59, 999);
          }
          conditions.push(lte(ordersTable.createdAt, dateTo));
        }
      }

      const where = and(...conditions);
      const [items, totalResult] = await Promise.all([
        db
          .select()
          .from(ordersTable)
          .where(where)
          .orderBy(desc(ordersTable.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        db.select({ count: count() }).from(ordersTable).where(where),
      ]);

      const total = Number(totalResult[0]?.count ?? 0);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const order = await getOrderWithItems(input.id, tenantId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      return order;
    }),

  create: protectedIpRateLimitedProcedure(orderCreateLimiter, "orders:create")
    .input(
      z.object({
        customerEmail: z.string().email().optional(),
        customerName: z.string().optional(),
        items: z
          .array(
            z.object({
              productId: z.number().optional(),
              productName: z.string(),
              productSku: z.string().optional(),
              quantity: z.number().min(1),
              unitPrice: z.number().min(0),
              imageUrl: z.string().optional(),
            })
          )
          .min(1),
        shippingAmount: z.number().default(0),
        taxAmount: z.number().default(0),
        currency: z.string().length(3).default("USD"),
        notes: z.string().optional(),
        /** Optional discount code to apply. Validated server-side; if invalid
         *  or expired, the order is created without the discount. */
        discountCode: z.string().min(1).max(64).optional(),
        payment: paymentInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const userId = ctx.user.id;
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
          const db2 = await getDb();
          if (db2) {
            const rows = await db2
              .select()
              .from(discounts)
              .where(
                and(
                  eq(discounts.tenantId, tenantId),
                  eq(discounts.code, code),
                  eq(discounts.isActive, true)
                )
              )
              .limit(1);
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
          providerFields.stripePaymentIntentId ??
          providerFields.stripeSessionId;
        if (!stripeKey) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Stripe verification produced no usable id.",
          });
        }
        const idempotencyKey = providerFields.stripePaymentIntentId
          ? `stripe:pi:${providerFields.stripePaymentIntentId}`
          : `stripe:cs:${providerFields.stripeSessionId}`;

        const { audit, isReplay } = await recordStripePaymentVerification({
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
            const existing = await getOrderById(audit.linkedOrderId, tenantId);
            if (existing) return existing;
          }
          // Audit was orphaned (DB write failed mid-flight) but the order may
          // still have landed before the audit was linked. Look it up by
          // Stripe id and reattach.
          const existingOrder = await getOrderByStripeId(tenantId, {
            stripePaymentIntentId: providerFields.stripePaymentIntentId,
            stripeSessionId: providerFields.stripeSessionId,
          });
          if (existingOrder) {
            await linkPaymentAuditToOrder(audit.id, existingOrder.id);
            return existingOrder;
          }
          // Fall through and create the order — the partial unique index on
          // orders.stripePaymentIntentId/stripeSessionId guarantees we can't
          // double-book.
        }
      }

      let order: Awaited<ReturnType<typeof createOrder>>;
      try {
        order = await createOrder(
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
          const existingOrder = await getOrderByStripeId(tenantId, {
            stripePaymentIntentId: providerFields.stripePaymentIntentId,
            stripeSessionId: providerFields.stripeSessionId,
          });
          if (existingOrder) {
            if (auditId)
              await linkPaymentAuditToOrder(auditId, existingOrder.id);
            return existingOrder;
          }
          if (auditId) {
            await markPaymentAuditOrphaned(
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
        await linkPaymentAuditToOrder(auditId, order.id);
      }

      // Upsert customer record
      if (input.customerEmail) {
        await upsertCustomer(tenantId, input.customerEmail, {
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
        const notifDb = await getDb();
        if (notifDb) {
          await notifDb.insert(notifications).values({
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
          const db3 = await getDb();
          if (db3) {
            await db3
              .update(discounts)
              .set({
                usageCount: sql`${discounts.usageCount} + 1`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(discounts.id, discountIdApplied),
                  eq(discounts.tenantId, tenantId)
                )
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

      return order;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "refunded",
        ]),
        paymentStatus: z
          .enum(["pending", "paid", "failed", "refunded", "partial"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const order = await getOrderById(input.id, tenantId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      await updateOrderStatus(
        input.id,
        tenantId,
        input.status,
        input.paymentStatus
      );
      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const deletedCount = await bulkDeleteOrders(tenantId, input.ids);
      return { success: true, deletedCount };
    }),

  /**
   * H6 — Issue a Stripe refund for an order. Idempotent at the order level via
   * paymentStatus="refunded" guard. Partial refunds supported via amountMinor.
   * Tenant-scoped: caller must belong to the order's tenant.
   */
  refund: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        /** Refund amount in MINOR units (cents). Omit for full refund. */
        amountMinor: z.number().int().positive().optional(),
        /** Stripe-accepted reason, optional. */
        reason: z
          .enum(["duplicate", "fraudulent", "requested_by_customer"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const userId = ctx.user.id;

      const order = await getOrderById(input.orderId, tenantId);
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
      await updateOrderStatus(order.id, tenantId, newStatus, newPaymentStatus);

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
        const notifDb = await getDb();
        if (notifDb) {
          await notifDb.insert(notifications).values({
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
    }),

  recentOrders: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const rows = await getOrders(tenantId, { limit: 10, offset: 0 });
    return rows.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: o.total,
      status: o.status,
      customerEmail: o.customerEmail ?? null,
      customerName: o.customerName ?? null,
      createdAt: o.createdAt,
    }));
  }),

  // Customers
  customers: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return getCustomers(tenantId, input);
    }),

  getCustomer: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const customer = await getCustomerById(input.id, tenantId);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });
      return customer;
    }),

  customerOrders: protectedProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return getOrdersByCustomerEmail(tenantId, input.email);
    }),

  updateCustomer: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        tags: z.array(z.string()).optional(),
        address: z
          .object({
            line1: z.string().optional(),
            line2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const { id, ...data } = input;
      await updateCustomer(id, tenantId, data);
      return { success: true };
    }),
});
