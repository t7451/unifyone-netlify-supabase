-- ── Migration 0057: RoutePulse historical bottleneck density ──────────────────
--
-- Powers the premium "chronic bottleneck" signal: how often incidents show up
-- along a candidate corridor over the last N days (active + cleared).
--
-- NOTE: live traffic_incidents may not have created_at (schema drift from the
-- original 0051 file). Use started_at / cleared_at only — those are present on
-- the production table and used throughout ingest + RPCs.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION incident_density_near_route(
  route_wkt text,
  buffer_meters float DEFAULT 400,
  days_back int DEFAULT 21
)
RETURNS TABLE(
  incident_count bigint,
  major_or_worse bigint,
  congestion_count bigint,
  latest_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH route AS (
    SELECT ST_GeogFromText(route_wkt) AS g
  )
  SELECT
    COUNT(*)::bigint AS incident_count,
    COUNT(*) FILTER (
      WHERE ti.severity IN ('major', 'critical')
    )::bigint AS major_or_worse,
    COUNT(*) FILTER (
      WHERE ti.incident_type ILIKE '%jam%'
         OR ti.incident_type ILIKE '%congestion%'
         OR ti.incident_type ILIKE '%traffic%'
         OR ti.incident_type ILIKE '%slow%'
    )::bigint AS congestion_count,
    MAX(COALESCE(ti.started_at, ti.cleared_at)) AS latest_at
  FROM traffic_incidents ti, route
  WHERE COALESCE(ti.started_at, ti.cleared_at) >= (now() - make_interval(days => days_back))
    AND ST_DWithin(ti.location, route.g, buffer_meters);
$$;

COMMENT ON FUNCTION incident_density_near_route(text, float, int) IS
  'RoutePulse v22: historical incident density along a route for bottleneck scoring';
