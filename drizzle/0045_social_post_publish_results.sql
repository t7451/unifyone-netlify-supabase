-- Per-target publish outcomes for social posts (PR: persist publish status).
-- Stores the native-dispatch result per platform so the UI can show per-target
-- status after reload. Idempotent.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'publishResults'
  ) THEN
    ALTER TABLE "social_posts" ADD COLUMN "publishResults" json;
  END IF;
END $$;
