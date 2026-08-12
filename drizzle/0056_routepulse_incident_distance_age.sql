-- ── Migration 0056: incidents_near_route gets distance + age ────────────────
--
-- Route-risk scoring (computeRouteRisk in routePulse.service.ts) has always
-- treated every incident on a route identically once it passed the binary
-- "within 500m of the route" filter — a fender-bender 480m off the route
-- (on a parallel frontage road, say) counted exactly as much as one
-- straddling the lane you're actually driving in. It also had zero
-- awareness of how OLD an incident report is: a Waze hazard report from
-- 3 hours ago (quite possibly already cleared, but not yet marked
-- cleared_at in the feed) counted exactly as much as one from 2 minutes
-- ago.
--
-- This closes both gaps by adding two columns to what incidents_near_route
-- already computes internally (it ORDERs BY ST_Distance today but never
-- returns it) plus started_at, which was already stored on every incident
-- but never selected here.
--
-- ADDITIVE in effect, breaking in signature: the return TABLE shape
-- changes (two new columns), so this needs DROP + CREATE rather than
-- CREATE OR REPLACE (Postgres won't let you change a table function's
-- OUT columns via REPLACE). Every caller (getIncidentsNearRoute in
-- routePulse.service.ts) is updated in this same change to select the new
-- columns — nothing is left calling the old 9-column shape.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.incidents_near_route(text, double precision);

CREATE FUNCTION public.incidents_near_route(
  route_wkt text,
  buffer_meters double precision
)
RETURNS TABLE(
  id uuid, source text, incident_type text, severity text,
  description text, road_name text, location_description text,
  lat double precision, lng double precision,
  distance_m double precision, started_at timestamptz
)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    i.id, i.source, i.incident_type, i.severity,
    i.description, i.road_name, i.location_description,
    ST_Y(i.location::geometry) AS lat,
    ST_X(i.location::geometry) AS lng,
    ST_Distance(i.location::geography, ST_GeogFromText(route_wkt)) AS distance_m,
    -- started_at is sometimes null on feeds that don't report a distinct
    -- start time separately from ingestion — reported_at is populated on
    -- every row, so fall back to that rather than surfacing a null age
    -- that the risk-scoring decay would have to special-case anyway.
    COALESCE(i.started_at, i.reported_at) AS started_at
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
$function$;
