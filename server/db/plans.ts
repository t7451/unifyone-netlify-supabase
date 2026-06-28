import { eq } from "drizzle-orm";
import { plans } from "../../drizzle/schema";
import { getDb } from "./connection";

// ── Plans ─────────────────────────────────────────────────────────────────────
export async function getPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plans).where(eq(plans.isActive, true));
}

export async function getPlanBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, slug))
    .limit(1);
  return result[0];
}
