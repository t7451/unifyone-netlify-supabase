/**
 * server/payments/paypal/sync.ts
 *
 * Business layer for the PayPal integration: order create/capture against the
 * PayPal REST API, custom_id (de)coding, and applying a verified webhook event
 * to our own state (order + subscription sync). Relocated verbatim from
 * server/paypal.ts — identical PayPal API calls, identical DB writes and
 * side-effect order.
 */
import { logger } from "../../_core/logger";
import { errMsg } from "../../_core/errors";
import { PAYPAL_BASE, getPayPalAccessToken } from "./client";
import {
  eq,
  and,
  getDb,
  orders,
  tenants,
  resolveTenantForPayPal,
} from "./repo";
import type { PayPalWebhookEvent } from "./webhooks";

export interface CreatePayPalOrderInput {
  amount: number;
  currency?: string;
  description?: string;
  internalOrderId?: string | number | null;
  tenantId?: number | null;
  userId?: number | null;
  userEmail?: string | null;
  imClickId?: string | null;
  returnUrl: string;
  cancelUrl: string;
}

export async function createPayPalOrder(
  params: CreatePayPalOrderInput
): Promise<{
  id: string;
  approveUrl: string;
}> {
  const token = await getPayPalAccessToken();
  const currency = params.currency || "USD";
  const amountStr = params.amount.toFixed(2);

  // Pack tenant/user/im_click into custom_id so the webhook + capture step
  // can resolve the right tenant when the internal order row isn't known.
  // PayPal limits custom_id to 127 chars, so we encode compactly.
  const customParts: string[] = [];
  if (params.internalOrderId) customParts.push(`oid=${params.internalOrderId}`);
  if (params.tenantId) customParts.push(`tid=${params.tenantId}`);
  if (params.userId) customParts.push(`uid=${params.userId}`);
  if (params.imClickId) customParts.push(`imc=${params.imClickId}`);
  const customId = customParts.join(";").slice(0, 127);

  const body: Record<string, unknown> = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amountStr,
        },
        description: params.description || "UnifyOne Order",
        ...(customId && { custom_id: customId }),
        reference_id: params.internalOrderId
          ? `unifyone-${params.internalOrderId}`
          : `unifyone-${Date.now()}`,
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
          brand_name: "UnifyOne Commerce",
          locale: "en-US",
          landing_page: "LOGIN",
          user_action: "PAY_NOW",
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
        },
      },
    },
  };

  const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `unifyone-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    },
    body: JSON.stringify(body),
  });

  type PayPalOrderResponse = {
    id: string;
    links?: Array<{ rel: string; href: string }>;
  };
  const data = (await response.json()) as PayPalOrderResponse;

  if (!response.ok) {
    throw new Error(`PayPal create order failed: ${JSON.stringify(data)}`);
  }

  const approveLink = data.links?.find(
    l => l.rel === "payer-action" || l.rel === "approve"
  );

  return {
    id: data.id,
    approveUrl:
      approveLink?.href ||
      `https://www.paypal.com/checkoutnow?token=${data.id}`,
  };
}

export interface PayPalCaptureResult {
  status: string;
  captureId: string;
  amount: string;
  currency: string;
  payerEmail: string | null;
  customId: string | null;
}

