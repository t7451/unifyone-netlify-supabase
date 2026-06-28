/**
 * server/payments/paypal/repo.ts
 *
 * DB access for the PayPal integration — wraps the shared Drizzle helpers in
 * ../../db. Relocated verbatim from server/paypal.ts; identical queries,
 * identical side-effect order. No business logic lives here.
 */
import { eq, and, desc } from "drizzle-orm";
import { logger } from "../../_core/logger";
import { errMsg } from "../../_core/errors";
import {
  getDb,
  getOrderById,
  getTenantById,
  getTenantsByOwner,
} from "../../db";
import {
  orders,
  paypalWebhookEvents,
  tenants,
  users,
} from "../../../drizzle/schema";
import { PAYPAL_BASE } from "./client";
import type { PayPalWebhookEvent } from "./webhooks";

/** Resolve the tenant that owns this PayPal capture using:
 *   1. internalOrderId → orders.tenantId
 *   2. customId.tid    → tenants by id
 *   3. customId.uid    → tenants by owner
 * Mirrors stripe.ts:resolveTenantForCheckout.
 */
export async function resolveTenantForPayPal(input: {
  internalOrderId: number | null;
  tenantId: number | null;
  userId: number | null;
}): Promise<{ id: number } | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  if (input.internalOrderId) {
    const [row] = await db
      .select({ tenantId: orders.tenantId })
      .from(orders)
      .where(eq(orders.id, input.internalOrderId))
      .limit(1);
    if (row?.tenantId) return { id: row.tenantId };
  }
  if (input.tenantId) {
    const t = await getTenantById(input.tenantId);
    if (t) return { id: t.id };
  }
  if (input.userId) {
    const owned = await getTenantsByOwner(input.userId);
    if (owned[0]) return { id: owned[0].id };
  }
  return undefined;
}

// ─── Webhook event persistence ─────────────────────────────────────────────
export async function recordPayPalWebhookEvent(
  event: PayPalWebhookEvent,
  status: "received" | "processed" | "failed",
  errorMessage?: string
): Promise<void> {
  if (!event?.id || !event.event_type) return;
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(paypalWebhookEvents)
      .values({
        eventId: event.id,
        eventType: event.event_type,
        status,
        errorMessage: errorMessage ?? null,
        livemode: !PAYPAL_BASE.includes("sandbox"),
        payload: event as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: paypalWebhookEvents.eventId,
        set: {
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        },
      });
  } catch (err: unknown) {
    logger.error("[PayPal Webhook] Failed to record event", {
      error: errMsg(err),
    });
  }
}

// Re-export the shared schema/db symbols the other layers need so the
// transport/business modules don't reach past this repository layer.
export {
  eq,
  and,
  desc,
  getDb,
  getOrderById,
  orders,
  paypalWebhookEvents,
  tenants,
  users,
};
