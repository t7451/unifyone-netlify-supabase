-- ── Migration 0048: Survey responses (voice-of-customer microsurveys) ─────────
--
-- Stores exit-intent and post-purchase microsurvey answers — the qualitative
-- "WHY" behind the behavioral signal in analytics_events.
--
-- Run this after 0047_behavior_tracking_indexes.sql.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "survey_type" AS ENUM ('exit_intent', 'post_purchase', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "survey_responses" (
  "id"          serial PRIMARY KEY,
  "tenantId"    integer NOT NULL,
  "surveyType"  "survey_type" NOT NULL,
  "question"    varchar(300) NOT NULL,
  "answer"      text,
  "rating"      integer,
  "anonymousId" varchar(64),
  "userId"      integer,
  "path"        varchar(2048),
  "metadata"    json,
  "createdAt"   timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "survey_responses_tenant_type_created_idx"
  ON "survey_responses" ("tenantId", "surveyType", "createdAt");
