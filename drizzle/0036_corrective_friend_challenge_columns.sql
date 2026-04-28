-- Migration 0036: Corrective friend_challenges resolution columns
--
-- Migration 0015_organic_marvex.sql added resolvedAt, winnerNotified, and
-- loserNotified to the friend_challenges table, but used MySQL ALTER TABLE
-- syntax (backticks, MySQL enum syntax) which is a no-op against PostgreSQL.
--
-- All three statements are idempotent (IF NOT EXISTS guard).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'friend_challenges' AND column_name = 'resolvedAt'
  ) THEN
    ALTER TABLE "friend_challenges" ADD COLUMN "resolvedAt" timestamp;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'friend_challenges' AND column_name = 'winnerNotified'
  ) THEN
    ALTER TABLE "friend_challenges" ADD COLUMN "winnerNotified" boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'friend_challenges' AND column_name = 'loserNotified'
  ) THEN
    ALTER TABLE "friend_challenges" ADD COLUMN "loserNotified" boolean NOT NULL DEFAULT false;
  END IF;
END $$;
