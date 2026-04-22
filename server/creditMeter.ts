/**
 * server/creditMeter.ts — Unified credit metering for the UnifyOne ecosystem.
 *
 * Every credit-consuming action — MCP tool calls, AI completions,
 * image generation, document chat, governance decisions, money-manager
 * computations, storefront operations — flows through this module so
 * that:
 *
 *   1. Usage is logged to Supabase `credit_usage_events` (full audit)
 *   2. Balance is atomically debited via `consume_credits_with_meter` RPC
 *      (FOR UPDATE row lock, no race conditions)
 *   3. Overages beyond the subscription allotment are queued in
 *      `credit_overage_queue` for Stripe invoice-item reporting
 *   4. Queued overages are flushed to Stripe as invoice items on the
 *      user's active subscription (becomes a line on the next invoice)
 *
 * Usage:
 *
 *   import { meterCredits, CreditSource } from "./creditMeter";
 *
 *   const result = await meterCredits({
 *     userId: ctx.user.id,
 *     amount: 1.5,
 *     source: "ai_chat",
 *     action: "ai.chat",
 *     tokensIn: usage.prompt_tokens,
 *     tokensOut: usage.completion_tokens,
 *     model: "gemini-2.5-flash",
 *   });
 *
 *   if (!result.success) throw new Error(result.error);
 */
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { errMsg } from "./_core/errors";
import { getStripe as getSharedStripe } from "./_core/stripeClient";

// ── Types ─────────────────────────────────────────────────────────────
export type CreditSource =
  | "mcp_tool"
  | "ai_chat"
  | "ai_completion"
  | "image_generation"
  | "document_chat"
  | "governance"
  | "money_manager"
  | "automation"
  | "integration"
  | "storefront"
  | "api"
  | "manual";

export interface MeterCreditsInput {
  userId: string | number;
  amount: number;
  source: CreditSource;
  action: string;
  costCents?: number;
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
  tenantId?: string | number;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface MeterCreditsResult {
  success: boolean;
  balanceAfter: number;
  overageCredits: number;
  eventId: string | null;
  error?: string;
}

// ── Cost model ────────────────────────────────────────────────────────
// Baseline credit costs for each action source. Fine-tune these as
// your usage economics evolve. Values are in fractional credits.
export const CREDIT_COST_MODEL: Record<CreditSource, number> = {
  mcp_tool: 0.25,
  ai_chat: 1.0,
  ai_completion: 1.0,
  image_generation: 5.0,
  document_chat: 2.0,
  governance: 0.5,
  money_manager: 0.1,
  automation: 0.1,
  integration: 0.1,
  storefront: 0.05,
  api: 0.05,
  manual: 0,
};

/**
 * Convert LLM token usage into a credit amount.
 * Heuristic: 1 credit = ~1k tokens (adjust as pricing changes).
 */
export function tokensToCredits(tokensIn = 0, tokensOut = 0): number {
  const total = tokensIn + tokensOut * 2; // completion tokens cost 2x
  return Math.max(0.1, Math.round((total / 1000) * 100) / 100);
}

// ── Clients ───────────────────────────────────────────────────────────
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  _stripe = getSharedStripe();
  return _stripe;
}

// ── Core: meterCredits ────────────────────────────────────────────────
/**
 * Meter a credit consumption event. Logs, atomically debits, and
 * queues any overage for Stripe billing.
 */
