-- ── Migration 0051: RoutePulse init ───────────────────────────────────────────
--
-- Hyperlocal route intelligence layer. Schema was applied directly to the
-- Supabase project (shohkfceyjdhepfrysga) ahead of this migration file being
-- committed — this migration codifies that live state so the environment is
-- reproducible from a fresh clone.
--
-- Tables/RPCs are accessed by server/routers/routePulse/routePulse.service.ts
-- and netlify/functions/routepulse-ingest-scheduled.mts via the raw Supabase
-- client (not drizzle-typed) — column names below match those call sites
-- exactly.
--
-- Run this after 0050_set_aside_envelopes.sql.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── traffic_incidents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "traffic_incidents" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source"                text NOT NULL CHECK ("source" IN ('road511', 'odot_tripcheck', 'news_ai', 'user_report')),
  "external_id"           text,
  "location"              geography(point, 4326) NOT NULL,
  "location_description"  text,
  "road_name"             text,
  "direction"             text,
  "incident_type"         text NOT NULL,
  "severity"              text NOT NULL CHECK ("severity" IN ('minor', 'moderate', 'major', 'critical')),
  "description"           text,
  "started_at"            timestamptz,
  "estimated_end_at"      timestamptz,
  "cleared_at"            timestamptz,
  "raw_data"               jsonb,
  "source_url"            text,
  "created_at"            timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "traffic_incidents_source_external_id_idx"
  ON "traffic_incidents" ("source", "external_id");

CREATE INDEX IF NOT EXISTS "traffic_incidents_location_idx"
  ON "traffic_incidents" USING gist ("location");

CREATE INDEX IF NOT EXISTS "traffic_incidents_active_idx"
  ON "traffic_incidents" ("cleared_at") WHERE "cleared_at" IS NULL;

-- ── routes_cache ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "routes_cache" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cache_key"   text NOT NULL UNIQUE,
  "result"      jsonb NOT NULL,
  "created_at"  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "routes_cache_key_created_idx"
  ON "routes_cache" ("cache_key", "created_at");

-- ── traffic_cameras ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "traffic_cameras" (
  "id"              text PRIMARY KEY,
  "location"        geography(point, 4326) NOT NULL,
  "road_name"       text,
  "direction"       text,
  "image_url"       text,
  "thumbnail_url"   text,
  "description"     text,
  "last_updated"    timestamptz,
  "created_at"      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "traffic_cameras_location_idx"
  ON "traffic_cameras" USING gist ("location");

-- ── incidents_near_route(route_wkt, buffer_meters) ──────────────────────────
-- Returns active incidents within buffer_meters of a LINESTRING route,
-- nearest first. Called via supabase.rpc("incidents_near_route", ...) from
-- routePulse.service.ts.
CREATE OR REPLACE FUNCTION incidents_near_route(route_wkt text, buffer_meters float)
RETURNS TABLE(
  id uuid, source text, incident_type text, severity text,
  description text, road_name text, location_description text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id, i.source, i.incident_type, i.severity,
    i.description, i.road_name, i.location_description
  FROM traffic_incidents i
  WHERE i.cleared_at IS NULL
    AND ST_DWithin(
      i.location::geography,
      ST_GeogFromText(route_wkt),
      buffer_meters
    )
  ORDER BY ST_Distance(
    i.location::geography,
    ST_GeogFromText(route_wkt)
  );
END;
$$ LANGUAGE plpgsql;

-- ── mark_incidents_cleared(p_source, active_ids, min_age_minutes) ──────────
-- Sweeps incidents that dropped out of the latest poll for ONE source.
-- Scoped to p_source deliberately: the caller only invokes this for a
-- source that successfully completed a poll this cycle, so an unrelated
-- source's outage (missing key, fetch failure) can never false-clear
-- incidents it didn't just see. Also only clears incidents that are at
-- least min_age_minutes old, so a single missed poll can't false-clear
-- something still active either. Called by routepulse-ingest-scheduled.mts
-- once per source, after that source's poll completes.
CREATE OR REPLACE FUNCTION mark_incidents_cleared(
  p_source text,
  active_ids text[],
  min_age_minutes int
) RETURNS void AS $$
BEGIN
  UPDATE traffic_incidents
  SET cleared_at = now()
  WHERE cleared_at IS NULL
    AND source = p_source
    AND external_id IS NOT NULL
    AND external_id <> ALL(active_ids)
    AND started_at < now() - interval '1 minute' * min_age_minutes;
END;
$$ LANGUAGE plpgsql;
