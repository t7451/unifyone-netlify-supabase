/**
 * server/payments/square/sync.ts
 *
 * Square business logic: hosted-checkout link creation, order-metadata
 * lookup, and applying verified webhook events to our state (payment +
 * subscription sync, Impact conversion). Relocated verbatim from
 * server/square.ts (no behavior change). All tenant-scoped writes preserve
 * their original filters and side-effect order.
 */
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { logger } from "../../_core/logger";
import { errMsg } from "../../_core/errors";
import { getDb } from "../../db";
import { orders, tenants } from "../../../drizzle/schema";
import { getSquareClient } from "./client";
import { resolveTenantForSquare, type SquareWebhookEvent } from "./repo";

// ─── Square checkout link creation ─────────────────────────────────────────
export interface CreateSquareCheckoutInput {
  amount: number;
  currency?: string;
  description?: string;
  internalOrderId?: number | string | null;
  tenantId?: number | null;
  userId?: number | null;
  imClickId?: string | null;
  redirectUrl: string;
}

export async function createSquareCheckout(
  input: CreateSquareCheckoutInput
): Promise<{
  checkoutUrl: string;
  paymentLinkId: string;
  squareOrderId: string;
}> {
  const client = getSquareClient();
  if (!client) throw new Error("Square not configured");
  if (!process.env.SQUARE_LOCATION_ID) {
    throw new Error("SQUARE_LOCATION_ID not configured");
  }

  const amountMoney = BigInt(Math.round(input.amount * 100));
  const idempotencyKey = crypto.randomUUID();

  const metadata: Record<string, string> = {};
  if (input.internalOrderId)
    metadata.internal_order_id = String(input.internalOrderId);
  if (input.tenantId) metadata.tenant_id = String(input.tenantId);
  if (input.userId) metadata.user_id = String(input.userId);
  if (input.imClickId) metadata.im_click_id = input.imClickId;

  const response = await client.checkout.paymentLinks.create({
    idempotencyKey,
    order: {
      locationId: process.env.SQUARE_LOCATION_ID,
      lineItems: [
        {
          name: input.description || "UnifyOne Order",
          quantity: "1",
          basePriceMoney: {
            amount: amountMoney,
            currency: (input.currency || "USD").toUpperCase() as
              | "USD"
              | "CAD"
              | "GBP"
              | "JPY"
              | "EUR"
              | "AUD",
          },
        },
      ],
      metadata: Object.keys(metadata).length ? metadata : undefined,
    },
    checkoutOptions: {
      redirectUrl: input.redirectUrl,
    },
  });

  const link = response.paymentLink;
  if (!link?.url) throw new Error("Square did not return a checkout URL");
  return {
    checkoutUrl: link.url,
    paymentLinkId: link.id ?? "",
    squareOrderId: link.orderId ?? "",
  };
}

// ─── Fetch order metadata from Square (for tenant linking) ─────────────────
async function fetchSquareOrderMetadata(
  orderId: string
): Promise<Record<string, string> | null> {
  const client = getSquareClient();
  if (!client) return null;
  try {
    const resp = await client.orders.get({ orderId });
    const meta = resp.order?.metadata;
    if (!meta) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch (err: unknown) {
    logger.warn("[Square] fetchSquareOrderMetadata failed", {
      error: errMsg(err),
      orderId,
    });
    return null;
  }
}

// ─── Apply a verified webhook event to our state ───────────────────────────
export async function applySquareEvent(
  event: SquareWebhookEvent
): Promise<void> {
  const t = event.type || "";
  const db = await getDb();
  if (!db) return;

  if (t === "payment.created" || t === "payment.updated") {
    const payment = event.data?.object?.payment;
    if (!payment?.id || !payment.status) return;

    // Square doesn't put metadata directly on the payment in webhooks; pull
    // the order to resolve the tenant.
    let metadata: Record<string, string> | null = null;
    if (payment.order_id) {
      metadata = await fetchSquareOrderMetadata(payment.order_id);
    }
    const internalOrderId = metadata?.internal_order_id
      ? parseInt(metadata.internal_order_id, 10)
      : null;
    const tenantIdMeta = metadata?.tenant_id
      ? parseInt(metadata.tenant_id, 10)
      : null;
    const userIdMeta = metadata?.user_id
      ? parseInt(metadata.user_id, 10)
      : null;
    const imClickId = metadata?.im_click_id ?? null;

    const tenant = await resolveTenantForSquare({
      internalOrderId,
      tenantId: tenantIdMeta,
      userId: userIdMeta,
    });

    if (payment.status === "COMPLETED" && internalOrderId && tenant) {
      await db
        .update(orders)
        .set({
          paymentStatus: "paid",
          paymentMethod: "square",
          squarePaymentId: payment.id,
          squareOrderId: payment.order_id ?? null,
        })
        .where(
          and(eq(orders.id, internalOrderId), eq(orders.tenantId, tenant.id))
        );

      // Fire Impact conversion. Idempotent on stripeSessionId =
      // "square_<paymentId>".
      try {
        const { fireImpactConversion } = await import("../../_core/impact");
        const cents = payment.amount_money?.amount ?? 0;
        if (cents > 0) {
          await fireImpactConversion(db, {
            stripeSessionId: `square_${payment.id}`,
            amountCents: cents,
            currency: (payment.amount_money?.currency || "USD").toUpperCase(),
            clickId: imClickId,
            userId: userIdMeta ?? null,
          });
        }
      } catch (err: unknown) {
        logger.warn("[Square] Impact conversion fire failed", {
          error: errMsg(err),
        });
      }
    } else if (payment.status === "FAILED" && internalOrderId && tenant) {
      await db
        .update(orders)
        .set({
          paymentStatus: "failed",
          paymentMethod: "square",
          squarePaymentId: payment.id,
        })
        .where(
          and(eq(orders.id, internalOrderId), eq(orders.tenantId, tenant.id))
        );
    }
  } else if (t === "subscription.created" || t === "subscription.updated") {
    const sub = event.data?.object?.subscription;
    if (!sub) return;
    const meta = sub.metadata ?? {};
    const tenant = await resolveTenantForSquare({
      internalOrderId: null,
      tenantId: meta.tenant_id ? parseInt(meta.tenant_id, 10) : null,
      userId: meta.user_id ? parseInt(meta.user_id, 10) : null,
    });
    if (!tenant) return;
    const status = sub.status ?? "";
    if (status === "ACTIVE") {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "active" })
        .where(eq(tenants.id, tenant.id));
    } else if (status === "CANCELED" || status === "DEACTIVATED") {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "cancelled" })
        .where(eq(tenants.id, tenant.id));
    } else if (status === "PAUSED" || status === "PAST_DUE") {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "past_due" })
        .where(eq(tenants.id, tenant.id));
    }
  }
}
