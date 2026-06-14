-- Social connect (PR 2): widen the social_platform enum to include the v1
-- native-publish targets, and add connection metadata columns used by the
-- connect flow. All statements are idempotent and safe to re-run.

-- ── social_platform enum: add bluesky + mastodon ─────────────────────────────
-- ALTER TYPE ... ADD VALUE is idempotent in PostgreSQL 12+ via the pg_enum guard.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'bluesky'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'social_platform')
  ) THEN
    ALTER TYPE social_platform ADD VALUE 'bluesky';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'mastodon'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'social_platform')
  ) THEN
    ALTER TYPE social_platform ADD VALUE 'mastodon';
  END IF;
END $$;

-- ── social_accounts: connection metadata columns ─────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_accounts' AND column_name = 'displayName'
  ) THEN
    ALTER TABLE "social_accounts" ADD COLUMN "displayName" varchar(255);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_accounts' AND column_name = 'platformUserId'
  ) THEN
    ALTER TABLE "social_accounts" ADD COLUMN "platformUserId" varchar(255);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_accounts' AND column_name = 'instanceUrl'
  ) THEN
    ALTER TABLE "social_accounts" ADD COLUMN "instanceUrl" text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_accounts' AND column_name = 'scopes'
  ) THEN
    ALTER TABLE "social_accounts" ADD COLUMN "scopes" json;
  END IF;
END $$;
