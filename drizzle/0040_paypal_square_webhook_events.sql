-- Migration 0040: PayPal + Square webhook event audit tables
--
-- Mirrors `stripe_webhook_events` (migration 0033 / schema.ts) for PayPal and
-- Square so that:
--   1. Idempotency: a re-delivered webhook is detected via the unique
--      event_id and short-circuited.
--   2. Forensics: the entire signed payload is preserved as JSONB so we can
--      reconstruct what happened without retrieving from the provider.
--   3. SLA: every received delivery has a row before any side-effect runs;
--      'failed' rows surface in admin discovery and dashboards.
--
-- Both tables are independent — PayPal and Square deliver under different
-- contracts (PayPal verify-webhook-signature API; Square HMAC-SHA256) and we
-- don't want a malformed event in one provider to deadlock the other.

CREATE TABLE IF NOT EXISTS "paypal_webhook_events" (
  "id"            serial         PRIMARY KEY,
  "event_id"      varchar(100)   NOT NULL UNIQUE,
  "event_type"    varchar(100)   NOT NULL,
  "status"        varchar(20)    NOT NULL,
  "error_message" text,
  "livemode"      boolean        NOT NULL DEFAULT false,
  "payload"       jsonb,
  "created_at"    timestamp      NOT NULL DEFAULT now(),
  "updated_at"    timestamp      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "paypal_webhook_events_event_type_idx"
  ON "paypal_webhook_events" ("event_type");

CREATE INDEX IF NOT EXISTS "paypal_webhook_events_status_created_idx"
  ON "paypal_webhook_events" ("status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "square_webhook_events" (
  "id"            serial         PRIMARY KEY,
  "event_id"      varchar(100)   NOT NULL UNIQUE,
  "event_type"    varchar(100)   NOT NULL,
  "status"        varchar(20)    NOT NULL,
  "error_message" text,
  "livemode"      boolean        NOT NULL DEFAULT false,
  "payload"       jsonb,
  "created_at"    timestamp      NOT NULL DEFAULT now(),
  "updated_at"    timestamp      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "square_webhook_events_event_type_idx"
  ON "square_webhook_events" ("event_type");

CREATE INDEX IF NOT EXISTS "square_webhook_events_status_created_idx"
  ON "square_webhook_events" ("status", "created_at" DESC);
