-- ── Migration 0050: Set-aside / envelope ledger ──────────────────────────────
--
-- Virtual (tracked) balances so auto-save / allocation rules actually credit a
-- "set aside" bucket — the "keep what you owe" number — without a bank
-- integration (Plaid). savings_envelopes holds the balances; envelope_transactions
-- is the append-only ledger, one row per credit, keyed idempotently per
-- (rule, shift) so a re-fired rule never double-credits.
--
-- Run this after 0049_earnings_import.sql.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "envelope_category" AS ENUM ('tax', 'savings', 'emergency', 'goal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "savings_envelopes" (
  "id"          serial PRIMARY KEY,
  "userId"      integer NOT NULL,
  "name"        varchar(200) NOT NULL,
  "category"    "envelope_category" NOT NULL,
  "balanceCents" integer DEFAULT 0 NOT NULL,
  "targetCents" integer,
  "enabled"     boolean DEFAULT true NOT NULL,
  "createdAt"   timestamp DEFAULT now() NOT NULL,
  "updatedAt"   timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "envelope_transactions" (
  "id"            serial PRIMARY KEY,
  "userId"        integer NOT NULL,
  "envelopeId"    integer NOT NULL,
  "amountCents"   integer NOT NULL,
  "action"        varchar(100) NOT NULL,
  "ruleId"        integer,
  "referenceId"   varchar(100),
  "balanceAfter"  integer NOT NULL,
  "idempotencyKey" varchar(200),
  "createdAt"     timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "savings_envelopes_user_name_idx"
  ON "savings_envelopes" ("userId", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "envelope_transactions_idempotency_key_idx"
  ON "envelope_transactions" ("idempotencyKey");

CREATE INDEX IF NOT EXISTS "savings_envelopes_user_idx"
  ON "savings_envelopes" ("userId");

CREATE INDEX IF NOT EXISTS "envelope_transactions_user_idx"
  ON "envelope_transactions" ("userId");
