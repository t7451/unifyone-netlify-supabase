-- Migration 0033: Stripe payment audit + order-level idempotency
--
-- Backs the orders.create flow with an audit trail so every successful
-- Stripe verification is recorded BEFORE the order row is written. This
-- gives us:
--   1. Idempotency: a retry with the same Stripe id returns the existing
--      order instead of double-booking a payment.
--   2. Orphan detection: audit rows that stay unlinked beyond a grace
--      window indicate a DB write that failed after Stripe captured
--      the payment, and can be reconciled out-of-band.
--
-- Also adds partial unique indexes on orders.stripePaymentIntentId and
-- orders.stripeSessionId (per tenant) so the database itself rejects a
-- second order for the same Stripe payment, even if application logic
-- has a race.

CREATE TYPE "stripe_payment_audit_status" AS ENUM ('pending', 'linked', 'orphaned');

CREATE TABLE IF NOT EXISTS "stripe_payment_audit" (
  "id"                     serial                          PRIMARY KEY,
  "tenantId"               integer                         NOT NULL,
  "userId"                 integer                         NOT NULL,
  "idempotencyKey"         varchar(200)                    NOT NULL,
  "stripePaymentIntentId"  varchar(100),
  "stripeSessionId"        varchar(100),
  "amount"                 decimal(12, 2)                  NOT NULL,
  "currency"               varchar(3)                      NOT NULL,
  "status"                 "stripe_payment_audit_status"   NOT NULL DEFAULT 'pending',
  "linkedOrderId"          integer,
  "lastError"              text,
  "createdAt"              timestamp                       NOT NULL DEFAULT now(),
  "updatedAt"              timestamp                       NOT NULL DEFAULT now()
);

-- One audit row per (tenant, Stripe payment). Drives idempotency.
CREATE UNIQUE INDEX IF NOT EXISTS "stripe_payment_audit_tenant_key_idx"
  ON "stripe_payment_audit" ("tenantId", "idempotencyKey");

-- Reconciliation worker scans by status + age.
CREATE INDEX IF NOT EXISTS "stripe_payment_audit_status_created_idx"
  ON "stripe_payment_audit" ("status", "createdAt");

-- ── Foreign keys ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stripe_payment_audit_tenant') THEN
    ALTER TABLE "stripe_payment_audit" ADD CONSTRAINT fk_stripe_payment_audit_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stripe_payment_audit_user') THEN
    ALTER TABLE "stripe_payment_audit" ADD CONSTRAINT fk_stripe_payment_audit_user
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stripe_payment_audit_order') THEN
    ALTER TABLE "stripe_payment_audit" ADD CONSTRAINT fk_stripe_payment_audit_order
      FOREIGN KEY ("linkedOrderId") REFERENCES "orders"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- ── Partial unique indexes on orders ─────────────────────────────────────────
-- Prevent two order rows from claiming the same Stripe payment within a tenant.
-- Partial (WHERE … IS NOT NULL) so non-Stripe orders aren't constrained.

CREATE UNIQUE INDEX IF NOT EXISTS "orders_tenant_stripe_pi_unique_idx"
  ON "orders" ("tenantId", "stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_tenant_stripe_session_unique_idx"
  ON "orders" ("tenantId", "stripeSessionId")
  WHERE "stripeSessionId" IS NOT NULL;
