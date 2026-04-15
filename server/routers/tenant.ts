import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTenant,
  getAllTenants,
  getPlans,
  getTenantById,
  getTenantsByOwner,
  getTenantBySlug,
  updateTenant,
  updateUserTenant,
  createProduct,
  upsertInventory,
  createOrder,
  upsertCustomer,
  createCategory,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const tenantRouter = router({
  // Get all tenants owned by the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return getTenantsByOwner(ctx.user.id);
  }),

  // Admin: get all tenants
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllTenants();
  }),

  // Get a single tenant
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getTenantById(input.id);
      if (
        !tenant ||
        (tenant.ownerId !== ctx.user.id && ctx.user.role !== "admin")
      )
        throw new TRPCError({ code: "NOT_FOUND" });
      return tenant;
    }),

  // Check if a slug is available (called while logged in during store setup)
  checkSlugAvailable: protectedProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(2)
          .max(100)
          .regex(/^[a-z0-9-]+$/),
      })
    )
    .query(async ({ input }) => {
      const existing = await getTenantBySlug(input.slug);
      return { available: !existing };
    }),

  // Create a new tenant (store/workspace)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        slug: z
          .string()
          .min(2)
          .max(100)
          .regex(/^[a-z0-9-]+$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createTenant({
        name: input.name,
        slug: input.slug,
        ownerId: ctx.user.id,
      });
      const tenants = await getTenantsByOwner(ctx.user.id);
      const newTenant = tenants.find(t => t.slug === input.slug);
      if (newTenant) await updateUserTenant(ctx.user.id, newTenant.id);
      return newTenant;
    }),

  // Update tenant settings
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).max(255).optional(),
        domain: z.string().optional(),
        logoUrl: z.string().optional(),
        shopifyShopDomain: z.string().optional(),
        shopifyAccessToken: z.string().optional(),
        shopifySyncEnabled: z.boolean().optional(),
        n8nWebhookUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getTenantById(input.id);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
      if (tenant.ownerId !== ctx.user.id && ctx.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateTenant(
        id,
        data,
        ctx.user.role !== "admin" ? ctx.user.id : undefined
      );
      return getTenantById(id);
    }),

  // Get subscription plans
  getPlans: protectedProcedure.query(async () => {
    return getPlans();
  }),

  // Seed demo data for the current tenant
  seedDemo: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    if (!tenantId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active tenant. Create a store first.",
      });

    // Create categories (returns void, fetch them after)
    await createCategory(
      tenantId,
      "Apparel",
      "apparel-" + Date.now(),
      "Clothing and accessories"
    );
    await createCategory(
      tenantId,
      "Industrial",
      "industrial-" + Date.now(),
      "Industrial supplies"
    );

    // Create demo products
    const demoProducts = [
      {
        name: "Premium Hoodie",
        price: 59.99,
        sku: "APP-001",
        status: "active" as const,
        stock: 45,
        threshold: 10,
      },
      {
        name: "Work Gloves XL",
        price: 24.99,
        sku: "IND-001",
        status: "active" as const,
        stock: 120,
        threshold: 20,
      },
      {
        name: "Safety Vest",
        price: 18.5,
        sku: "IND-002",
        status: "active" as const,
        stock: 8,
        threshold: 15,
      },
      {
        name: "Graphic Tee",
        price: 29.99,
        sku: "APP-002",
        status: "active" as const,
        stock: 62,
        threshold: 10,
      },
      {
        name: "Steel Toe Boots",
        price: 129.0,
        sku: "IND-003",
        status: "active" as const,
        stock: 22,
        threshold: 5,
      },
      {
        name: "Fleece Jacket",
        price: 79.99,
        sku: "APP-003",
        status: "draft" as const,
        stock: 0,
        threshold: 10,
      },
    ];

    const createdProducts: {
      id: number;
      name: string;
      price: string | number;
    }[] = [];
    for (const p of demoProducts) {
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-demo";
      const product = await createProduct({
        name: p.name,
        slug,
        price: String(p.price),
        sku: p.sku,
        status: p.status,
        tenantId,
        trackInventory: true,
      });
      if (product) {
        await upsertInventory(tenantId, product.id, p.stock, p.threshold);
        createdProducts.push(product);
      }
    }

    // Create demo customers
    const demoCustomers = [
      {
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Johnson",
        phone: "+1-555-0101",
      },
      {
        email: "bob@example.com",
        firstName: "Bob",
        lastName: "Martinez",
        phone: "+1-555-0102",
      },
      {
        email: "carol@example.com",
        firstName: "Carol",
        lastName: "Chen",
        phone: "+1-555-0103",
      },
    ];
    for (const c of demoCustomers) {
      await upsertCustomer(tenantId, c.email, {
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
      });
    }

    // Create demo orders
    if (createdProducts.length >= 2) {
      const p1 = createdProducts[0];
      const p2 = createdProducts[1];
      const ts = Date.now();
      await createOrder(
        {
          tenantId,
          orderNumber: `DEMO-${ts}-1`,
          customerEmail: "alice@example.com",
          customerName: "Alice Johnson",
          status: "delivered" as const,
          paymentStatus: "paid",
          subtotal: String(Number(p1.price) * 2),
          total: String(Number(p1.price) * 2),
          currency: "USD",
          notes: "Demo order",
        },
        [
          {
            productId: p1.id,
            productName: p1.name,
            quantity: 2,
            unitPrice: Number(p1.price),
          },
        ]
      );
      await createOrder(
        {
          tenantId,
          orderNumber: `DEMO-${ts}-2`,
          customerEmail: "bob@example.com",
          customerName: "Bob Martinez",
          status: "processing",
          paymentStatus: "paid",
          subtotal: String(Number(p2.price)),
          total: String(Number(p2.price)),
          currency: "USD",
        },
        [
          {
            productId: p2.id,
            productName: p2.name,
            quantity: 1,
            unitPrice: Number(p2.price),
          },
        ]
      );
      await createOrder(
        {
          tenantId,
          orderNumber: `DEMO-${ts}-3`,
          customerEmail: "carol@example.com",
          customerName: "Carol Chen",
          status: "pending",
          paymentStatus: "pending",
          subtotal: String(Number(p1.price)),
          total: String(Number(p1.price)),
          currency: "USD",
        },
        [
          {
            productId: p1.id,
            productName: p1.name,
            quantity: 1,
            unitPrice: Number(p1.price),
          },
        ]
      );
    }

    return {
      success: true,
      productsCreated: createdProducts.length,
      customersCreated: demoCustomers.length,
      ordersCreated: 3,
    };
  }),
});
