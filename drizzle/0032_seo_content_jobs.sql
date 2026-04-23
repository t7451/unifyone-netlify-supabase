-- Migration 0032: SEO content jobs table for automated AI-generated SEO content

DO $$ BEGIN
  CREATE TYPE seo_content_job_status AS ENUM (
    'pending',
    'generating',
    'generated',
    'published',
    'failed',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE seo_content_type AS ENUM (
    'blog_post',
    'seo_landing',
    'faq_expansion'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "seo_content_jobs" (
  "id" serial PRIMARY KEY,
  "slug" varchar(255) NOT NULL UNIQUE,
  "type" seo_content_type NOT NULL DEFAULT 'blog_post',
  "status" seo_content_job_status NOT NULL DEFAULT 'pending',
  "topic" varchar(500) NOT NULL,
  "targetKeywords" json NOT NULL DEFAULT '[]'::json,
  "title" varchar(500),
  "h1" varchar(500),
  "tagline" text,
  "description" text,
  "keywords" json,
  "sections" json,
  "faq" json,
  "related" json,
  "runId" varchar(64),
  "errorMessage" text,
  "generatedAt" timestamp,
  "publishedAt" timestamp,
  "scheduledFor" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "seo_content_jobs_status_idx"
  ON "seo_content_jobs" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "seo_content_jobs_type_status_idx"
  ON "seo_content_jobs" ("type", "status");
