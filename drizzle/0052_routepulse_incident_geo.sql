-- ── Migration 0052: RoutePulse incident geo ──────────────────────────────────
--
-- traffic_incidents.location is a real PostGIS geography(point) column, but
-- neither incidents_near_route() nor the client's active-incidents feed
-- exposed lat/lng — so RoutePulse could describe an incident in text but
-- never plot it. This adds lat/lng to both, so the map can show incident
-- markers instead of just a route line.
--
-- Run this after 0051_routepulse_init.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- incidents_near_route(route_wkt, buffer_meters) — add lat/lng columns.
-- Return type is changing (new OUT columns), so this needs DROP + CREATE
-- rather than CREATE OR REPLACE.
DROP FUNCTION IF EXISTS incidents_near_route(text, float);

CREATE FUNCTION incidents_near_route(route_wkt text, buffer_meters float)
RETURNS TABLE(
  id uuid, source text, incident_type text, severity text,
  description text, road_name text, location_description text,
  lat float, lng float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id, i.source, i.incident_type, i.severity,
    i.description, i.road_name, i.location_description,
    ST_Y(i.location::geometry) AS lat,
    ST_X(i.location::geometry) AS lng
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

-- list_active_incidents(limit_n) — geo-aware equivalent of the plain table
-- select routePulse.service.ts's listActiveIncidents() previously used.
-- PostgREST doesn't expose ST_X/ST_Y on a raw select, so this needs to be
-- an RPC like incidents_near_route rather than a `.from("traffic_incidents")`
-- query with lat/lng included.
CREATE OR REPLACE FUNCTION list_active_incidents(limit_n int DEFAULT 200)
RETURNS TABLE(
  id uuid, source text, road_name text, direction text,
  incident_type text, severity text, description text,
  location_description text, started_at timestamptz,
  estimated_end_at timestamptz, source_url text,
  lat float, lng float
) AS $$
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
  ORDER BY i.started_at DESC NULLS LAST
  LIMIT limit_n;
END;
$$ LANGUAGE plpgsql;
