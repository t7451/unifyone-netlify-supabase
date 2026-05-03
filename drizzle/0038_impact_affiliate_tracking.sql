-- Migration 0038: Impact.com S2S affiliate conversion tracking
--
-- Two tables:
--   * impact_clicks       — inbound ?im_ref=… landings (with HttpOnly cookie + DB row)
--   * impact_conversions  — server-to-server conversion postbacks, idempotent
--                           on stripe_session_id so Stripe webhook replays
--                           cannot fire twice.
--
-- Privacy: we store SHA-256 of the IP, never the raw address.
-- Affiliate parameter convention: https://1commerce.online/?im_ref=AFFID_CLICKID
--
-- Required env vars (post-deploy, set on Netlify):
--   IMPACT_ACCOUNT_SID
--   IMPACT_AUTH_TOKEN
--   IMPACT_CAMPAIGN_ID
--   IMPACT_API_BASE_URL  (optional, defaults to https://api.impact.com)

CREATE TABLE IF NOT EXISTS "impact_clicks" (
  "id"             serial       PRIMARY KEY,
  "click_id"       varchar(64)  NOT NULL,
  "im_ref"         varchar(200) NOT NULL,
  "landing_url"    text,
  "ip_hash"        varchar(64),
  "user_agent"     text,
  "referer"        text,
  "user_id"        integer,
  "converted_at"   timestamp,
  "created_at"     timestamp    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "impact_clicks_click_id_unique"
  ON "impact_clicks" ("click_id");
CREATE INDEX IF NOT EXISTS "impact_clicks_im_ref_idx"
  ON "impact_clicks" ("im_ref");
CREATE INDEX IF NOT EXISTS "impact_clicks_user_id_idx"
  ON "impact_clicks" ("user_id");
CREATE INDEX IF NOT EXISTS "impact_clicks_created_at_idx"
  ON "impact_clicks" ("created_at");

CREATE TABLE IF NOT EXISTS "impact_conversions" (
  "id"                  serial       PRIMARY KEY,
  "click_id"            varchar(64)  NOT NULL,
  "stripe_session_id"   varchar(100) NOT NULL,
  "amount_cents"        integer      NOT NULL,
  "currency"            varchar(3)   NOT NULL,
  "impact_response"     json,
  "http_status"         integer,
  "success"             boolean      NOT NULL DEFAULT false,
  "fired_at"            timestamp    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "impact_conversions_stripe_session_id_unique"
  ON "impact_conversions" ("stripe_session_id");
CREATE INDEX IF NOT EXISTS "impact_conversions_click_id_idx"
  ON "impact_conversions" ("click_id");
CREATE INDEX IF NOT EXISTS "impact_conversions_fired_at_idx"
  ON "impact_conversions" ("fired_at");
