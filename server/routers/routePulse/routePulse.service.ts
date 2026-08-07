/**
 * server/routers/routePulse/routePulse.service.ts
 *
 * RoutePulse — hyperlocal route intelligence layer.
 *
 * Data flow per request:
 *   1. Check routes_cache (Supabase) for a fresh (<2min) identical request.
 *   2. Fetch base route(s) from OSRM (with alternatives).
 *   3. For each route, query active incidents within a buffer of the path
 *      via the `incidents_near_route` PostGIS RPC (Supabase).
 *   4. If any route has incidents, ask the LLM router (free-tier OpenRouter
 *      models via server/lib/kaiModels, with automatic fallback across
 *      providers) to pick the best one and explain why in one sentence.
 *   5. Cache and return.
 *
 * Incident data itself is populated by the scheduled ingestion function
 * (netlify/functions/routepulse-ingest-scheduled.mts), which polls Road511
 * + ODOT TripCheck every 2 minutes.
 */
import { TRPCError } from "@trpc/server";
import { getSupabaseAdmin } from "../../_core/supabaseAdmin";
import { ENV } from "../../_core/env";
import { invokeLLM } from "../../_core/llm";
import { resolveKaiModel } from "../../lib/kaiModels";

const CACHE_TTL_MS = 2 * 60 * 1000;

export type LatLng = { lat: number; lng: number };

export type RouteIncident = {
  id: string;
  incident_type: string;
  severity: "minor" | "moderate" | "major" | "critical";
  description: string | null;
  road_name: string | null;
  source: string;
};

export type ScoredRoute = {
  distance: number;
  duration: number;
  geometry: unknown;
  incidents: RouteIncident[];
};

export type RouteResult = {
  route: ScoredRoute;
  explanation: string;
  alternatives: ScoredRoute[];
  generated_at: string;
  cached: boolean;
};

function cacheKey(origin: LatLng, destination: LatLng) {
  return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}_${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
}

async function readCache(key: string): Promise<RouteResult | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const sinceIso = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from("routes_cache")
    .select("result, created_at")
    .eq("cache_key", key)
    .gt("created_at", sinceIso)
    .maybeSingle();

  if (error || !data) return null;
  return { ...(data.result as RouteResult), cached: true };
}

async function writeCache(key: string, result: RouteResult) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase
    .from("routes_cache")
    .upsert({ cache_key: key, result, created_at: new Date().toISOString() });
}

async function fetchBaseRoutes(origin: LatLng, destination: LatLng) {
  const url =
    `${ENV.osrmUrl}/route/v1/driving/` +
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?alternatives=true&geometries=geojson&overview=full`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `Routing engine error (${res.status})`,
    });
  }
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No route found between those points",
    });
  }
  return data.routes as Array<{
    distance: number;
    duration: number;
    geometry: { type: "LineString"; coordinates: [number, number][] };
  }>;
}

async function getIncidentsNearRoute(
  geometry: { coordinates: [number, number][] },
  bufferMeters = 500
): Promise<RouteIncident[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  // OSRM caps geometry precision fine; PostGIS just needs valid WKT.
  const lineWkt = `LINESTRING(${geometry.coordinates
    .map(([lng, lat]) => `${lng} ${lat}`)
    .join(",")})`;

  const { data, error } = await supabase.rpc("incidents_near_route", {
    route_wkt: lineWkt,
    buffer_meters: bufferMeters,
  });

  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map(row => ({
    id: row.id as string,
    incident_type: row.incident_type as string,
    severity: row.severity as RouteIncident["severity"],
    description: (row.description as string | null) ?? null,
    road_name: (row.road_name as string | null) ?? null,
    source: row.source as string,
  }));
}

async function scoreRoutesWithAI(
  routes: ScoredRoute[]
): Promise<{ chosenIndex: number; explanation: string }> {
  const prompt = `You are comparing driving routes. Pick the best one considering active incidents.
Routes: ${JSON.stringify(
    routes.map(r => ({
      distance_m: r.distance,
      duration_s: r.duration,
      incidents: r.incidents.map(i => ({
        type: i.incident_type,
        severity: i.severity,
        description: i.description,
        road_name: i.road_name,
      })),
    }))
  )}

Respond ONLY with JSON: { "chosen_index": 0, "explanation": "one sentence, cite the specific incident if relevant" }`;

  try {
    // Free-tier model, routed through OpenRouter (invokeLLMWithFallback
    // falls back to Groq / Vercel AI Gateway if OpenRouter is ever unset)
    // — never charges Kai credits, never touches Gemini.
    const model = resolveKaiModel("hermes-3-405b");
    const result = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      model: model.gatewayModel,
      modelChain: model.fallbackModels,
      maxTokens: 300,
    });

    const text = (result.choices[0]?.message.content ?? "")
      .toString()
      .replace(/```json|```/g, "")
      .trim();
    const parsed = JSON.parse(text);
    return {
      chosenIndex: parsed.chosen_index ?? 0,
      explanation: parsed.explanation ?? "Best available route.",
    };
  } catch (err) {
    // AI scoring is an enhancement, never a hard dependency.
    console.warn("[routePulse] AI scoring failed, falling back:", err);
    return { chosenIndex: 0, explanation: "Fastest available route." };
  }
}

export async function getRoute(
  origin: LatLng,
  destination: LatLng
): Promise<RouteResult> {
  const key = cacheKey(origin, destination);

  const cached = await readCache(key);
  if (cached) return cached;

  const baseRoutes = await fetchBaseRoutes(origin, destination);

  const scoredRoutes: ScoredRoute[] = await Promise.all(
    baseRoutes.map(async r => ({
      distance: r.distance,
      duration: r.duration,
      geometry: r.geometry,
      incidents: await getIncidentsNearRoute(r.geometry),
    }))
  );

  const hasIncidents = scoredRoutes.some(r => r.incidents.length > 0);

  let chosenIndex = 0;
  let explanation = "Fastest route, no active incidents.";
  if (hasIncidents) {
    const ai = await scoreRoutesWithAI(scoredRoutes);
    chosenIndex = ai.chosenIndex;
    explanation = ai.explanation;
  }

  const result: RouteResult = {
    route: scoredRoutes[chosenIndex] ?? scoredRoutes[0],
    explanation,
    alternatives: scoredRoutes,
    generated_at: new Date().toISOString(),
    cached: false,
  };

  await writeCache(key, result);
  return result;
}

export async function listActiveIncidents() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("traffic_incidents")
    .select(
      "id, source, road_name, direction, incident_type, severity, description, location_description, started_at, estimated_end_at, source_url"
    )
    .is("cleared_at", null)
    .order("started_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];
  // Note: unfiltered by area today. For larger coverage regions, add a
  // bbox param backed by a PostGIS RPC (same pattern as incidents_near_route)
  // rather than filtering client-side.
  return data;
}
