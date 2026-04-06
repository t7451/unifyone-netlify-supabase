-- ============================================
-- UnifyOne Stripe Subscription + Credit System
-- Supabase PostgreSQL migration
-- ============================================

-- ============================================
-- SUBSCRIPTION TIERS (credit allocation config)
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL UNIQUE,
  monthly_price_cents INTEGER NOT NULL,
  monthly_credits INTEGER NOT NULL,
  overage_rate_cents INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.subscription_tiers
  (name, stripe_price_id, monthly_price_cents, monthly_credits, overage_rate_cents, features)
VALUES
  ('Starter',    'price_starter_monthly',    2900,  100,  50, '{"max_stores":5,"api_calls":1000}'),
  ('Pro',        'price_pro_monthly',        4900,  300,  35, '{"max_stores":25,"api_calls":5000}'),
  ('Enterprise', 'price_enterprise_monthly', 9900, 1000,  25, '{"max_stores":-1,"api_calls":-1}')
ON CONFLICT (stripe_price_id) DO NOTHING;

-- ============================================
-- STRIPE PRODUCTS (synced from Stripe webhooks)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stripe_products (
  id TEXT PRIMARY KEY,
  active BOOLEAN,
  name TEXT,
  description TEXT,
  image TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.stripe_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read stripe_products"
  ON public.stripe_products FOR SELECT USING (true);

-- ============================================
-- STRIPE PRICES (synced from Stripe webhooks)
-- ============================================
DO $$ BEGIN
  CREATE TYPE pricing_type AS ENUM ('one_time', 'recurring');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pricing_plan_interval AS ENUM ('day', 'week', 'month', 'year');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.stripe_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES public.stripe_products(id),
  active BOOLEAN,
  description TEXT,
  unit_amount BIGINT,
  currency TEXT CHECK (char_length(currency) = 3),
  type pricing_type,
  interval pricing_plan_interval,
  interval_count INTEGER,
  trial_period_days INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public read stripe_prices"
  ON public.stripe_prices FOR SELECT USING (true);

-- ============================================
-- STRIPE SUBSCRIPTIONS (synced from webhooks)
-- ============================================
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'trialing','active','canceled','incomplete',
    'incomplete_expired','past_due','unpaid','paused'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  status subscription_status,
  metadata JSONB,
  price_id TEXT REFERENCES public.stripe_prices(id),
  quantity INTEGER,
  cancel_at_period_end BOOLEAN,
  created TIMESTAMPTZ DEFAULT now() NOT NULL,
  current_period_start TIMESTAMPTZ DEFAULT now() NOT NULL,
  current_period_end TIMESTAMPTZ DEFAULT now() NOT NULL,
  ended_at TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ix_stripe_subscriptions_user_id
  ON public.stripe_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS ix_stripe_subscriptions_customer_id
  ON public.stripe_subscriptions(stripe_customer_id);

-- ============================================
-- CREDIT BALANCES (enhanced — if not using existing credit_wallets)
-- This complements the existing credit_wallets table with
-- atomic locking support.
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  last_refill_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREDIT TRANSACTION TYPES
-- ============================================
DO $$ BEGIN
  CREATE TYPE credit_tx_type AS ENUM (
    'subscription_grant','top_up','consumption',
    'overage_charge','refund','admin_adjustment','expiration'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ATOMIC: consume_credits (with FOR UPDATE row lock)
-- Prevents race conditions on concurrent deductions.
-- ============================================
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(success BOOLEAN, remaining_balance INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_current INTEGER;
  v_new INTEGER;
BEGIN
  SELECT balance INTO v_current
    FROM public.credit_balances
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF v_current IS NULL OR v_current < p_amount THEN
    RETURN QUERY SELECT false, COALESCE(v_current, 0);
    RETURN;
  END IF;

  v_new := v_current - p_amount;

  UPDATE public.credit_balances
    SET balance = v_new,
        lifetime_spent = lifetime_spent + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, v_new;
END;
$$;

-- ============================================
-- ATOMIC: grant_credits (idempotent via unique key)
-- Duplicate Stripe webhook deliveries never double-grant.
-- ============================================
CREATE OR REPLACE FUNCTION public.grant_subscription_credits(
  p_user_id TEXT,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_new INTEGER;
BEGIN
  -- Check idempotency: if this grant was already processed, return current balance
  IF p_idempotency_key IS NOT NULL THEN
    PERFORM 1 FROM public.stripe_events WHERE id = p_idempotency_key;
    IF FOUND THEN
      SELECT balance INTO v_new FROM public.credit_balances WHERE user_id = p_user_id;
      RETURN COALESCE(v_new, 0);
    END IF;
  END IF;

  -- Upsert credit balance
  INSERT INTO public.credit_balances (user_id, balance, lifetime_earned, last_refill_at)
    VALUES (p_user_id, p_amount, p_amount, now())
    ON CONFLICT (user_id) DO UPDATE SET
      balance = public.credit_balances.balance + p_amount,
      lifetime_earned = public.credit_balances.lifetime_earned + p_amount,
      last_refill_at = now(),
      updated_at = now()
    RETURNING balance INTO v_new;

  RETURN v_new;
END;
$$;

-- ============================================
-- HELPER: get_subscription_tier for a user
-- Returns the tier name for the user's active subscription.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(p_user_id TEXT)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT st.name
  FROM public.stripe_subscriptions s
  JOIN public.stripe_prices sp ON s.price_id = sp.id
  JOIN public.subscription_tiers st ON st.stripe_price_id = sp.id
  WHERE s.user_id = p_user_id
    AND s.status IN ('trialing', 'active')
  LIMIT 1;
$$;

-- ============================================
-- HELPER: has_active_subscription
-- ============================================
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.stripe_subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('trialing', 'active')
  );
$$;

-- ============================================
-- Enable Realtime for subscription status updates
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.stripe_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stripe_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stripe_prices;
