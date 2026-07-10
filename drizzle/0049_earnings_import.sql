-- ── Migration 0049: Earnings import (multi-platform CSV / 1099 consolidation) ─
--
-- Persists earnings imported from gig-platform CSV / 1099 exports so they can be
-- blended into the consolidated income picture alongside hand-entered shifts.
-- earnings_import_batches is the per-file audit/undo unit; imported_earnings are
-- the normalized rows referencing it.
--
-- Run this after 0048_survey_responses.sql.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "earnings_import_source" AS ENUM ('csv', '1099');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "earnings_import_batches" (
  "id"        serial PRIMARY KEY,
  "userId"    integer NOT NULL,
  "platform"  varchar(100) NOT NULL,
  "fileName"  varchar(300),
  "rowCount"  integer DEFAULT 0 NOT NULL,
  "status"    varchar(50) DEFAULT 'committed' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "earnings_import_batches_userId_idx"
  ON "earnings_import_batches" ("userId");

CREATE TABLE IF NOT EXISTS "imported_earnings" (
  "id"            serial PRIMARY KEY,
  "userId"        integer NOT NULL,
  "platform"      varchar(100) NOT NULL,
  "earnedDate"    timestamp NOT NULL,
  "grossEarnings" numeric(10, 2) DEFAULT '0.00' NOT NULL,
  "tips"          numeric(10, 2) DEFAULT '0.00' NOT NULL,
  "bonuses"       numeric(10, 2) DEFAULT '0.00' NOT NULL,
  "totalMiles"    numeric(8, 2),
  "source"        "earnings_import_source" NOT NULL,
  "importBatchId" integer NOT NULL,
  "rawRow"        jsonb,
  "createdAt"     timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "imported_earnings_userId_idx"
  ON "imported_earnings" ("userId");
