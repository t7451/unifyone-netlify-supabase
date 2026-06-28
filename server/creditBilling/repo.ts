/**
 * server/creditBilling/repo.ts — Data-access layer for credit metering and
 * credit top-up billing.
 *
 * This is the ONLY layer that talks to Supabase (via the shared admin client
 * in server/_core/supabaseAdmin.ts) and to Stripe invoice items (via the
 * shared client in server/_core/stripeClient.ts). The Supabase atomic
 * `consume_credits_with_meter()` RPC and the overage-queue behavior are
 * load-bearing — the calls here are byte-identical to the original
 * creditMeter.ts / billing.ts implementations.
 */
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe as getSharedStripe } from "../_core/stripeClient";
import { getSupabaseAdmin } from "../_core/supabaseAdmin";

// ── Clients ───────────────────────────────────────────────────────────
export function getSupabase(): SupabaseClient | null {
  return getSupabaseAdmin();
}

let _stripe: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  _stripe = getSharedStripe();
  return _stripe;
}

/** Billing uses the same shared Supabase admin client. */
export function getBillingDb(): SupabaseClient | null {
  return getSupabaseAdmin();
}

// ── Credit metering data-access ───────────────────────────────────────
/** Atomically debit credits + queue overage via the load-bearing RPC. */
export function consumeCreditsWithMeter(
  supabase: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    source: string;
    action: string;
    costCents: number | null;
    tokensIn: number | null;
    tokensOut: number | null;
    model: string | null;
    tenantId: string | null;
    requestId: string | null;
    metadata: Record<string, unknown>;
  }
) {
  return supabase.rpc("consume_credits_with_meter", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_source: params.source,
    p_action: params.action,
    p_cost_cents: params.costCents,
    p_tokens_in: params.tokensIn,
    p_tokens_out: params.tokensOut,
    p_model: params.model,
    p_tenant_id: params.tenantId,
    p_request_id: params.requestId,
    p_metadata: params.metadata,
  });
}

/** Pending overage-queue rows for a single user, oldest first. */
export function fetchPendingOverages(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("credit_overage_queue")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
}

/** Look up the Stripe customer id from the user's active subscription. */
export function fetchActiveSubscriptionCustomer(
  supabase: SupabaseClient,
  userId: string
) {
  return supabase
    .from("stripe_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"])
    .maybeSingle();
}

/** Distinct user ids that still have pending overage-queue rows. */
export function fetchPendingOverageUserIds(supabase: SupabaseClient) {
  return supabase
    .from("credit_overage_queue")
    .select("user_id")
    .eq("status", "pending");
}

/** Mark an overage-queue row as reported with its Stripe invoice-item id. */
export function markOverageReported(
  supabase: SupabaseClient,
  rowId: string,
  invoiceItemId: string
) {
  return supabase
    .from("credit_overage_queue")
    .update({
      status: "reported",
      stripe_invoice_item_id: invoiceItemId,
      reported_at: new Date().toISOString(),
    })
    .eq("id", rowId);
}

/** Stamp the usage event with the Stripe invoice-item id. */
export function stampUsageEventInvoiceItem(
  supabase: SupabaseClient,
  usageEventId: string,
  invoiceItemId: string
) {
  return supabase
    .from("credit_usage_events")
    .update({ stripe_invoice_item_id: invoiceItemId })
    .eq("id", usageEventId);
}

/** Mark an overage-queue row as failed with the error message. */
export function markOverageFailed(
  supabase: SupabaseClient,
  rowId: string,
  error: string
) {
  return supabase
    .from("credit_overage_queue")
    .update({ status: "failed", error })
    .eq("id", rowId);
}

// ── Credit top-up billing data-access ─────────────────────────────────
/** Whether a Stripe event has already been recorded (idempotency check). */
export function findStripeEvent(supabase: SupabaseClient, eventId: string) {
  return supabase
    .from("stripe_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
}

/** Record a processed Stripe event (idempotency ledger). */
export function insertStripeEvent(
  supabase: SupabaseClient,
  row: {
    id: string;
    type: string;
    user_id: string | null;
    payload: unknown;
  }
) {
  return supabase.from("stripe_events").insert(row);
}

/** Add purchased credits to a user's wallet via the Supabase RPC. */
export function addCredits(
  supabase: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    type: string;
    description: string;
    referenceType: string;
    referenceId: string;
  }
) {
  return supabase.rpc("add_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_type: params.type,
    p_description: params.description,
    p_reference_type: params.referenceType,
    p_reference_id: params.referenceId,
  });
}

/** Record a paid billing invoice for the credit purchase. */
export function insertBillingInvoice(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    stripe_session_id: string;
    stripe_payment_intent_id: string | null;
    stripe_customer_id: string | null;
    amount_usd: number;
    credits_purchased: number;
    credits_bonus: number;
    package_id: string | undefined;
    status: string;
    paid_at: string;
  }
) {
  return supabase.from("billing_invoices").insert(row);
}

/** Fetch recent credit transactions (history view). */
export function fetchCreditTransactions(
  supabase: SupabaseClient,
  userId: string,
  limit: number
) {
  return supabase
    .from("credit_transactions")
    .select(
      "id, amount, balance_after, type, description, reference_type, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

/** Fetch the user's credit wallet balance summary. */
export function fetchCreditWallet(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("credit_wallets")
    .select("balance, lifetime_credits, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
}

/** Create a Stripe invoice item for a reported overage. */
export function createOverageInvoiceItem(
  stripe: Stripe,
  params: {
    customer: string;
    amountCents: number;
    description: string;
    metadata: {
      usage_event_id: string;
      overage_queue_id: string;
      user_id: string;
    };
  }
) {
  return stripe.invoiceItems.create({
    customer: params.customer,
    amount: params.amountCents,
    currency: "usd",
    description: params.description,
    metadata: params.metadata,
  });
}
