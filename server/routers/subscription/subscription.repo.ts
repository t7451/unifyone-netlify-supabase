import { eq } from "drizzle-orm";
import {
  getProductCount,
  getOrderCount,
  getCustomerCount,
  getTenantById,
  getPlans,
  getPlanBySlug,
  getDb,
} from "../../db";
import { plans } from "../../../drizzle/schema";
import { getSupabaseAdmin } from "../../_core/supabaseAdmin";

/**
 * Data access for the subscription router. Neon (Drizzle) reads go through the
 * shared `../../db` helpers; the Supabase-backed credit/billing tables are read
 * via the shared admin client. This layer performs no business logic — callers
 * decide how to interpret empty / null results.
 */

// ── Neon (Drizzle) ──────────────────────────────────────────────────────────

export {
  getProductCount,
  getOrderCount,
  getCustomerCount,
  getTenantById,
  getPlans,
  getPlanBySlug,
};

export async function getPlanRowBySlug(slug: string) {
  const db = await getDb();
  if (!db) return { db: null as null, plan: undefined };
  const planRows = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, slug))
    .limit(1);
  return { db, plan: planRows[0] };
}

export async function getDbOrNull() {
  return getDb();
}

// ── Supabase (credit / billing tables) ───────────────────────────────────────

export function isSupabaseConfigured() {
  return getSupabaseAdmin() !== null;
}

export async function getCreditBalanceRow(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from("credit_balances")
    .select("balance, lifetime_earned, lifetime_spent, last_refill_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function getSubscriptionTierRow(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;
  const { data } = await supabase
    .from("stripe_subscriptions")
    .select(
      `
        id, status, current_period_end,
        stripe_prices!inner(id, unit_amount, interval),
        subscription_tiers!inner(name, monthly_credits, features)
      `
    )
    .eq("user_id", userId)
    .in("status", ["trialing", "active"])
    .maybeSingle();
  return data;
}

export async function listSubscriptionTiers() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from("subscription_tiers")
    .select("*")
    .eq("is_active", true)
    .order("monthly_price_cents", { ascending: true });
  return data ?? [];
}

export async function listCreditUsageEvents(
  userId: string,
  opts: {
    limit: number;
    offset: number;
    source?: string;
    onlyOverages: boolean;
  }
) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  let query = supabase
    .from("credit_usage_events")
    .select(
      "id, source, action, amount_credits, cost_cents, balance_after, tokens_in, tokens_out, model, overage, stripe_invoice_item_id, metadata, created_at",
      { count: "exact" }
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(opts.offset, opts.offset + opts.limit - 1);

  if (opts.source) query = query.eq("source", opts.source);
  if (opts.onlyOverages) query = query.eq("overage", true);

  const { data, count } = await query;
  return { events: data ?? [], total: count ?? 0 };
}

export async function getCreditUsageSummary(userId: string, since: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("credit_usage_summary", {
    p_user_id: userId,
    p_since: since,
  });

  if (error) {
    console.error("[Subscription] usage summary error:", error.message);
    return { summary: [] };
  }
  return { summary: data ?? [] };
}

export async function listPendingOverages(userId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("credit_overage_queue")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  return { pending: data ?? [] };
}
