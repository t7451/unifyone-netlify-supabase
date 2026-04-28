-- Corrective migration: adds the "shopifyCheckoutUrl" column to the tenants
-- table using proper PostgreSQL syntax.
--
-- The column was originally introduced in MySQL migration 0004_grey_dust.sql
-- which used MySQL backtick syntax and was therefore a no-op against a
-- PostgreSQL database (the same class of issue fixed for squareAccessToken /
-- squareLocationId in 0027_corrective_square_columns.sql).
--
-- This statement is idempotent: it only adds the column when it does not
-- already exist, making it safe to run against both fresh databases and
-- databases where the column was already added via pnpm db:push.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'shopifyCheckoutUrl'
  ) THEN
    ALTER TABLE "tenants" ADD COLUMN "shopifyCheckoutUrl" text;
  END IF;
END $$;
