import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import {
  bulkArchiveProducts,
  bulkDeleteProducts,
  bulkUpdateProductStatus,
  createProduct,
  deleteProduct,
  getCategories,
  getDb,
  getInventory,
  getLowStockProducts,
  getProductById,
  updateProduct,
  upsertInventory,
  createCategory,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { products as productsTable } from "../../drizzle/schema";

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

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB unavailable",
        });
      }

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 25;
      const conditions = [eq(productsTable.tenantId, tenantId)];
      const search = input?.search?.trim();

      if (input?.status) {
        conditions.push(eq(productsTable.status, input.status));
      }
      if (search) {
        const searchPattern = `%${search}%`;
        const searchCondition = or(
          ilike(productsTable.name, searchPattern),
          ilike(productsTable.sku, searchPattern),
          ilike(productsTable.description, searchPattern)
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }
      if (input?.categoryId) {
        conditions.push(eq(productsTable.categoryId, input.categoryId));
      }

      const where = and(...conditions);
      const [items, totalResult] = await Promise.all([
        db
          .select()
          .from(productsTable)
          .where(where)
          .orderBy(desc(productsTable.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
        db.select({ count: count() }).from(productsTable).where(where),
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
      const product = await getProductById(input.id, tenantId);
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });
      const inv = await getInventory(tenantId, input.id);
      return { ...product, inventory: inv[0] ?? null };
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
      const slug =
        input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Date.now();
      const product = await createProduct({
        tenantId,
        name: input.name,
        slug,
        description: input.description,
        sku: input.sku,
        price: String(input.price),
        compareAtPrice: input.compareAtPrice
          ? String(input.compareAtPrice)
          : undefined,
        costPrice: input.costPrice ? String(input.costPrice) : undefined,
        categoryId: input.categoryId,
        status: input.status,
        imageUrl: input.imageUrl,
        trackInventory: input.trackInventory,
      });
      if (product && input.trackInventory) {
        await upsertInventory(
          tenantId,
          product.id,
          input.initialStock,
          input.lowStockThreshold
        );
      }
      return product;
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
      const {
        id,
        quantity,
        lowStockThreshold,
        price,
        compareAtPrice,
        costPrice,
        ...rest
      } = input;
      await updateProduct(id, tenantId, {
        ...rest,
        ...(price !== undefined ? { price: String(price) } : {}),
        ...(compareAtPrice !== undefined
          ? { compareAtPrice: compareAtPrice ? String(compareAtPrice) : null }
          : {}),
        ...(costPrice !== undefined
          ? { costPrice: costPrice ? String(costPrice) : null }
          : {}),
      });
      if (quantity !== undefined) {
        await upsertInventory(tenantId, id, quantity, lowStockThreshold);
      }
      return getProductById(id, tenantId);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      await deleteProduct(input.id, tenantId);
      return { success: true };
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
      const updatedCount = await bulkUpdateProductStatus(
        tenantId,
        input.ids,
        input.status
      );
      return { success: true, updatedCount };
    }),

  bulkArchive: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const updatedCount = await bulkArchiveProducts(tenantId, input.ids);
      return { success: true, updatedCount };
    }),

  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.user.tenantId);
      const deletedCount = await bulkDeleteProducts(tenantId, input.ids);
      return { success: true, deletedCount };
    }),

  // Inventory
  inventory: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getInventory(tenantId);
  }),

  lowStock: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getLowStockProducts(tenantId);
  }),

  // Categories
  categories: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.user.tenantId);
    return getCategories(tenantId);
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
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await createCategory(tenantId, input.name, slug, input.description);
      return getCategories(tenantId);
    }),
});
