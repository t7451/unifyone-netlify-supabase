-- Migration 0041: Kai purchasable credits (Neon/Drizzle)
--
-- Keeps purchasable Kai AI credits separate from users.creditBalance and the
-- legacy Supabase credit meter. Stripe Checkout writes pending purchases, and
-- webhook fulfillment grants credits exactly once through the ledger.

DO $$ BEGIN
  CREATE TYPE "kai_credit_purchase_status" AS ENUM (
    'pending',
    'paid',
    'failed',
    'cancelled',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "kai_credit_ledger_type" AS ENUM (
    'purchase',
    'usage',
    'adjustment',
    'refund'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "kai_credit_packages" (
  "id"            serial       PRIMARY KEY,
  "slug"          varchar(64)  NOT NULL UNIQUE,
  "name"          varchar(120) NOT NULL,
  "description"   text,
  "credits"       integer      NOT NULL,
  "amountCents"   integer      NOT NULL,
  "currency"      varchar(3)   NOT NULL DEFAULT 'USD',
  "stripePriceId" varchar(100),
  "isActive"      boolean      NOT NULL DEFAULT true,
  "sortOrder"     integer      NOT NULL DEFAULT 0,
  "metadata"      jsonb,
  "createdAt"     timestamp    NOT NULL DEFAULT now(),
  "updatedAt"     timestamp    NOT NULL DEFAULT now(),
  CONSTRAINT "kai_credit_packages_credits_positive" CHECK ("credits" > 0),
  CONSTRAINT "kai_credit_packages_amount_non_negative" CHECK ("amountCents" >= 0)
);

CREATE INDEX IF NOT EXISTS "kai_credit_packages_active_sort_idx"
  ON "kai_credit_packages" ("isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "kai_credit_purchases" (
  "id"                       serial                       PRIMARY KEY,
  "tenantId"                 integer                      NOT NULL,
  "userId"                   integer                      NOT NULL,
  "packageId"                integer,
  "packageSlug"              varchar(64)                  NOT NULL,
  "credits"                  integer                      NOT NULL,
  "amountCents"              integer                      NOT NULL,
  "currency"                 varchar(3)                   NOT NULL DEFAULT 'USD',
  "status"                   "kai_credit_purchase_status" NOT NULL DEFAULT 'pending',
  "stripeCheckoutSessionId"  varchar(100)                 UNIQUE,
  "stripePaymentIntentId"    varchar(100),
  "stripeCustomerId"         varchar(100),
  "idempotencyKey"           varchar(160)                 NOT NULL,
  "packageSnapshot"          jsonb,
  "paidAt"                   timestamp,
  "fulfilledAt"              timestamp,
  "createdAt"                timestamp                    NOT NULL DEFAULT now(),
  "updatedAt"                timestamp                    NOT NULL DEFAULT now(),
  CONSTRAINT "kai_credit_purchases_credits_positive" CHECK ("credits" > 0),
  CONSTRAINT "kai_credit_purchases_amount_non_negative" CHECK ("amountCents" >= 0)
);

CREATE INDEX IF NOT EXISTS "kai_credit_purchases_tenant_user_created_idx"
  ON "kai_credit_purchases" ("tenantId", "userId", "createdAt" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "kai_credit_purchases_tenant_idempotency_idx"
  ON "kai_credit_purchases" ("tenantId", "idempotencyKey");

CREATE TABLE IF NOT EXISTS "kai_credit_ledger" (
  "id"             serial                   PRIMARY KEY,
  "tenantId"       integer                  NOT NULL,
  "userId"         integer                  NOT NULL,
  "purchaseId"     integer,
  "type"           "kai_credit_ledger_type" NOT NULL,
  "creditDelta"    integer                  NOT NULL,
  "idempotencyKey" varchar(160)             NOT NULL UNIQUE,
  "description"    text,
  "metadata"       jsonb,
  "createdAt"      timestamp                NOT NULL DEFAULT now(),
  CONSTRAINT "kai_credit_ledger_non_zero_delta" CHECK ("creditDelta" <> 0)
);

CREATE INDEX IF NOT EXISTS "kai_credit_ledger_tenant_user_created_idx"
  ON "kai_credit_ledger" ("tenantId", "userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "kai_credit_ledger_purchase_idx"
  ON "kai_credit_ledger" ("purchaseId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_kai_credit_purchases_tenant') THEN
    ALTER TABLE "kai_credit_purchases" ADD CONSTRAINT fk_kai_credit_purchases_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_kai_credit_purchases_user') THEN
    ALTER TABLE "kai_credit_purchases" ADD CONSTRAINT fk_kai_credit_purchases_user
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_kai_credit_purchases_package') THEN
    ALTER TABLE "kai_credit_purchases" ADD CONSTRAINT fk_kai_credit_purchases_package
      FOREIGN KEY ("packageId") REFERENCES "kai_credit_packages"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_kai_credit_ledger_tenant') THEN
    ALTER TABLE "kai_credit_ledger" ADD CONSTRAINT fk_kai_credit_ledger_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_kai_credit_ledger_user') THEN
    ALTER TABLE "kai_credit_ledger" ADD CONSTRAINT fk_kai_credit_ledger_user
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_kai_credit_ledger_purchase') THEN
    ALTER TABLE "kai_credit_ledger" ADD CONSTRAINT fk_kai_credit_ledger_purchase
      FOREIGN KEY ("purchaseId") REFERENCES "kai_credit_purchases"("id") ON DELETE SET NULL;
  END IF;
END $$;
