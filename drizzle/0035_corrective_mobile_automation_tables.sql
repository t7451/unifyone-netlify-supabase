-- Migration 0035: Corrective PostgreSQL tables for mobile-automation features
--
-- Migrations 0014–0017 used MySQL backtick/AUTO_INCREMENT syntax and were
-- therefore no-ops against a PostgreSQL database (same class of issue fixed
-- for squareAccessToken in 0027 and shopifyCheckoutUrl in 0034).
--
-- Tables added here (all idempotent — safe to run against databases that
-- already have the columns/tables from pnpm db:push):
--
--   deep_link_attributions  — mobile deep-link click tracking
--   n8n_schedules           — n8n workflow cron schedule store
--   meta_capi_events        — Meta Conversions API event audit log
--   mobile_push_schedules   — scheduled/recurring push notification campaigns
--
-- Enum types are created with the "EXCEPTION WHEN duplicate_object" guard so
-- the statement is idempotent whether or not a previous pnpm db:push created
-- the enum first.

-- ── Enum: n8n_run_status ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "n8n_run_status" AS ENUM ('success', 'failed', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Enum: push_target ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "push_target" AS ENUM (
    'all', 'active_users', 'inactive_users', 'new_users', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Enum: push_status ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "push_status" AS ENUM (
    'draft', 'scheduled', 'sent', 'failed', 'recurring'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── deep_link_attributions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "deep_link_attributions" (
  "id"             serial       PRIMARY KEY,
  "userId"         integer,
  "email"          varchar(255),
  "source"         varchar(100) NOT NULL DEFAULT 'unknown',
  "medium"         varchar(100),
  "campaign"       varchar(255),
  "deepLinkPath"   varchar(500),
  "referralCode"   varchar(100),
  "utmSource"      varchar(255),
  "utmMedium"      varchar(255),
  "utmCampaign"    varchar(255),
  "converted"      boolean      NOT NULL DEFAULT false,
  "convertedAt"    timestamp,
  "ipAddress"      varchar(45),
  "userAgent"      text,
  "createdAt"      timestamp    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "deep_link_attributions_userId_idx"
  ON "deep_link_attributions" ("userId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_deep_link_userId') THEN
    ALTER TABLE "deep_link_attributions" ADD CONSTRAINT fk_deep_link_userId
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- ── n8n_schedules ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "n8n_schedules" (
  "id"             serial          PRIMARY KEY,
  "tenantId"       integer         NOT NULL,
  "name"           varchar(255)    NOT NULL,
  "description"    text,
  "workflowId"     varchar(255),
  "webhookUrl"     varchar(1000),
  "cronExpression" varchar(100)    NOT NULL,
  "payload"        json,
  "enabled"        boolean         NOT NULL DEFAULT true,
  "lastRunAt"      timestamp,
  "nextRunAt"      timestamp,
  "lastRunStatus"  "n8n_run_status",
  "lastRunError"   text,
  "triggerCount"   integer         NOT NULL DEFAULT 0,
  "createdAt"      timestamp       NOT NULL DEFAULT now(),
  "updatedAt"      timestamp       NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "n8n_schedules_tenantId_idx"
  ON "n8n_schedules" ("tenantId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_n8n_schedules_tenant') THEN
    ALTER TABLE "n8n_schedules" ADD CONSTRAINT fk_n8n_schedules_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ── meta_capi_events ──────────────────────────────────────────────────────────
-- Note: this table uses snake_case column aliases (e.g. "tenant_id", "event_name")
-- to match the Drizzle schema definition where column names differ from field names.
CREATE TABLE IF NOT EXISTS "meta_capi_events" (
  "id"               serial       PRIMARY KEY,
  "tenant_id"        integer,
  "event_name"       text         NOT NULL,
  "event_id"         text         NOT NULL,
  "user_id"          integer,
  "event_source_url" text,
  "user_data"        jsonb,
  "custom_data"      jsonb,
  "sent_at"          timestamp    DEFAULT now(),
  "response_code"    integer,
  "response_body"    text
);

CREATE INDEX IF NOT EXISTS "meta_capi_events_tenant_id_idx"
  ON "meta_capi_events" ("tenant_id");
CREATE INDEX IF NOT EXISTS "meta_capi_events_sent_at_idx"
  ON "meta_capi_events" ("sent_at");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_meta_capi_tenant') THEN
    ALTER TABLE "meta_capi_events" ADD CONSTRAINT fk_meta_capi_tenant
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_meta_capi_user') THEN
    ALTER TABLE "meta_capi_events" ADD CONSTRAINT fk_meta_capi_user
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- ── mobile_push_schedules ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "mobile_push_schedules" (
  "id"              serial          PRIMARY KEY,
  "tenantId"        integer         NOT NULL,
  "title"           varchar(255)    NOT NULL,
  "body"            text            NOT NULL,
  "targetAudience"  "push_target"   NOT NULL DEFAULT 'all',
  "scheduledAt"     timestamp,
  "cronExpression"  varchar(100),
  "recurring"       boolean         NOT NULL DEFAULT false,
  "deepLinkPath"    varchar(500),
  "imageUrl"        text,
  "enabled"         boolean         NOT NULL DEFAULT true,
  "sentCount"       integer         NOT NULL DEFAULT 0,
  "lastSentAt"      timestamp,
  "status"          "push_status"   NOT NULL DEFAULT 'draft',
  "createdAt"       timestamp       NOT NULL DEFAULT now(),
  "updatedAt"       timestamp       NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "mobile_push_schedules_tenantId_idx"
  ON "mobile_push_schedules" ("tenantId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mobile_push_tenant') THEN
    ALTER TABLE "mobile_push_schedules" ADD CONSTRAINT fk_mobile_push_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;
