-- The SHA256 includes normalized platform and complete normalized row contents.
-- Owner scope is explicit in the index. NULL keeps pre-migration imports intact;
-- their original contents cannot be reconstructed reliably for safe backfill.
ALTER TABLE earnings_import_batches
  ADD COLUMN IF NOT EXISTS "contentFingerprint" varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS earnings_import_batches_user_content_idx
  ON earnings_import_batches ("userId", "contentFingerprint");
