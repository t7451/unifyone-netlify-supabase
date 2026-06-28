import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import * as db from "../../db";
import { products as productsTable } from "../../../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof db.getDb>>>;

/** Thin data-access layer: forwards to the shared `../../db` helpers and holds
 *  the few inline Drizzle queries this router runs directly. Named helpers are
 *  forwarded lazily so test mocks of `../../db` that omit unrelated exports
 *  don't trip vitest's strict-mock guard at module-load time. */
export const productsRepo = {
  getDb: (...a: Parameters<typeof db.getDb>) => db.getDb(...a),
  bulkArchiveProducts: (...a: Parameters<typeof db.bulkArchiveProducts>) =>
    db.bulkArchiveProducts(...a),
  bulkDeleteProducts: (...a: Parameters<typeof db.bulkDeleteProducts>) =>
    db.bulkDeleteProducts(...a),
  bulkUpdateProductStatus: (
    ...a: Parameters<typeof db.bulkUpdateProductStatus>
  ) => db.bulkUpdateProductStatus(...a),
  createCategory: (...a: Parameters<typeof db.createCategory>) =>
    db.createCategory(...a),
  createProduct: (...a: Parameters<typeof db.createProduct>) =>
    db.createProduct(...a),
  deleteProduct: (...a: Parameters<typeof db.deleteProduct>) =>
    db.deleteProduct(...a),
  getCategories: (...a: Parameters<typeof db.getCategories>) =>
    db.getCategories(...a),
  getInventory: (...a: Parameters<typeof db.getInventory>) =>
    db.getInventory(...a),
  getLowStockProducts: (...a: Parameters<typeof db.getLowStockProducts>) =>
    db.getLowStockProducts(...a),
  getProductById: (...a: Parameters<typeof db.getProductById>) =>
    db.getProductById(...a),
  updateProduct: (...a: Parameters<typeof db.updateProduct>) =>
    db.updateProduct(...a),
  upsertInventory: (...a: Parameters<typeof db.upsertInventory>) =>
    db.upsertInventory(...a),

  listPage(
    database: Db,
    tenantId: number,
    opts: {
      status?: "active" | "draft" | "archived";
      search?: string;
      categoryId?: number;
      page: number;
      limit: number;
    }
  ) {
    const conditions = [eq(productsTable.tenantId, tenantId)];

    if (opts.status) {
      conditions.push(eq(productsTable.status, opts.status));
    }
    if (opts.search) {
      const searchPattern = `%${opts.search}%`;
      const searchCondition = or(
        ilike(productsTable.name, searchPattern),
        ilike(productsTable.sku, searchPattern),
        ilike(productsTable.description, searchPattern)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    if (opts.categoryId) {
      conditions.push(eq(productsTable.categoryId, opts.categoryId));
    }

    const where = and(...conditions);
    return Promise.all([
      database
        .select()
        .from(productsTable)
        .where(where)
        .orderBy(desc(productsTable.createdAt))
        .limit(opts.limit)
        .offset((opts.page - 1) * opts.limit),
      database.select({ count: count() }).from(productsTable).where(where),
    ]);
  },
};
