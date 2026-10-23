-- Apply to a development database first. No provider secrets or account numbers.
CREATE TABLE IF NOT EXISTS financial_connections (
  id varchar(36) PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(10) NOT NULL CHECK (provider IN ('plaid','argyle')),
  environment varchar(10) NOT NULL CHECK (environment IN ('sandbox','production')),
  "externalId" text,
  "encryptedToken" text,
  cursor text,
  status varchar(30) NOT NULL DEFAULT 'linking',
  accounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  "consentAt" timestamp NOT NULL DEFAULT now(),
  "consentVersion" varchar(30) NOT NULL DEFAULT 'read-only-v1',
  "lastSyncedAt" timestamp,
  "syncLease" varchar(36),
  "syncLeaseUntil" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS financial_connections_external_idx ON financial_connections(provider, environment, "externalId");
CREATE UNIQUE INDEX IF NOT EXISTS financial_connections_argyle_user_idx ON financial_connections("userId", environment) WHERE provider = 'argyle';
CREATE INDEX IF NOT EXISTS financial_connections_user_idx ON financial_connections("userId");
CREATE TABLE IF NOT EXISTS financial_activity (
  id varchar(36) PRIMARY KEY,
  "connectionId" varchar(36) NOT NULL REFERENCES financial_connections(id) ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "providerRecordId" text NOT NULL,
  "sourceAccountId" text NOT NULL,
  kind varchar(30) NOT NULL CHECK (kind IN ('bank_transaction','gig_earning','income_payment')),
  date date NOT NULL,
  description text NOT NULL,
  amount numeric(16,2) NOT NULL,
  currency varchar(3) NOT NULL,
  pending boolean NOT NULL DEFAULT false,
  "durationSeconds" integer,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS financial_activity_provider_record_idx ON financial_activity("connectionId", "providerRecordId");
CREATE INDEX IF NOT EXISTS financial_activity_user_date_idx ON financial_activity("userId", date);
