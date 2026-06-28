import { TRPCError } from "@trpc/server";
import { productsRepo } from "./products.repo";

export const productsService = {
  async list(
    tenantId: number,
    input:
      | {
          status?: "active" | "draft" | "archived";
          search?: string;
          categoryId?: number;
          page?: number;
          limit?: number;
        }
      | undefined
  ) {
    const db = await productsRepo.getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB unavailable",
      });
    }

    const page = input?.page ?? 1;
    const limit = input?.limit ?? 25;
    const search = input?.search?.trim();

    const [items, totalResult] = await productsRepo.listPage(db, tenantId, {
      status: input?.status,
      search,
      categoryId: input?.categoryId,
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
    const product = await productsRepo.getProductById(id, tenantId);
    if (!product) throw new TRPCError({ code: "NOT_FOUND" });
    const inv = await productsRepo.getInventory(tenantId, id);
    return { ...product, inventory: inv[0] ?? null };
  },

  async create(
    tenantId: number,
    input: {
      name: string;
      description?: string;
      sku?: string;
      price: number;
      compareAtPrice?: number;
      costPrice?: number;
      categoryId?: number;
      status: "active" | "draft" | "archived";
      imageUrl?: string;
      trackInventory: boolean;
      initialStock: number;
      lowStockThreshold: number;
    }
  ) {
    const slug =
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now();
    const product = await productsRepo.createProduct({
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
      await productsRepo.upsertInventory(
        tenantId,
        product.id,
        input.initialStock,
        input.lowStockThreshold
      );
    }
    return product;
  },

  async update(
    tenantId: number,
    input: {
      id: number;
      name?: string;
      description?: string;
      sku?: string;
      price?: number;
      compareAtPrice?: number | null;
      costPrice?: number | null;
      categoryId?: number | null;
      status?: "active" | "draft" | "archived";
      imageUrl?: string;
      trackInventory?: boolean;
      quantity?: number;
      lowStockThreshold?: number;
    }
  ) {
    const {
      id,
      quantity,
      lowStockThreshold,
      price,
      compareAtPrice,
      costPrice,
      ...rest
    } = input;
    await productsRepo.updateProduct(id, tenantId, {
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
      await productsRepo.upsertInventory(
        tenantId,
        id,
        quantity,
        lowStockThreshold
      );
    }
    return productsRepo.getProductById(id, tenantId);
  },

  async delete(tenantId: number, id: number) {
    await productsRepo.deleteProduct(id, tenantId);
    return { success: true };
  },

  async bulkUpdateStatus(
    tenantId: number,
    ids: number[],
    status: "active" | "draft" | "archived"
  ) {
    const updatedCount = await productsRepo.bulkUpdateProductStatus(
      tenantId,
      ids,
      status
    );
    return { success: true, updatedCount };
  },

  async bulkArchive(tenantId: number, ids: number[]) {
    const updatedCount = await productsRepo.bulkArchiveProducts(tenantId, ids);
    return { success: true, updatedCount };
  },

  async bulkDelete(tenantId: number, ids: number[]) {
    const deletedCount = await productsRepo.bulkDeleteProducts(tenantId, ids);
    return { success: true, deletedCount };
  },

  async inventory(tenantId: number) {
    return productsRepo.getInventory(tenantId);
  },

  async lowStock(tenantId: number) {
    return productsRepo.getLowStockProducts(tenantId);
  },

  async categories(tenantId: number) {
    return productsRepo.getCategories(tenantId);
  },

  async createCategory(
    tenantId: number,
    input: { name: string; description?: string }
  ) {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await productsRepo.createCategory(
      tenantId,
      input.name,
      slug,
      input.description
    );
    return productsRepo.getCategories(tenantId);
  },
};
