import { eq } from "drizzle-orm";
import { categories } from "../../drizzle/schema";
import { getDb } from "./connection";

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(categories)
    .where(eq(categories.tenantId, tenantId))
    .orderBy(categories.sortOrder);
}

export async function createCategory(
  tenantId: number,
  name: string,
  slug: string,
  description?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(categories).values({ tenantId, name, slug, description });
}
