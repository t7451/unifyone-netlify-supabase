import { getDb } from "../../db";
import {
  themes,
  themeCategories,
  themeInstalls,
  themeReviews,
} from "../../../drizzle/schema";
import { eq, and, desc, sql, asc } from "drizzle-orm";

/**
 * Data-access layer for the themes marketplace. Wraps the existing ../../db
 * helper and relocates the Drizzle queries from the original router verbatim.
 * getDb() may be null (DB unavailable); the service layer preserves the
 * original per-procedure handling of that case, so getDb is surfaced directly
 * and the query helpers assume a resolved handle.
 */

export { getDb, themes, themeCategories, themeInstalls, themeReviews };

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function selectPublishedThemes(db: Db, limit: number, offset: number) {
  return db
    .select()
    .from(themes)
    .where(eq(themes.status, "published"))
    .limit(limit)
    .offset(offset);
}

export function selectThemeBySlug(db: Db, slug: string) {
  return db.select().from(themes).where(eq(themes.slug, slug)).limit(1);
}

export function selectCategories(db: Db) {
  return db
    .select()
    .from(themeCategories)
    .orderBy(asc(themeCategories.sortOrder));
}

export function selectApprovedReviews(db: Db, themeId: number) {
  return db
    .select()
    .from(themeReviews)
    .where(
      and(
        eq(themeReviews.themeId, themeId),
        eq(themeReviews.status, "approved")
      )
    )
    .orderBy(desc(themeReviews.createdAt))
    .limit(50);
}

export function selectInstall(db: Db, themeId: number, userId: number) {
  return db
    .select()
    .from(themeInstalls)
    .where(
      and(eq(themeInstalls.themeId, themeId), eq(themeInstalls.userId, userId))
    )
    .limit(1);
}

export function selectUserInstalls(db: Db, userId: number) {
  return db
    .select()
    .from(themeInstalls)
    .where(eq(themeInstalls.userId, userId))
    .orderBy(desc(themeInstalls.installedAt));
}

export function selectAllThemes(db: Db) {
  return db.select().from(themes);
}

export function selectPublishedThemeById(db: Db, themeId: number) {
  return db
    .select()
    .from(themes)
    .where(and(eq(themes.id, themeId), eq(themes.status, "published")))
    .limit(1);
}

export function insertInstall(
  db: Db,
  values: {
    themeId: number;
    userId: number;
    tenantId: number | undefined;
    amountPaid: string;
  }
) {
  return db.insert(themeInstalls).values(values);
}

export function bumpInstallCount(db: Db, themeId: number) {
  return db
    .update(themes)
    .set({ installCount: sql`${themes.installCount} + 1` })
    .where(eq(themes.id, themeId));
}

export function insertReview(
  db: Db,
  values: {
    themeId: number;
    userId: number;
    rating: number;
    title: string | null;
    body: string | null;
    status: "pending";
  }
) {
  return db.insert(themeReviews).values(values);
}

export function bumpReviewCount(db: Db, themeId: number) {
  return db
    .update(themes)
    .set({ reviewCount: sql`${themes.reviewCount} + 1` })
    .where(eq(themes.id, themeId));
}

export function insertTheme(db: Db, values: typeof themes.$inferInsert) {
  return db.insert(themes).values(values);
}

export function updateTheme(
  db: Db,
  id: number,
  rest: Partial<typeof themes.$inferInsert>
) {
  return db.update(themes).set(rest).where(eq(themes.id, id));
}

export function setThemeStatus(
  db: Db,
  id: number,
  status: typeof themes.$inferInsert.status
) {
  return db.update(themes).set({ status }).where(eq(themes.id, id));
}

export function selectAllThemesOrdered(db: Db) {
  return db.select().from(themes).orderBy(desc(themes.createdAt));
}

export function selectAllReviews(db: Db) {
  return db.select().from(themeReviews).orderBy(desc(themeReviews.createdAt));
}

export function setReviewStatus(
  db: Db,
  id: number,
  status: "pending" | "approved" | "rejected"
) {
  return db.update(themeReviews).set({ status }).where(eq(themeReviews.id, id));
}

export function insertCategory(
  db: Db,
  values: typeof themeCategories.$inferInsert
) {
  return db.insert(themeCategories).values(values);
}
