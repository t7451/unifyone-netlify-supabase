-- ── Migration 0023: Indexes and customer unique constraint ─────────────────────
--
-- 1. Unique constraint on customers(tenantId, email) — fixes upsertCustomer
--    which was using onConflictDoUpdate({ target: customers.id }) (PK, never
--    conflicts on insert), causing duplicate customer rows per email per tenant.
--
-- 2. Performance indexes for common hot-path queries.
--
-- Run this after 0022_auth_tokens.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- Customer upsert fix
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_tenantId_email_unique"
  UNIQUE ("tenantId", "email");

-- users.email lookup on every sign-in (should already be effectively unique,
-- but a partial index speeds the lookup and the WHERE clause makes it explicit)
CREATE INDEX IF NOT EXISTS "users_email_idx"
  ON "users" ("email");

-- Token lookups on password-reset and email-verify endpoints
CREATE INDEX IF NOT EXISTS "users_passwordResetToken_idx"
  ON "users" ("passwordResetToken")
  WHERE "passwordResetToken" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "users_emailVerificationToken_idx"
  ON "users" ("emailVerificationToken")
  WHERE "emailVerificationToken" IS NOT NULL;

-- Orders by customer email (getOrdersByCustomerEmail)
CREATE INDEX IF NOT EXISTS "orders_tenantId_customerEmail_idx"
  ON "orders" ("tenantId", "customerEmail");

-- Webhook events tenant-scoped query with time sort
CREATE INDEX IF NOT EXISTS "webhookEvents_tenantId_createdAt_idx"
  ON "webhookEvents" ("tenantId", "createdAt" DESC);
