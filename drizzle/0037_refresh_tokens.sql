-- Migration 0037: Refresh tokens table
--
-- Backs the short-lived access JWT / long-lived refresh token pattern.
-- When the access JWT expires the client presents its HttpOnly refresh cookie
-- to POST /api/auth/refresh; the server verifies the hash, rotates the token
-- (deletes old, issues new), and returns a fresh access JWT + new refresh cookie.
--
-- Raw tokens are never stored — only the SHA-256 hex hash.
-- Revoking a token sets revokedAt so the row can be retained for audit.

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id"          serial       PRIMARY KEY,
  "userId"      integer      NOT NULL,
  "tokenHash"   varchar(64)  NOT NULL,
  "expiresAt"   timestamp    NOT NULL,
  "revokedAt"   timestamp,
  "userAgent"   text,
  "ipAddress"   varchar(45),
  "lastUsedAt"  timestamp    NOT NULL DEFAULT now(),
  "createdAt"   timestamp    NOT NULL DEFAULT now()
);

-- Primary lookup path: find a valid token by hash (used on every refresh call).
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_tokenHash_idx"
  ON "refresh_tokens" ("tokenHash");

-- Cleanup index: find expired/revoked tokens for a given user.
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_expiresAt_idx"
  ON "refresh_tokens" ("userId", "expiresAt");

-- ── Foreign key ───────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_refresh_tokens_user') THEN
    ALTER TABLE "refresh_tokens" ADD CONSTRAINT fk_refresh_tokens_user
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
