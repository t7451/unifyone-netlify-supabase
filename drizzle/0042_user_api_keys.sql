-- User-supplied AI provider API keys (BYOK). Encrypted at rest; one key per
-- provider per user. See server/lib/apiKeyVault.ts and server/lib/userApiKeys.ts.
CREATE TABLE IF NOT EXISTS "user_api_keys" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "tenantId" integer,
  "provider" varchar(32) NOT NULL,
  "encryptedKey" text NOT NULL,
  "last4" varchar(8) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_api_keys_user_provider_uniq"
  ON "user_api_keys" ("userId", "provider");
