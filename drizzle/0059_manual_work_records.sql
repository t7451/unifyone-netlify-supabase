-- Existing timed work remains timer-sourced. No historical rows are relabeled.
ALTER TABLE gig_shifts
  ADD COLUMN IF NOT EXISTS "entrySource" varchar(20) NOT NULL DEFAULT 'timer',
  ADD COLUMN IF NOT EXISTS "clientReference" varchar(36);

-- PostgreSQL permits multiple NULL references for legacy/timed rows.
-- A stable client reference deduplicates each user's manual-save retries.
CREATE UNIQUE INDEX IF NOT EXISTS gig_shifts_user_client_reference_idx
  ON gig_shifts ("userId", "clientReference");
