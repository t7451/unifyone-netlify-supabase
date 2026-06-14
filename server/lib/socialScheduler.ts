/**
 * Social post scheduling + the shared publish core.
 *
 * `publishStoredPost` is the single place that turns a stored post into a
 * published one: mark published, native-dispatch to connected accounts, and
 * fire the `social.post.published` automation event. Both the tRPC
 * `social.publish` mutation and the scheduled job use it, so manual and
 * scheduled publishing behave identically.
 */
import { and, eq, lte } from "drizzle-orm";
import { getDb } from "../db";
import { socialPosts } from "../../drizzle/schema";
import { fireAutomations } from "./automationDispatch";
import {
  publishToConnectedAccounts,
  type PublishOutcome,
} from "./socialPublisher";

export type PublishStoredResult = {
  success: boolean;
  results: PublishOutcome[];
};

/**
 * Publish a single stored post (tenant-scoped). Marks it published, dispatches
 * to connected accounts, and fires the operator automation event. Best-effort:
 * native-publish failures are returned in `results` but do not throw.
 */
export async function publishStoredPost(
  tenantId: number,
  postId: number,
  opts?: { userId?: number }
): Promise<PublishStoredResult> {
  const db = await getDb();
  if (!db) return { success: false, results: [] };

  await db
    .update(socialPosts)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(socialPosts.id, postId), eq(socialPosts.tenantId, tenantId)));

  let results: PublishOutcome[] = [];
  try {
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));
    if (post) {
      const platforms = Array.isArray(post.platforms)
        ? (post.platforms as string[])
        : [];
      results = await publishToConnectedAccounts(tenantId, platforms, {
        content: post.content ?? "",
        mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls : undefined,
      });
      await fireAutomations(tenantId, "social.post.published", {
        postId: post.id,
        platforms: post.platforms,
        userId: opts?.userId ?? post.userId,
        campaignTag: post.campaignTag,
        content: post.content,
        utmCampaign: post.utmCampaign,
      });

      // Persist the per-target outcomes so the UI can show per-platform status
      // after reload (not just in the live mutation response).
      await db
        .update(socialPosts)
        .set({ publishResults: results, updatedAt: new Date() })
        .where(eq(socialPosts.id, postId));
    }
  } catch {
    /* non-blocking */
  }

  return { success: true, results };
}

/**
 * Publish all scheduled posts whose time has come (scheduledAt <= now). Invoked
 * by the Netlify scheduled function. Returns simple counts for logging.
 */
export async function processScheduledSocialPosts(
  now: Date = new Date()
): Promise<{ processed: number; published: number }> {
  const db = await getDb();
  if (!db) return { processed: 0, published: 0 };

  const due = await db
    .select()
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.status, "scheduled"),
        lte(socialPosts.scheduledAt, now)
      )
    );

  let published = 0;
  for (const post of due) {
    const res = await publishStoredPost(post.tenantId, post.id, {
      userId: post.userId,
    });
    if (res.success) published++;
  }
  return { processed: due.length, published };
}
