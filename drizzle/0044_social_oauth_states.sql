-- Social OAuth-redirect connect (PR 6): pending-state table for per-instance
-- OAuth flows (Mastodon). Holds the app credentials registered at "start" so
-- the callback can exchange the authorization code. Idempotent.
CREATE TABLE IF NOT EXISTS "social_oauth_states" (
  "state" varchar(64) PRIMARY KEY NOT NULL,
  "platform" varchar(32) NOT NULL,
  "instanceUrl" text NOT NULL,
  "clientId" text NOT NULL,
  "clientSecret" text NOT NULL,
  "redirectUri" text NOT NULL,
  "userId" integer,
  "tenantId" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "expiresAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "social_oauth_states_expiresAt_idx"
  ON "social_oauth_states" ("expiresAt");
