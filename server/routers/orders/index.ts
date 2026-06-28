import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { orderStatusEnum, paymentStatusEnum } from "../../../drizzle/schema";
import {
  protectedIpRateLimitedProcedure,
  protectedProcedure,
  router,
} from "../../_core/trpc";
import { orderCreateLimiter } from "../../_core/rateLimiter";
import { ordersService } from "./orders.service";

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
      return ordersService.list(tenantId, input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return ordersService.get(tenantId, input.id);
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
      return ordersService.create(tenantId, ctx.user.id, input);
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
      return ordersService.updateStatus(tenantId, input);
    }),

  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return ordersService.bulkDelete(tenantId, input.ids);
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
      return ordersService.refund(tenantId, ctx.user.id, input);
    }),

  recentOrders: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return ordersService.recentOrders(tenantId);
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
      return ordersService.customers(tenantId, input);
    }),

  getCustomer: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return ordersService.getCustomer(tenantId, input.id);
    }),

  customerOrders: protectedProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return ordersService.customerOrders(tenantId, input.email);
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
      return ordersService.updateCustomer(tenantId, input);
    }),
});
