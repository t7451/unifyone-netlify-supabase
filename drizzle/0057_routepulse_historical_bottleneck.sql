-- ── Migration 0057: RoutePulse historical bottleneck density ──────────────────
--
-- Powers the premium "chronic bottleneck" signal: how often incidents show up
-- along a candidate corridor over the last N days (active + cleared).
-- Used by routePulse.service computeRouteScores / valueInsight so ranking can
-- prefer routes that historically stay clear — not just clear *right now*.
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
    MAX(COALESCE(ti.started_at, ti.created_at)) AS latest_at
  FROM traffic_incidents ti, route
  WHERE COALESCE(ti.started_at, ti.created_at) >= (now() - make_interval(days => days_back))
    AND ST_DWithin(ti.location, route.g, buffer_meters);
$$;

COMMENT ON FUNCTION incident_density_near_route(text, float, int) IS
  'RoutePulse v22: historical incident density along a route for bottleneck scoring';
