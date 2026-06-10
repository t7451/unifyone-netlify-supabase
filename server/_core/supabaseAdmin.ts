/**
 * server/_core/supabaseAdmin.ts — shared server-side Supabase client.
 *
 * Supabase is the supplementary credit-metering + Stripe billing layer
 * (credit_balances, credit_usage_events, credit_overage_queue,
 * stripe_products/prices/subscriptions, subscription_tiers, and the
 * consume_credits_with_meter RPC). The primary application database is
 * Neon via Drizzle (DATABASE_URL). See docs/DATABASE_ARCHITECTURE.md.
 *
 * Uses the secret (server-only) key, so RLS is bypassed — never expose
 * this client to request-scoped user input without explicit filtering.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _client: SupabaseClient | null = null;

/**
 * Returns the shared admin client, or null when Supabase is not
 * configured (callers degrade gracefully — credits/billing become
 * no-ops in dev environments without Supabase).
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_client) return _client;
  const url = ENV.supabaseUrl;
  const key = ENV.supabaseSecretKey;
  if (!url || !key) return null;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}
