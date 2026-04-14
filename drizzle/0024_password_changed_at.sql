-- Add passwordChangedAt column to users table.
--
-- Used for JWT-based session invalidation: any session token issued before this
-- timestamp (in seconds) is rejected by the SDK's authenticateRequest(), even if
-- the JWT hasn't expired yet.  Existing rows default to NULL which means no
-- sessions are revoked retroactively.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" timestamp;
