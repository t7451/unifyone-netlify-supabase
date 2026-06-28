import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { customers } from "../../../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/** Thin data-access wrappers around the shared `getDb()` Drizzle client. */
export const customersRepo = {
  getDb,

  listPage(
    db: Db,
    tenantId: number,
    search: string | undefined,
    page: number,
    limit: number
  ) {
    const where = search
      ? and(
          eq(customers.tenantId, tenantId),
          sql`(${customers.email} ILIKE ${"%" + search + "%"} OR ${customers.firstName} ILIKE ${"%" + search + "%"} OR ${customers.lastName} ILIKE ${"%" + search + "%"})`
        )
      : eq(customers.tenantId, tenantId);

    return Promise.all([
      db
        .select()
        .from(customers)
        .where(where)
        .orderBy(desc(customers.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: count() }).from(customers).where(where),
    ]);
  },

  findByEmail(db: Db, tenantId: number, email: string) {
    return db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.email, email)))
      .limit(1);
  },

  updateById(
    db: Db,
    id: number,
    tenantId: number,
    update: Record<string, unknown>
  ) {
    return db
      .update(customers)
      .set(update)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
  },

  insert(
    db: Db,
    values: {
      tenantId: number;
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      notes?: string;
    }
  ) {
    return db.insert(customers).values(values).returning();
  },
};
