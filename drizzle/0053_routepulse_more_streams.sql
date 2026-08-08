-- ── Migration 0053: RoutePulse more data streams + camera RPCs ─────────────
--
-- Two new incident sources (NWS weather alerts, WSDOT highway alerts) and
-- geo-aware camera RPCs so RoutePulse can plot traffic cameras on the map
-- and alongside a scored route, the same way incidents work.
--
--   1. traffic_incidents.source CHECK gains 'nws' and 'wsdot'. Without
--      this, ingestion of the new streams fails on the constraint.
--   2. cameras_near_route(route_wkt, buffer_meters) — mirrors
--      incidents_near_route; used by routePulse.service.ts getRoute().
--   3. list_cameras(limit_n) — geo-aware camera feed for the always-on map
--      layer (PostgREST can't expose ST_X/ST_Y on a raw select).
--
-- Run this after 0052_routepulse_incident_geo.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. widen the source CHECK ───────────────────────────────────────────────
-- The constraint was declared inline on the column in 0051, so Postgres
-- auto-named it traffic_incidents_source_check (default naming).
ALTER TABLE "traffic_incidents"
  DROP CONSTRAINT IF EXISTS "traffic_incidents_source_check";

ALTER TABLE "traffic_incidents"
  ADD CONSTRAINT "traffic_incidents_source_check"
  CHECK ("source" IN (
    'road511', 'odot_tripcheck', 'news_ai', 'user_report', 'nws', 'wsdot'
  ));

-- ── 2. cameras_near_route(route_wkt, buffer_meters) ─────────────────────────
-- Cameras are sparser than incidents, so callers use a wider buffer
-- (routePulse.service.ts passes 1500m vs 500m for incidents).
CREATE OR REPLACE FUNCTION cameras_near_route(route_wkt text, buffer_meters float)
RETURNS TABLE(
  id text, road_name text, direction text,
  image_url text, thumbnail_url text, description text,
  last_updated timestamptz,
  lat float, lng float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.road_name, c.direction,
    c.image_url, c.thumbnail_url, c.description,
    c.last_updated,
    ST_Y(c.location::geometry) AS lat,
    ST_X(c.location::geometry) AS lng
  FROM traffic_cameras c
  WHERE ST_DWithin(
      c.location::geography,
      ST_GeogFromText(route_wkt),
      buffer_meters
    )
  ORDER BY ST_Distance(
    c.location::geography,
    ST_GeogFromText(route_wkt)
  );
END;
$$ LANGUAGE plpgsql;

-- ── 3. list_cameras(limit_n) ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION list_cameras(limit_n int DEFAULT 300)
RETURNS TABLE(
  id text, road_name text, direction text,
  image_url text, thumbnail_url text, description text,
  last_updated timestamptz,
  lat float, lng float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.road_name, c.direction,
    c.image_url, c.thumbnail_url, c.description,
    c.last_updated,
    ST_Y(c.location::geometry) AS lat,
    ST_X(c.location::geometry) AS lng
  FROM traffic_cameras c
  ORDER BY c.last_updated DESC NULLS LAST
  LIMIT limit_n;
END;
$$ LANGUAGE plpgsql;
