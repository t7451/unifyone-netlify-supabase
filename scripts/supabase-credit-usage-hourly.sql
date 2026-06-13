-- supabase-credit-usage-hourly.sql
--
-- Destination table for the hourly credit-usage aggregation Scheduled
-- Function (netlify/functions/aggregate-credit-stats-scheduled.mts).
--
-- The function rolls up the previous full hour of public.credit_usage_events
-- (summing amount_credits per tenant) and upserts one row per (tenant_id, hour).
-- Without this table the upsert step fails with PostgREST 404/400.
--
-- Applied to the Supabase project via MCP migration `create_credit_usage_hourly`
-- on 2026-06-13. Kept here for source-control parity (Supabase migrations are
-- applied out-of-band; see docs/DATABASE_ARCHITECTURE.md).

CREATE TABLE IF NOT EXISTS public.credit_usage_hourly (
  id          bigserial PRIMARY KEY,
  tenant_id   text NOT NULL,
  hour        timestamptz NOT NULL,
  total_spent numeric(12,4) NOT NULL DEFAULT 0,
  event_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (tenant_id, hour)
);

-- RLS on; the aggregation job uses the service-role key which bypasses RLS.
ALTER TABLE public.credit_usage_hourly ENABLE ROW LEVEL SECURITY;