export async function meterCredits(
  input: MeterCreditsInput
): Promise<MeterCreditsResult> {
  const supabase = getSupabase();
  const userId = String(input.userId);
  const tenantId = input.tenantId !== undefined ? String(input.tenantId) : null;

  // Structured log line — makes every consumption visible in Netlify
  // function logs, Datadog, CloudWatch, etc.
  const logPayload = {
    event: "credit.consume",
    user_id: userId,
    tenant_id: tenantId,
    source: input.source,
    action: input.action,
    amount: input.amount,
    cost_cents: input.costCents,
    tokens_in: input.tokensIn,
    tokens_out: input.tokensOut,
    model: input.model,
    request_id: input.requestId,
  };
  console.log("[CreditMeter]", JSON.stringify(logPayload));

  if (!supabase) {
    // Supabase not configured — log but don't block execution in dev
    console.warn("[CreditMeter] Supabase not configured, skipping meter");
    return {
      success: true,
      balanceAfter: 0,
      overageCredits: 0,
      eventId: null,
    };
  }

  const { data, error } = await supabase.rpc("consume_credits_with_meter", {
    p_user_id: userId,
    p_amount: input.amount,
    p_source: input.source,
    p_action: input.action,
    p_cost_cents: input.costCents ?? null,
    p_tokens_in: input.tokensIn ?? null,
    p_tokens_out: input.tokensOut ?? null,
    p_model: input.model ?? null,
    p_tenant_id: tenantId,
    p_request_id: input.requestId ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[CreditMeter] RPC failed:", error.message);
    return {
      success: false,
      balanceAfter: 0,
      overageCredits: 0,
      eventId: null,
      error: error.message,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      success: false,
      balanceAfter: 0,
      overageCredits: 0,
      eventId: null,
      error: "No result from consume_credits_with_meter",
    };
  }

  const result: MeterCreditsResult = {
    success: !!row.success,
    balanceAfter: Number(row.balance_after ?? 0),
    overageCredits: Number(row.overage_credits ?? 0),
    eventId: row.event_id ?? null,
    error: row.error_message ?? undefined,
  };

  // Fire-and-forget: trigger background function to flush overages async
  // Hands off to a 15-min background worker instead of blocking the sync function
  if (result.success && result.overageCredits > 0) {
    flushUserOverages(userId).catch(err =>
      console.error("[CreditMeter] Flush error:", errMsg(err))
    );
  }

  return result;
}

// ── Stripe overage flush ──────────────────────────────────────────────
/**
 * Flush pending overage queue entries for a specific user to Stripe
 * as invoice items. They attach to the user's next subscription
 * invoice automatically.
 */
export async function flushUserOverages(
  userId: string
): Promise<{ reported: number; failed: number }> {
  const supabase = getSupabase();
  const stripe = getStripe();
  if (!supabase || !stripe) return { reported: 0, failed: 0 };

  // Get pending overage rows
  const { data: pending, error } = await supabase
    .from("credit_overage_queue")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !pending || pending.length === 0) {
    return { reported: 0, failed: 0 };
  }

  // Look up the Stripe customer ID from the active subscription
  const { data: sub } = await supabase
    .from("stripe_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"])
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    console.warn(`[CreditMeter] No Stripe customer for user ${userId}`);
    return { reported: 0, failed: pending.length };
  }

  let reported = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      const item = await stripe.invoiceItems.create({
        customer: sub.stripe_customer_id,
        amount: row.amount_cents,
        currency: "usd",
        description: `Credit overage: ${row.overage_credits} credits @ $${(row.overage_rate_cents / 100).toFixed(2)}/credit`,
        metadata: {
          usage_event_id: row.usage_event_id,
          overage_queue_id: row.id,
          user_id: userId,
        },
      });

      await supabase
        .from("credit_overage_queue")
        .update({
          status: "reported",
          stripe_invoice_item_id: item.id,
          reported_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      // Also stamp the usage event with the invoice item id
      if (row.usage_event_id) {
        await supabase
          .from("credit_usage_events")
          .update({ stripe_invoice_item_id: item.id })
          .eq("id", row.usage_event_id);
      }

      console.log(
        `[CreditMeter] Reported overage: user=${userId} credits=${row.overage_credits} cents=${row.amount_cents} item=${item.id}`
      );
      reported++;
    } catch (err: unknown) {
      console.error(
        `[CreditMeter] Failed to report overage ${row.id}:`,
        errMsg(err)
      );
      await supabase
        .from("credit_overage_queue")
        .update({ status: "failed", error: errMsg(err) })
        .eq("id", row.id);
      failed++;
    }
  }

  return { reported, failed };
}

/**
 * Flush ALL pending overages (called by scheduled job / admin endpoint).
 */
export async function flushAllOverages(): Promise<{
  users: number;
  reported: number;
  failed: number;
}> {
  const supabase = getSupabase();
  if (!supabase) return { users: 0, reported: 0, failed: 0 };

  const { data } = await supabase
    .from("credit_overage_queue")
    .select("user_id")
    .eq("status", "pending");

  const userIds = Array.from(new Set((data ?? []).map(r => r.user_id)));
  let totalReported = 0;
  let totalFailed = 0;

  for (const uid of userIds) {
    const res = await flushUserOverages(uid);
    totalReported += res.reported;
    totalFailed += res.failed;
  }

  return {
    users: userIds.length,
    reported: totalReported,
    failed: totalFailed,
  };
}

// ── Convenience wrapper: meter a function call ────────────────────────
/**
 * Wrap an async function so it automatically meters credits on
 * successful execution. Throws if metering fails and credits are
 * insufficient.
 *
 *   const result = await withCreditMeter(
 *     { userId, source: "ai_chat", action: "ai.chat" },
 *     async () => invokeLLM({ messages })
 *   );
 */
export async function withCreditMeter<T>(
  cfg: Omit<MeterCreditsInput, "amount"> & { amount?: number },
  fn: () => Promise<T>
): Promise<T> {
  const amount = cfg.amount ?? CREDIT_COST_MODEL[cfg.source] ?? 0.1;
  const result = await meterCredits({ ...cfg, amount });
  if (!result.success) {
    throw new Error(
      `Credit metering failed: ${result.error ?? "Insufficient credits"}`
    );
  }
  return fn();
}
