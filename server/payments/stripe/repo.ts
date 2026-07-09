/**
 * Stripe data-access layer.
 *
 * Wraps the existing `../../db` helpers, Drizzle schema bindings, and the
 * Supabase admin client so the sync/webhook layers depend on a single DB
 * seam instead of reaching into the ORM directly. These are relocations of
 * the imports/helpers previously inline in server/stripe.ts — identical DB
 * reads/writes, identical side-effect order.
 */
import type Stripe from "stripe";
import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { stripeWebhookEvents } from "../../../drizzle/schema";
import { errMsg } from "../../_core/errors";

// Re-export the shared DB/Supabase accessors and schema so the sync and
// webhook layers import their persistence dependencies from one place.
export {
  getDb,
  getTenantByStripeCustomerId,
  getTenantById,
  getTenantsByOwner,
} from "../../db";
export { getSupabaseAdmin } from "../../_core/supabaseAdmin";
export { stripeWebhookEvents } from "../../../drizzle/schema";

// Persist a webhook event for forensic + idempotency.
export async function recordWebhookEvent(
  event: Stripe.Event,
  status: "received" | "processed" | "failed",
  errorMessage?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(stripeWebhookEvents)
      .values({
        eventId: event.id,
        eventType: event.type,
        status,
        errorMessage: errorMessage ?? null,
        livemode: event.livemode,
        payload: event as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: stripeWebhookEvents.eventId,
        // Never downgrade a row that already reached "processed". Stripe retries
        // the same event id; an unconditional upsert to "received" would reset a
        // processed row, letting the downstream dedup check re-process it and
        // double-apply credits/automation. Once processed, it stays processed.
        set: {
          status: sql`CASE WHEN ${stripeWebhookEvents.status} = 'processed' THEN 'processed' ELSE ${status} END`,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        },
      });
  } catch (err: unknown) {
    console.error("[Stripe Webhook] Failed to record event:", errMsg(err));
  }
}
