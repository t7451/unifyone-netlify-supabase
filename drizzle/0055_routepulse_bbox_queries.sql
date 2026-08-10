-- ── Migration 0055: RoutePulse geofenced bbox queries ────────────────────────
--
-- listActiveIncidents()/listCameras() (list_active_incidents / list_cameras
-- RPCs) have always returned the whole state's active feed, unfiltered by
-- area — flagged directly in the code as a known gap: "unfiltered by area
-- today. For larger coverage regions, add a bbox param backed by a PostGIS
-- RPC (same pattern as incidents_near_route) rather than filtering
-- client-side." This adds exactly that: bbox-scoped variants so the
-- always-on map layer only pulls what's actually near the driver, instead
-- of every incident/camera statewide regardless of where the map is
-- pointed.
--
-- These are ADDITIVE — list_active_incidents/list_cameras (no bbox) are
-- untouched and still work for any caller that wants the full feed. The
-- client switches to the _in_bbox versions in this same change; nothing
-- else needs to migrate.
--
-- Uses ST_MakeEnvelope + ST_Intersects (not ST_DWithin, which needs a
-- center point + radius) since a Leaflet map bounds object is naturally a
-- box, not a circle — and both traffic_incidents.location and
-- traffic_cameras.location already have a GIST index (0051), so this can
-- use it via the geometry intersects operator.
--
-- Run this after 0054_routepulse_restore_clearance_fn.sql.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_active_incidents_in_bbox(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  limit_n int DEFAULT 200
)
RETURNS TABLE(
  id uuid, source text, road_name text, direction text,
  incident_type text, severity text, description text,
  location_description text, started_at timestamptz,
  estimated_end_at timestamptz, source_url text,
  lat float, lng float
)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    i.id, i.source, i.road_name, i.direction,
    i.incident_type, i.severity, i.description,
    i.location_description, i.started_at,
    i.estimated_end_at, i.source_url,
    ST_Y(i.location::geometry) AS lat,
    ST_X(i.location::geometry) AS lng
  FROM traffic_incidents i
  WHERE i.cleared_at IS NULL
    AND ST_Intersects(
      i.location::geometry,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
  ORDER BY i.started_at DESC NULLS LAST
  LIMIT limit_n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_cameras_in_bbox(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  limit_n int DEFAULT 300
)
RETURNS TABLE(
  id text, road_name text, direction text, image_url text,
  thumbnail_url text, description text,
  last_updated timestamp with time zone,
  lat double precision, lng double precision
)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.road_name, c.direction,
    c.image_url, c.thumbnail_url, c.description,
    c.last_updated,
    ST_Y(c.location::geometry) AS lat,
    ST_X(c.location::geometry) AS lng
  FROM traffic_cameras c
  WHERE ST_Intersects(
    c.location::geometry,
    ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  )
  ORDER BY c.last_updated DESC NULLS LAST
  LIMIT limit_n;
END;
$function$;