export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<PayPalCaptureResult> {
  const token = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `unifyone-cap-${paypalOrderId}`,
      },
    }
  );

  type PayPalCaptureResponse = {
    status?: string;
    payer?: { email_address?: string };
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id?: string;
          amount?: { value?: string; currency_code?: string };
          custom_id?: string;
        }>;
      };
    }>;
  };
  const data = (await response.json()) as PayPalCaptureResponse;

  // PayPal returns 422 ORDER_ALREADY_CAPTURED on a re-capture — surface this
  // as an idempotent success so callers don't need to special-case it.
  if (!response.ok) {
    const dataStr = JSON.stringify(data);
    if (dataStr.includes("ORDER_ALREADY_CAPTURED")) {
      // Refetch the order to learn what the prior capture actually was.
      const getResp = await fetch(
        `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const getData = (await getResp.json()) as PayPalCaptureResponse;
      const cap = getData.purchase_units?.[0]?.payments?.captures?.[0];
      return {
        status: getData.status ?? "COMPLETED",
        captureId: cap?.id || "",
        amount: cap?.amount?.value || "0",
        currency: cap?.amount?.currency_code || "USD",
        payerEmail: getData.payer?.email_address || null,
        customId: cap?.custom_id || null,
      };
    }
    throw new Error(`PayPal capture failed: ${dataStr}`);
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: data.status ?? "",
    captureId: capture?.id || "",
    amount: capture?.amount?.value || "0",
    currency: capture?.amount?.currency_code || "USD",
    payerEmail: data.payer?.email_address || null,
    customId: capture?.custom_id || null,
  };
}

/**
 * Parse the encoded custom_id we stamped at create time:
 *   "oid=42;tid=7;uid=99;imc=abc"
 * Unknown / missing keys are returned as null.
 */
export function parseCustomId(customId: string | null | undefined): {
  internalOrderId: number | null;
  tenantId: number | null;
  userId: number | null;
  imClickId: string | null;
} {
  if (!customId) {
    return {
      internalOrderId: null,
      tenantId: null,
      userId: null,
      imClickId: null,
    };
  }
  const parts = customId.split(";");
  const get = (key: string): string | null => {
    for (const p of parts) {
      const eq = p.indexOf("=");
      if (eq > 0 && p.slice(0, eq) === key) return p.slice(eq + 1);
    }
    return null;
  };
  const num = (s: string | null): number | null => {
    if (s == null) return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    internalOrderId: num(get("oid")),
    tenantId: num(get("tid")),
    userId: num(get("uid")),
    imClickId: get("imc"),
  };
}

// ─── Apply a verified webhook event to our state ───────────────────────────
export async function applyPayPalEvent(
  event: PayPalWebhookEvent
): Promise<void> {
  const t = event.event_type || "";
  const resource = event.resource || {};
  const db = await getDb();
  if (!db) return;

  if (t === "PAYMENT.CAPTURE.COMPLETED" || t === "PAYMENT.CAPTURE.DENIED") {
    const meta = parseCustomId(resource.custom_id);
    const tenant = await resolveTenantForPayPal(meta);
    const captureId = resource.id || "";
    const paypalOrderId =
      resource.supplementary_data?.related_ids?.order_id || "";

    if (meta.internalOrderId) {
      await db
        .update(orders)
        .set({
          paymentStatus: t === "PAYMENT.CAPTURE.COMPLETED" ? "paid" : "failed",
          paymentMethod: "paypal",
          ...(paypalOrderId && { paypalOrderId }),
        })
        .where(
          tenant
            ? and(
                eq(orders.id, meta.internalOrderId),
                eq(orders.tenantId, tenant.id)
              )
            : eq(orders.id, meta.internalOrderId)
        );
    }

    if (t === "PAYMENT.CAPTURE.COMPLETED" && tenant) {
      // Fire Impact.com conversion (idempotent on stripeSessionId =
      // "paypal_<captureId>"). Non-fatal if the helper isn't configured.
      try {
        const { fireImpactConversion } = await import("../../_core/impact");
        const amountStr = resource.amount?.value || "0";
        const amountCents = Math.round(parseFloat(amountStr) * 100);
        if (amountCents > 0) {
          await fireImpactConversion(db, {
            stripeSessionId: `paypal_${captureId || event.id || Date.now()}`,
            amountCents,
            currency: (resource.amount?.currency_code || "USD").toUpperCase(),
            clickId: meta.imClickId,
            userId: meta.userId,
          });
        }
      } catch (err: unknown) {
        logger.warn("[PayPal] Impact conversion fire failed", {
          error: errMsg(err),
        });
      }
    }
  } else if (
    t === "BILLING.SUBSCRIPTION.ACTIVATED" ||
    t === "BILLING.SUBSCRIPTION.UPDATED"
  ) {
    const meta = parseCustomId(resource.custom_id);
    const tenant = await resolveTenantForPayPal(meta);
    if (tenant && resource.id) {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "active" })
        .where(eq(tenants.id, tenant.id));
    }
  } else if (
    t === "BILLING.SUBSCRIPTION.CANCELLED" ||
    t === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    t === "BILLING.SUBSCRIPTION.EXPIRED"
  ) {
    const meta = parseCustomId(resource.custom_id);
    const tenant = await resolveTenantForPayPal(meta);
    if (tenant) {
      await db
        .update(tenants)
        .set({ subscriptionStatus: "cancelled" })
        .where(eq(tenants.id, tenant.id));
    }
  }
}
