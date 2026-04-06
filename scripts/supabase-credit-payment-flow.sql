-- ============================================
-- UnifyOne Credit Payment Flow — Logging & Overage
-- Extends scripts/supabase-stripe-subscriptions.sql
--
-- Every credit consumed anywhere in the UnifyOne platform
-- (MCP tool, AI call, image gen, etc.) is logged to
-- credit_usage_events and atomically deducted from
-- credit_balances. When a user exceeds their plan allotment,
-- the delta is queued in credit_overage_queue for Stripe
-- invoice-item reporting.
-- ============================================

-- ============================================
-- CREDIT USAGE EVENTS (detailed per-event log)
-- One row per metered action. Enables full payment flow audit.
-- ============================================
DO $$ BEGIN
  CREATE TYPE credit_source AS ENUM (
    'mcp_tool','ai_chat','ai_completion','image_generation',
    'document_chat','governance','money_manager','automation',
    'integration','storefront','api','manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.credit_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  tenant_id TEXT,
  source credit_source NOT NULL,
  action TEXT NOT NULL,                           -- e.g. "invokeLLM", "get-analytics-summary"
  amount_credits NUMERIC(14, 4) NOT NULL,         -- supports fractional credits
  cost_cents INTEGER,                             -- estimated monetary cost
  balance_after NUMERIC(14, 4),                   -- balance snapshot after deduction
  tokens_in INTEGER,                              -- LLM prompt tokens
  tokens_out INTEGER,                             -- LLM completion tokens
  model TEXT,                                     -- e.g. "gemini-2.5-flash"
  overage BOOLEAN NOT NULL DEFAULT false,         -- true if it exceeded plan allotment
  stripe_invoice_item_id TEXT,                    -- set when reported to Stripe
  request_id TEXT,                                -- trace correlation
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.credit_usage_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ix_credit_usage_user_created
  ON public.credit_usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_credit_usage_source
  ON public.credit_usage_events(source, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_credit_usage_overage
  ON public.credit_usage_events(overage) WHERE overage = true;
CREATE POLICY IF NOT EXISTS "Read own usage events"
  ON public.credit_usage_events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

-- ============================================
-- CREDIT OVERAGE QUEUE
-- Pending overage charges awaiting Stripe invoice-item creation.
-- A scheduled flush (nightly or on demand) groups by user and
-- creates invoice items on the active subscription.
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_overage_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  usage_event_id UUID REFERENCES public.credit_usage_events(id) ON DELETE CASCADE,
  overage_credits NUMERIC(14, 4) NOT NULL,
  overage_rate_cents INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,                  -- overage_credits * overage_rate_cents
  status TEXT NOT NULL DEFAULT 'pending',         -- pending|reported|failed|voided
  stripe_invoice_item_id TEXT,
  reported_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_overage_queue_status
  ON public.credit_overage_queue(status, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_overage_queue_user
  ON public.credit_overage_queue(user_id, created_at DESC);

-- ============================================
-- ATOMIC: consume_credits_with_meter
-- Single transaction:
--   1) Lock credit_balances row FOR UPDATE
--   2) Check for active subscription & period consumption
--   3) Deduct balance (allowing negative balance when user has
--      an active subscription with overage_rate_cents > 0)
--   4) Insert credit_usage_events row
--   5) If overage, insert credit_overage_queue row
-- Returns: (success, balance_after, overage_credits, event_id)
-- ============================================
CREATE OR REPLACE FUNCTION public.consume_credits_with_meter(
  p_user_id TEXT,
  p_amount NUMERIC,
  p_source TEXT,
  p_action TEXT,
  p_cost_cents INTEGER DEFAULT NULL,
  p_tokens_in INTEGER DEFAULT NULL,
  p_tokens_out INTEGER DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_tenant_id TEXT DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(
  success BOOLEAN,
  balance_after NUMERIC,
  overage_credits NUMERIC,
  event_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_current NUMERIC;
  v_new NUMERIC;
  v_overage NUMERIC := 0;
  v_event_id UUID;
  v_price_id TEXT;
  v_tier RECORD;
  v_has_sub BOOLEAN;
BEGIN
  -- Lock the balance row for the duration of this transaction
  SELECT balance INTO v_current
    FROM public.credit_balances
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF v_current IS NULL THEN
    -- Seed an empty balance row
    INSERT INTO public.credit_balances (user_id, balance, lifetime_earned, lifetime_spent)
      VALUES (p_user_id, 0, 0, 0);
    v_current := 0;
  END IF;

  -- Check for active subscription tier (for overage billing)
  SELECT sp.id, st.*
    INTO v_price_id, v_tier
    FROM public.stripe_subscriptions s
    JOIN public.stripe_prices sp ON s.price_id = sp.id
    JOIN public.subscription_tiers st ON st.stripe_price_id = sp.id
    WHERE s.user_id = p_user_id
      AND s.status IN ('trialing', 'active')
    LIMIT 1;

  v_has_sub := FOUND;

  IF v_current >= p_amount THEN
    -- Normal deduction (sufficient balance)
    v_new := v_current - p_amount;
    UPDATE public.credit_balances
      SET balance = v_new,
          lifetime_spent = lifetime_spent + p_amount,
          updated_at = now()
      WHERE user_id = p_user_id;
  ELSIF v_has_sub AND COALESCE(v_tier.overage_rate_cents, 0) > 0 THEN
    -- Overage allowed — deduct what we can, overflow becomes overage
    v_overage := p_amount - v_current;
    v_new := 0;
    UPDATE public.credit_balances
      SET balance = 0,
          lifetime_spent = lifetime_spent + p_amount,
          updated_at = now()
      WHERE user_id = p_user_id;
  ELSE
    -- Insufficient balance and no overage allowance
    RETURN QUERY SELECT false, v_current, 0::NUMERIC, NULL::UUID,
      'Insufficient credits and no active subscription with overage'::TEXT;
    RETURN;
  END IF;

  -- Insert usage event
  INSERT INTO public.credit_usage_events (
    user_id, tenant_id, source, action, amount_credits,
    cost_cents, balance_after, tokens_in, tokens_out, model,
    overage, request_id, metadata
  ) VALUES (
    p_user_id, p_tenant_id, p_source::public.credit_source, p_action, p_amount,
    p_cost_cents, v_new, p_tokens_in, p_tokens_out, p_model,
    v_overage > 0, p_request_id, p_metadata
  ) RETURNING id INTO v_event_id;

  -- Queue overage for Stripe billing
  IF v_overage > 0 THEN
    INSERT INTO public.credit_overage_queue (
      user_id, usage_event_id, overage_credits,
      overage_rate_cents, amount_cents
    ) VALUES (
      p_user_id, v_event_id, v_overage,
      v_tier.overage_rate_cents,
      CEIL(v_overage * v_tier.overage_rate_cents)::INTEGER
    );
  END IF;

  RETURN QUERY SELECT true, v_new, v_overage, v_event_id, NULL::TEXT;
END;
$$;

-- ============================================
-- HELPER: credit_usage_summary
-- Returns aggregated usage by source for a user over a period.
-- ============================================
CREATE OR REPLACE FUNCTION public.credit_usage_summary(
  p_user_id TEXT,
  p_since TIMESTAMPTZ DEFAULT (now() - interval '30 days')
) RETURNS TABLE(
  source public.credit_source,
  event_count BIGINT,
  total_credits NUMERIC,
  total_cost_cents BIGINT,
  overage_credits NUMERIC
)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT
    source,
    COUNT(*) AS event_count,
    SUM(amount_credits) AS total_credits,
    COALESCE(SUM(cost_cents), 0) AS total_cost_cents,
    SUM(CASE WHEN overage THEN amount_credits ELSE 0 END) AS overage_credits
  FROM public.credit_usage_events
  WHERE user_id = p_user_id
    AND created_at >= p_since
  GROUP BY source
  ORDER BY total_credits DESC;
$$;

-- ============================================
-- Realtime publication — live usage feed for admin dashboard
-- ============================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_usage_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_overage_queue;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
