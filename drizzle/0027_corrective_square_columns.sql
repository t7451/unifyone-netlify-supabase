-- Corrective migration: re-applies the column additions originally intended in
-- migration 0021, using proper PostgreSQL syntax (0021 used MySQL syntax and
-- would have been a no-op against a PostgreSQL database).
--
-- All statements are idempotent: they only add or modify when the column does
-- not already exist, making this safe to run against both fresh databases and
-- databases where some or all changes from 0021 partially succeeded.

-- ── orders table ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'squarePaymentId'
  ) THEN
    ALTER TABLE "orders" ADD COLUMN "squarePaymentId" varchar(100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'squareOrderId'
  ) THEN
    ALTER TABLE "orders" ADD COLUMN "squareOrderId" varchar(100);
  END IF;
END $$;

-- Ensure the payment_method enum type includes the 'square' value.
-- ALTER TYPE ... ADD VALUE is idempotent in PostgreSQL 9.6+ via IF NOT EXISTS.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'square'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
  ) THEN
    ALTER TYPE payment_method ADD VALUE 'square';
  END IF;
END $$;

-- ── tenants table ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'squareAccessToken'
  ) THEN
    ALTER TABLE "tenants" ADD COLUMN "squareAccessToken" text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'squareLocationId'
  ) THEN
    ALTER TABLE "tenants" ADD COLUMN "squareLocationId" varchar(100);
  END IF;
END $$;
