-- Migration 0031: Clippers core backend tables

DO $$ BEGIN
  CREATE TYPE clipping_job_status AS ENUM (
    'queued',
    'processing',
    'transcribing',
    'detecting',
    'extracting',
    'captioning',
    'uploading',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE clipping_plan AS ENUM ('free', 'pro', 'creator');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE clipping_source_type AS ENUM ('upload', 'url');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "clipping_jobs" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL,
  "userId" integer NOT NULL,
  "sourceType" clipping_source_type NOT NULL DEFAULT 'url',
  "sourceUrl" text,
  "sourceStorageKey" text,
  "status" clipping_job_status NOT NULL DEFAULT 'queued',
  "progress" integer NOT NULL DEFAULT 0,
  "currentStage" varchar(64) NOT NULL DEFAULT 'queued',
  "errorMessage" text,
  "requestedClipCount" integer NOT NULL DEFAULT 10,
  "options" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "startedAt" timestamp,
  "completedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "clipping_jobs_progress_range" CHECK ("progress" >= 0 AND "progress" <= 100),
  CONSTRAINT "clipping_jobs_requested_count_range" CHECK ("requestedClipCount" >= 1 AND "requestedClipCount" <= 20)
);

CREATE TABLE IF NOT EXISTS "clips" (
  "id" serial PRIMARY KEY,
  "jobId" integer NOT NULL,
  "tenantId" integer NOT NULL,
  "index" integer NOT NULL,
  "title" varchar(255),
  "storageKey" text NOT NULL,
  "durationSec" integer NOT NULL DEFAULT 0,
  "startSec" integer NOT NULL DEFAULT 0,
  "endSec" integer NOT NULL DEFAULT 0,
  "highlightScore" numeric(6,3),
  "captionsStorageKey" text,
  "thumbnailStorageKey" text,
  "sizeBytes" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "clips_duration_non_negative" CHECK ("durationSec" >= 0)
);

CREATE TABLE IF NOT EXISTS "clipping_subscriptions" (
  "id" serial PRIMARY KEY,
  "tenantId" integer NOT NULL UNIQUE,
  "userId" integer NOT NULL,
  "plan" clipping_plan NOT NULL DEFAULT 'free',
  "stripeSubscriptionId" varchar(100),
  "stripeCustomerId" varchar(100),
  "stripePriceId" varchar(100),
  "status" subscription_status NOT NULL DEFAULT 'none',
  "monthlyJobQuota" integer NOT NULL DEFAULT 3,
  "jobsUsedThisPeriod" integer NOT NULL DEFAULT 0,
  "periodStart" timestamp NOT NULL DEFAULT now(),
  "periodEnd" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "clipping_sub_usage_non_negative" CHECK ("jobsUsedThisPeriod" >= 0),
  CONSTRAINT "clipping_sub_quota_positive" CHECK ("monthlyJobQuota" >= 0)
);

CREATE INDEX IF NOT EXISTS "clipping_jobs_tenant_created_idx"
  ON "clipping_jobs" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "clipping_jobs_tenant_status_idx"
  ON "clipping_jobs" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "clips_job_idx"
  ON "clips" ("jobId");
CREATE INDEX IF NOT EXISTS "clips_tenant_job_idx"
  ON "clips" ("tenantId", "jobId");
CREATE UNIQUE INDEX IF NOT EXISTS "clips_job_index_unique_idx"
  ON "clips" ("jobId", "index");
CREATE INDEX IF NOT EXISTS "clipping_sub_status_idx"
  ON "clipping_subscriptions" ("status", "updatedAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clipping_jobs_tenant') THEN
    ALTER TABLE "clipping_jobs" ADD CONSTRAINT fk_clipping_jobs_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clipping_jobs_user') THEN
    ALTER TABLE "clipping_jobs" ADD CONSTRAINT fk_clipping_jobs_user
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clips_job') THEN
    ALTER TABLE "clips" ADD CONSTRAINT fk_clips_job
      FOREIGN KEY ("jobId") REFERENCES "clipping_jobs"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clips_tenant') THEN
    ALTER TABLE "clips" ADD CONSTRAINT fk_clips_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clipping_subscriptions_tenant') THEN
    ALTER TABLE "clipping_subscriptions" ADD CONSTRAINT fk_clipping_subscriptions_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clipping_subscriptions_user') THEN
    ALTER TABLE "clipping_subscriptions" ADD CONSTRAINT fk_clipping_subscriptions_user
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
