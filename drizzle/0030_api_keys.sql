-- Migration 0030: Create api_keys table
--
-- The api_keys table was added to drizzle/schema.ts but never had a
-- corresponding migration file. This caused the Developer Hub's API key
-- management procedures (developer.listApiKeys, developer.generateApiKey,
-- developer.revokeApiKey) to fail with "relation api_keys does not exist"
-- errors, making the Developer Hub appear broken (returning errors on load).

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id"          serial       PRIMARY KEY,
  "tenantId"    integer      NOT NULL,
  "userId"      integer      NOT NULL,
  "name"        varchar(100) NOT NULL,
  "keyPrefix"   varchar(16)  NOT NULL,
  "keyHash"     varchar(64)  NOT NULL,
  "scopes"      json         NOT NULL DEFAULT '[]',
  "lastUsedAt"  timestamp,
  "expiresAt"   timestamp,
  "revokedAt"   timestamp,
  "createdAt"   timestamp    NOT NULL DEFAULT now()
);

-- Composite index for the most common query (active keys per tenant):
--   WHERE "tenantId" = ? AND "revokedAt" IS NULL
CREATE INDEX IF NOT EXISTS "api_keys_tenantId_revokedAt_idx"
  ON "api_keys" ("tenantId", "revokedAt");

-- Index for key-hash lookups (used during API authentication)
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_keyHash_idx"
  ON "api_keys" ("keyHash");

-- ── Foreign key constraints ─────────────────────────────────────────────────

-- api_keys.tenantId → tenants.id (cascade delete — remove keys when tenant removed)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_api_keys_tenant') THEN
    ALTER TABLE "api_keys" ADD CONSTRAINT fk_api_keys_tenant
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- api_keys.userId → users.id (cascade delete — remove keys when user removed)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_api_keys_user') THEN
    ALTER TABLE "api_keys" ADD CONSTRAINT fk_api_keys_user
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
