-- Migration 0039: deploy_events — forensic log of every Netlify deploy
-- webhook event we receive. Idempotent on deploy_id so Netlify retries don't
-- create duplicates. Used by /api/deploys/notify to persist the full payload
-- and let us reconstruct deploy history when investigating outages.

CREATE TABLE IF NOT EXISTS "deploy_events" (
  "id"             serial       PRIMARY KEY,
  "deploy_id"      varchar(64)  NOT NULL UNIQUE,
  "site_id"        varchar(64),
  "state"          varchar(32)  NOT NULL,
  "branch"         varchar(120),
  "commit_ref"     varchar(64),
  "error_message"  text,
  "payload"        jsonb        NOT NULL,
  "received_at"    timestamp    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "deploy_events_state_idx"
  ON "deploy_events" ("state");
CREATE INDEX IF NOT EXISTS "deploy_events_received_at_idx"
  ON "deploy_events" ("received_at");
CREATE INDEX IF NOT EXISTS "deploy_events_site_id_idx"
  ON "deploy_events" ("site_id");
