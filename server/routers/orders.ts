import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createOrder, getCustomerById, getCustomers, getOrderById, getOrdersByCustomerEmail, getOrderWithItems, getOrders, updateCustomer, updateOrderStatus, upsertCustomer } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const requireTenant = (tenantId: number | null | undefined) => {
  if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active tenant." });
  return tenantId;
};

export const ordersRouter = router({
  list: protectedProcedure.input(z.object({
    status: z.string().optional(),
    search: z.string().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }).optional()).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getOrders(tenantId, input);
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const order = await getOrderWithItems(input.id, tenantId);
    if (!order) throw new TRPCError({ code: "NOT_FOUND" });
    return order;
  }),

  create: protectedProcedure.input(z.object({
    customerEmail: z.string().email().optional(),
    customerName: z.string().optional(),
    items: z.array(z.object({
      productId: z.number().optional(),
      productName: z.string(),
      productSku: z.string().optional(),
      quantity: z.number().min(1),
      unitPrice: z.number().min(0),
      imageUrl: z.string().optional(),
    })),
    shippingAmount: z.number().default(0),
    taxAmount: z.number().default(0),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const subtotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total = subtotal + input.shippingAmount + input.taxAmount;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const order = await createOrder({
      tenantId,
      orderNumber,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      subtotal: String(subtotal),
      taxAmount: String(input.taxAmount),
      shippingAmount: String(input.shippingAmount),
      total: String(total),
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      notes: input.notes,
    }, input.items);

    // Upsert customer record
    if (input.customerEmail) {
      await upsertCustomer(tenantId, input.customerEmail, {
        firstName: input.customerName?.split(" ")[0],
        lastName: input.customerName?.split(" ").slice(1).join(" "),
      });
    }

    return order;
  }),

  updateStatus: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
    paymentStatus: z.enum(["pending", "paid", "failed", "refunded", "partial"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const order = await getOrderById(input.id, tenantId);
    if (!order) throw new TRPCError({ code: "NOT_FOUND" });
    await updateOrderStatus(input.id, tenantId, input.status, input.paymentStatus);
    return { success: true };
  }),

  // Customers
  customers: protectedProcedure.input(z.object({
    search: z.string().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }).optional()).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getCustomers(tenantId, input);
  }),

  getCustomer: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const customer = await getCustomerById(input.id, tenantId);
    if (!customer) throw new TRPCError({ code: "NOT_FOUND" });
    return customer;
  }),

  customerOrders: protectedProcedure.input(z.object({ email: z.string() })).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getOrdersByCustomerEmail(tenantId, input.email);
  }),

  updateCustomer: protectedProcedure.input(z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional(),
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  })).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    const { id, ...data } = input;
    await updateCustomer(id, tenantId, data);
    return { success: true };
  }),
});
