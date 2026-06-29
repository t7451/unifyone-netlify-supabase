import { and, desc, eq } from "drizzle-orm";
import { InsertTenant, tenants } from "../../drizzle/schema";
import { getDb } from "./connection";

// ── Tenants ───────────────────────────────────────────────────────────────────
export async function createTenant(data: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(tenants).values(data).returning();
  return result[0];
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  return result[0];
}

/**
 * Lightweight lookup of a tenant's primary product ("gig" | "commerce").
 * Used by hot paths (auth.me, operatorProcedure) that only need this flag —
 * avoids fetching the full tenant row. Returns "gig" (the default) when the
 * tenant or DB is unavailable, so gig-operator behavior is the safe fallback.
 */
export async function getTenantPrimaryProduct(
  id: number
): Promise<"gig" | "commerce"> {
  const db = await getDb();
  if (!db) return "gig";
  const result = await db
    .select({ primaryProduct: tenants.primaryProduct })
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  return result[0]?.primaryProduct ?? "gig";
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  return result[0];
}

export async function getTenantsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).where(eq(tenants.ownerId, ownerId));
}

export async function updateTenant(
  id: number,
  data: Partial<InsertTenant>,
  ownerId?: number
) {
  const db = await getDb();
  if (!db) return;
  const condition =
    ownerId !== undefined
      ? and(eq(tenants.id, id), eq(tenants.ownerId, ownerId))
      : eq(tenants.id, id);
  await db.update(tenants).set(data).where(condition);
}

export async function getTenantByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return result[0];
}

export async function getAllTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}
