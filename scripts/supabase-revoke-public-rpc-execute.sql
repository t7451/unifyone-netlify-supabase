-- supabase-revoke-public-rpc-execute.sql
--
-- Security hardening: the credit/subscription SECURITY DEFINER functions are
-- called server-side only (server/creditMeter.ts, billing.ts, stripe.ts) via
-- the Supabase service-role key. By default Postgres grants EXECUTE to PUBLIC,
-- which the `anon` and `authenticated` PostgREST roles inherit — meaning anyone
-- could POST /rest/v1/rpc/add_credits unauthenticated and mint credits.
--
-- This revokes EXECUTE from PUBLIC/anon/authenticated and re-grants only to
-- service_role. Clears Supabase advisors 0028/0029.
--
-- Applied via MCP migration `revoke_public_execute_credit_rpcs` on 2026-06-13.

REVOKE EXECUTE ON FUNCTION public.add_credits(text, numeric, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_credits(text, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_credits_with_meter(text, numeric, text, text, integer, integer, integer, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_usage_summary(text, timestamp with time zone) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription_tier(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_subscription_credits(text, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.add_credits(text, numeric, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_credits(text, integer, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_credits_with_meter(text, numeric, text, text, integer, integer, integer, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_usage_summary(text, timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_tier(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_subscription_credits(text, integer, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
