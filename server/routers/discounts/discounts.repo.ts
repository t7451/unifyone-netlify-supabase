import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { discounts } from "../../../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type DiscountInsert = typeof discounts.$inferInsert;

/** Thin data-access wrappers around the shared `getDb()` Drizzle client. */
export const discountsRepo = {
  getDb,

  listByTenant(db: Db, tenantId: number) {
    return db
      .select()
      .from(discounts)
      .where(eq(discounts.tenantId, tenantId))
      .orderBy(desc(discounts.createdAt));
  },

  insert(db: Db, values: DiscountInsert) {
    return db.insert(discounts).values(values).returning();
  },

  update(
    db: Db,
    id: number,
    tenantId: number,
    update: Record<string, unknown>
  ) {
    return db
      .update(discounts)
      .set(update)
      .where(and(eq(discounts.id, id), eq(discounts.tenantId, tenantId)));
  },

  delete(db: Db, id: number, tenantId: number) {
    return db
      .delete(discounts)
      .where(and(eq(discounts.id, id), eq(discounts.tenantId, tenantId)));
  },

  findActiveByCode(db: Db, tenantId: number, code: string) {
    return db
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
  },
};
