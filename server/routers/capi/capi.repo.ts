import { getDb } from "../../db";
import { metaCapiEvents } from "../../../drizzle/schema";
import { desc } from "drizzle-orm";
import type { CAPIUserData } from "../../meta/capi";

/**
 * Data access for Meta CAPI event records (`meta_capi_events`). Queries are
 * relocated verbatim from the original router.
 */

export async function saveCapiEvent(opts: {
  tenantId: number | null;
  userId: number | null;
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  userData?: CAPIUserData;
  customData?: Record<string, unknown>;
  responseCode?: number;
  responseBody?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(metaCapiEvents).values({
      tenantId: opts.tenantId,
      userId: opts.userId,
      eventName: opts.eventName,
      eventId: opts.eventId,
      eventSourceUrl: opts.eventSourceUrl,
      userData: opts.userData as Record<string, unknown> | undefined,
      customData: opts.customData,
      responseCode: opts.responseCode,
      responseBody: opts.responseBody,
    });
  } catch (err) {
    console.error("[CAPI] Failed to save event record:", err);
  }
}

/** List the 100 most recent CAPI event records (admin). */
export async function listCapiEvents() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(metaCapiEvents)
    .orderBy(desc(metaCapiEvents.sentAt))
    .limit(100);
}
