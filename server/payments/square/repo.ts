/**
 * server/payments/square/repo.ts
 *
 * DB access for the Square integration. Wraps the existing ../../db helpers
 * and Drizzle tables; relocated verbatim from server/square.ts (no behavior
 * change). All tenant-scoped writes preserve their original filters.
 */
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "../../_core/sdk";
import { logger } from "../../_core/logger";
import { errMsg } from "../../_core/errors";
import { getDb, getTenantById, getTenantsByOwner } from "../../db";
import { orders, squareWebhookEvents, users } from "../../../drizzle/schema";

// ─── Webhook event shape (shared across transport + business layers) ───────
export type SquareWebhookEvent = {
  type?: string;
  event_id?: string;
  merchant_id?: string;
  created_at?: string;
  data?: {
    type?: string;
    id?: string;
    object?: {
      payment?: {
        id?: string;
        status?: string;
        order_id?: string;
        amount_money?: { amount?: number; currency?: string };
        receipt_email?: string;
      };
      order?: {
        id?: string;
        location_id?: string;
        metadata?: Record<string, string>;
      };
      subscription?: {
        id?: string;
        status?: string;
        location_id?: string;
        customer_id?: string;
        metadata?: Record<string, string>;
      };
    };
  };
};

// ─── Auth helper (mirrors stripe.ts authedUserFromRequest) ─────────────────
export async function authedUserFromRequest(input: {
  headers: Headers | Record<string, string | string[] | undefined>;
}): Promise<{ userId: number; tenantId: number | null; email: string } | null> {
  try {
    let cookieHeader = "";
    if (input.headers instanceof Headers) {
      cookieHeader = input.headers.get("cookie") || "";
    } else if (input.headers && typeof input.headers === "object") {
      const v = (input.headers as Record<string, unknown>)["cookie"];
      cookieHeader = Array.isArray(v) ? v.join("; ") : (v as string) || "";
    }
    const m = cookieHeader.match(
      new RegExp("(?:^|;\\s*)" + COOKIE_NAME + "=([^;]+)")
    );
    if (!m) return null;
    const token = decodeURIComponent(m[1]);
    const session = await sdk.verifySession(token);
    if (!session) return null;
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.openId, session.openId))
      .limit(1);
    const u = rows[0];
    if (!u) return null;
    return {
      userId: u.id,
      tenantId: u.tenantId ?? null,
      email: u.email ?? session.email ?? "",
    };
  } catch (err: unknown) {
    logger.warn("[Square] authedUserFromRequest failed", {
      error: errMsg(err),
    });
    return null;
  }
}

// ─── Tenant resolution from Square metadata ────────────────────────────────
export async function resolveTenantForSquare(input: {
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

// ─── Webhook persistence ───────────────────────────────────────────────────
export async function recordSquareWebhookEvent(
  event: SquareWebhookEvent,
  status: "received" | "processed" | "failed",
  errorMessage?: string
): Promise<void> {
  if (!event?.event_id || !event.type) return;
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(squareWebhookEvents)
      .values({
        eventId: event.event_id,
        eventType: event.type,
        status,
        errorMessage: errorMessage ?? null,
        livemode: process.env.SQUARE_ENVIRONMENT !== "sandbox",
        payload: event as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: squareWebhookEvents.eventId,
        set: {
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        },
      });
  } catch (err: unknown) {
    logger.error("[Square Webhook] Failed to record event", {
      error: errMsg(err),
    });
  }
}
