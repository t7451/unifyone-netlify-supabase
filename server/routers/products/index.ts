import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { productsService } from "./products.service";

const requireTenant = (tenantId: number | null | undefined) => {
  if (!tenantId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active tenant. Create a store first.",
    });
  return tenantId;
};

export const productsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          tenantId: z.number().optional(),
          status: z.enum(["active", "draft", "archived"]).optional(),
          search: z.string().trim().optional(),
          categoryId: z.number().optional(),
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
      return productsService.list(tenantId, input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return productsService.get(tenantId, input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(500),
        description: z.string().optional(),
        sku: z.string().optional(),
        price: z.number().min(0),
        compareAtPrice: z.number().optional(),
        costPrice: z.number().optional(),
        categoryId: z.number().optional(),
        status: z.enum(["active", "draft", "archived"]).default("draft"),
        imageUrl: z.string().optional(),
        trackInventory: z.boolean().default(true),
        initialStock: z.number().default(0),
        lowStockThreshold: z.number().default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return productsService.create(tenantId, input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        sku: z.string().optional(),
        price: z.number().min(0).optional(),
        compareAtPrice: z.number().optional().nullable(),
        costPrice: z.number().optional().nullable(),
        categoryId: z.number().optional().nullable(),
        status: z.enum(["active", "draft", "archived"]).optional(),
        imageUrl: z.string().optional(),
        trackInventory: z.boolean().optional(),
        quantity: z.number().optional(),
        lowStockThreshold: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return productsService.update(tenantId, input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return productsService.delete(tenantId, input.id);
    }),

  bulkUpdateStatus: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(500),
        status: z.enum(["active", "draft", "archived"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return productsService.bulkUpdateStatus(
        tenantId,
        input.ids,
        input.status
      );
    }),

  bulkArchive: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return productsService.bulkArchive(tenantId, input.ids);
    }),

  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return productsService.bulkDelete(tenantId, input.ids);
    }),

  // Inventory
  inventory: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return productsService.inventory(tenantId);
  }),

  lowStock: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return productsService.lowStock(tenantId);
  }),

  // Categories
  categories: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return productsService.categories(tenantId);
  }),

  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      return productsService.createCategory(tenantId, input);
    }),
});
