import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { socialPosts } from "../../../drizzle/schema";

type SocialPostInsert = typeof socialPosts.$inferInsert;
type SocialPostStatus = (typeof socialPosts.status.enumValues)[number];

export async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

export type Db = Awaited<ReturnType<typeof requireDb>>;

export async function insertPost(db: Db, values: SocialPostInsert) {
  const [result] = await db.insert(socialPosts).values(values).returning();
  return result;
}

export async function listPosts(
  db: Db,
  tenantId: number,
  status: SocialPostStatus | "all",
  limit: number
) {
  const conditions = [eq(socialPosts.tenantId, tenantId)];
  if (status !== "all") {
    conditions.push(eq(socialPosts.status, status));
  }

  return db
    .select()
    .from(socialPosts)
    .where(and(...conditions))
    .orderBy(desc(socialPosts.createdAt))
    .limit(limit);
}

export async function deletePost(db: Db, postId: number, tenantId: number) {
  await db
    .delete(socialPosts)
    .where(and(eq(socialPosts.id, postId), eq(socialPosts.tenantId, tenantId)));
}

export async function listPostsForTenant(db: Db, tenantId: number) {
  return db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.tenantId, tenantId));
}
