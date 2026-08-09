-- 0054_routepulse_restore_clearance_fn.sql
--
-- mark_incidents_cleared() was present in 0051_routepulse_init.sql's intent
-- but was absent from the live production database when audited on
-- 2026-08-09 — the scheduled ingestion function (routepulse-ingest-
-- scheduled.mts) has been calling it every 2min cycle since launch and
-- silently failing (its catch block only logs, doesn't throw), so
-- incidents were never being auto-cleared. 336 incidents were found stuck
-- "active" in production at audit time, 285 of them >6h old, one from
-- 2021. This migration restores it, with search_path hardening added.
--
-- Also hardens cameras_near_route / list_cameras (from 0051/0053), which
-- existed but lacked SET search_path, flagged by Supabase's security
-- advisor as function_search_path_mutable.

CREATE OR REPLACE FUNCTION public.mark_incidents_cleared(
  p_source text,
  active_ids text[],
  min_age_minutes int
) RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
  UPDATE traffic_incidents
  SET cleared_at = now()
  WHERE cleared_at IS NULL
    AND source = p_source
    AND external_id IS NOT NULL
    AND external_id <> ALL(active_ids)
    AND started_at < now() - interval '1 minute' * min_age_minutes;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cameras_near_route(route_wkt text, buffer_meters double precision)
 RETURNS TABLE(id text, road_name text, direction text, image_url text, thumbnail_url text, description text, last_updated timestamp with time zone, lat double precision, lng double precision)
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
$function$;

CREATE OR REPLACE FUNCTION public.list_cameras(limit_n integer DEFAULT 300)
 RETURNS TABLE(id text, road_name text, direction text, image_url text, thumbnail_url text, description text, last_updated timestamp with time zone, lat double precision, lng double precision)
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
  ORDER BY c.last_updated DESC NULLS LAST
  LIMIT limit_n;
END;
$function$;

-- RLS on the three RoutePulse-facing tables (traffic_incidents, routes_cache,
-- traffic_cameras) was also enabled directly on production on 2026-08-09 —
-- captured here too so a fresh environment built from migrations alone
-- matches production instead of leaving these open via PostgREST to the
-- anon key (the client bundle does hold a Supabase anon client for other
-- features, so an un-RLS'd table here is a live write target for anyone).
ALTER TABLE traffic_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes_cache      ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_cameras   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "public read" ON traffic_incidents FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "public read" ON traffic_cameras FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- routes_cache: intentionally no policy — RLS with zero policies is
-- default-deny for anon/authenticated, and it's only ever touched by the
-- service-role key inside routePulse.service.ts, which bypasses RLS.
