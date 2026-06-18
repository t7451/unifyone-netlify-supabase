-- Migration 0046: Discounts / Coupons table
--
-- The discounts table was added to drizzle/schema.ts but never had a
-- corresponding migration file. This migration creates it.
-- Idempotent via IF NOT EXISTS / DO $$ BEGIN ... END; $$.

DO $$ BEGIN
  CREATE TYPE "discount_type" AS ENUM ('percentage', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN null;
END; $$;

CREATE TABLE IF NOT EXISTS "discounts" (
  "id"           serial PRIMARY KEY,
  "tenantId"     integer NOT NULL,
  "code"         varchar(64) NOT NULL,
  "description"  text,
  "type"         "discount_type" NOT NULL,
  "value"        varchar(32) NOT NULL,
  "currency"     varchar(3) NOT NULL DEFAULT 'USD',
  "validFrom"    timestamp,
  "validUntil"   timestamp,
  "usageLimit"   integer NOT NULL DEFAULT 0,
  "usageCount"   integer NOT NULL DEFAULT 0,
  "isActive"     boolean NOT NULL DEFAULT true,
  "createdAt"    timestamp NOT NULL DEFAULT now(),
  "updatedAt"    timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "discounts_tenant_code_uniq"
  ON "discounts" ("tenantId", "code");
