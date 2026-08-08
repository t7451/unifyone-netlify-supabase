/**
 * server/routers/routePulse/routePulse.service.ts
 *
 * RoutePulse — hyperlocal route intelligence layer.
 *
 * Data flow per request:
 *   1. Check routes_cache (Supabase) for a fresh (<2min) identical request.
 *   2. Fetch base route(s) from OSRM (with alternatives), falling back to
 *      TomTom if OSRM is unreachable and TOMTOM_API_KEY is configured.
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

export type GeocodedPoint = LatLng & {
  /** Human-readable place name as resolved by the geocoder, for display. */
  displayName: string;
};

export class GeocodingError extends TRPCError {
  constructor(message: string) {
    super({ code: "NOT_FOUND", message });
  }
}

// In-memory geocode cache — avoids re-hitting Nominatim for repeat addresses
// within the same warm serverless instance. Ephemeral by design (dies on
// cold start); Nominatim's usage policy discourages heavy caching in a
// shared/durable store without their sign-off, so this stays best-effort.
const GEOCODE_CACHE_TTL_MS = 30 * 60 * 1000;
const GEOCODE_CACHE_MAX_ENTRIES = 500;
const geocodeCache = new Map<
  string,
  { value: GeocodedPoint; expiresAt: number }
>();

function geocodeCacheKey(address: string): string {
  return address.trim().toLowerCase();
}

function readGeocodeCache(address: string): GeocodedPoint | null {
  const entry = geocodeCache.get(geocodeCacheKey(address));
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    geocodeCache.delete(geocodeCacheKey(address));
    return null;
  }
  return entry.value;
}

function writeGeocodeCache(address: string, value: GeocodedPoint) {
  if (geocodeCache.size >= GEOCODE_CACHE_MAX_ENTRIES) {
    // Evict the oldest entry (Map preserves insertion order) rather than
    // letting this grow unbounded across a long-lived warm instance.
    const oldestKey = geocodeCache.keys().next().value;
    if (oldestKey !== undefined) geocodeCache.delete(oldestKey);
  }
  geocodeCache.set(geocodeCacheKey(address), {
    value,
    expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
  });
}

/** Test-only: clears the in-memory geocode cache between test cases. */
export function _resetGeocodeCacheForTests() {
  geocodeCache.clear();
}

async function geocodeViaNominatim(
  trimmed: string
): Promise<GeocodedPoint | null> {
  const url =
    `${ENV.nominatimUrl}/search?format=jsonv2&limit=1&countrycodes=us` +
    `&q=${encodeURIComponent(trimmed)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        // Required by Nominatim's usage policy — identifies the app and a
        // contact point so OSM can reach us if something needs attention.
        "User-Agent": ENV.nominatimUserAgent,
        Accept: "application/json",
      },
    });
  } catch (err) {
    console.warn("[routePulse] Nominatim unreachable:", err);
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Address lookup is temporarily unavailable. Try again shortly.",
    });
  }

  if (!res.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Address lookup is temporarily unavailable. Try again shortly.",
    });
  }

  const results = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  const top = results[0];
  if (!top) return null;

  const lat = parseFloat(top.lat);
  const lng = parseFloat(top.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng, displayName: top.display_name };
}

/**
 * Fallback geocoder for real US addresses Nominatim's plain-text matcher
 * chokes on — most commonly renamed/accented official street names (e.g.
 * Portland's "SE César E. Chávez Blvd", formerly 39th Ave) where a user's
 * plain-ASCII or slightly-off typed version doesn't fuzzy-match OSM's name
 * tokenization, even though it's an unambiguous, correct USPS address.
 * The Census Bureau's geocoder is free, keyless, and built directly on
 * TIGER/Line address ranges, so it's materially more tolerant of exactly
 * this kind of variation. Never throws — a miss here just means "no match
 * from either geocoder," which the caller turns into the NOT_FOUND message.
 */
async function geocodeViaCensus(
  trimmed: string
): Promise<GeocodedPoint | null> {
  const url =
    `${ENV.censusGeocoderUrl}?benchmark=Public_AR_Current&format=json` +
    `&address=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      result?: {
        addressMatches?: Array<{
          coordinates: { x: number; y: number };
          matchedAddress: string;
        }>;
      };
    };

    const top = body.result?.addressMatches?.[0];
    if (!top) return null;

    const lat = top.coordinates.y;
    const lng = top.coordinates.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng, displayName: top.matchedAddress };
  } catch (err) {
    // Best-effort fallback — a Census outage should degrade to the normal
    // "couldn't find that address" message, not a hard 502.
    console.warn("[routePulse] Census geocoder fallback failed:", err);
    return null;
  }
}

/**
 * Resolves a free-text address to coordinates. Tries Nominatim
 * (OpenStreetMap's free geocoder) first, then falls back to the US Census
 * Bureau's free geocoder for real addresses Nominatim can't fuzzy-match
 * (see geocodeViaCensus). Bias toward the US since incident coverage is
 * Oregon/SW Washington today; callers doing national/global routing later
 * can drop or parameterize this.
 */
export async function geocodeAddress(address: string): Promise<GeocodedPoint> {
  const trimmed = address.trim();
  if (trimmed.length < 3) {
    throw new GeocodingError("Enter a more complete address.");
  }

  const cached = readGeocodeCache(trimmed);
  if (cached) return cached;

  const point =
    (await geocodeViaNominatim(trimmed)) ?? (await geocodeViaCensus(trimmed));

  if (!point) {
    throw new GeocodingError(
      `Couldn't find "${trimmed}". Try adding a city and state.`
    );
  }

  writeGeocodeCache(trimmed, point);
  return point;
}

export type RouteIncident = {
  id: string;
  incident_type: string;
  severity: "minor" | "moderate" | "major" | "critical";
  description: string | null;
  road_name: string | null;
  source: string;
  lat: number;
  lng: number;
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
  origin: GeocodedPoint;
  destination: GeocodedPoint;
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

type BaseRoute = {
  distance: number;
  duration: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
};

async function fetchOSRM(
  origin: LatLng,
  destination: LatLng
): Promise<BaseRoute[]> {
  const url =
    `${ENV.osrmUrl}/route/v1/driving/` +
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?alternatives=true&geometries=geojson&overview=full`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM error (${res.status})`);
  }
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    // A clean "no route" answer from a healthy OSRM — not an outage, so
    // don't fall back to TomTom for this, just surface it as NOT_FOUND.
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No route found between those points",
    });
  }
  return data.routes;
}

async function fetchTomTomFallback(
  origin: LatLng,
  destination: LatLng
): Promise<BaseRoute[]> {
  const apiKey = ENV.tomtomApiKey;
  if (!apiKey) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Routing engine unavailable",
    });
  }

  const url =
    `https://api.tomtom.com/routing/1/calculateRoute/` +
    `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json` +
    `?key=${apiKey}&maxAlternatives=2&traffic=true`;

  const res = await fetch(url);
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) {
    // Fallback itself is down too — nothing left to try.
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Routing engine unavailable",
    });
  }
  const data = await res.json();
  const routes = data.routes as
    | Array<{
        summary: { lengthInMeters: number; travelTimeInSeconds: number };
        legs: Array<{
          points: Array<{ latitude: number; longitude: number }>;
        }>;
      }>
    | undefined;

  if (!routes?.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No route found between those points",
    });
  }

  // TomTom returns lat/lng per point, split across legs — flatten to a
  // single [lng, lat] coordinate list to match OSRM's GeoJSON shape, which
  // is what incidents_near_route(), the cache, and the client all expect.
  return routes.map(r => ({
    distance: r.summary.lengthInMeters,
    duration: r.summary.travelTimeInSeconds,
    geometry: {
      type: "LineString" as const,
      coordinates: r.legs.flatMap(leg =>
        leg.points.map(p => [p.longitude, p.latitude] as [number, number])
      ),
    },
  }));
}

async function fetchBaseRoutes(
  origin: LatLng,
  destination: LatLng
): Promise<BaseRoute[]> {
  try {
    return await fetchOSRM(origin, destination);
  } catch (err) {
    if (err instanceof TRPCError) throw err; // clean NOT_FOUND, don't retry
    console.warn("[routePulse] OSRM unreachable, trying TomTom fallback:", err);
    return await fetchTomTomFallback(origin, destination);
  }
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
    lat: row.lat as number,
    lng: row.lng as number,
  }));
}

// Incident descriptions/road names come from third-party feeds (ODOT,
// Road511) verbatim — treat them as untrusted input before they go into an
// LLM prompt. Strips characters that could break out of the JSON we're
// embedding them in or read as instructions, and caps length.
function sanitizeForPrompt(text: string | null): string {
  if (!text) return "";
  return text.replace(/[{}]/g, "").replace(/["\\]/g, "").slice(0, 200);
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
        description: sanitizeForPrompt(i.description),
        road_name: sanitizeForPrompt(i.road_name),
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

    // The model's output feeds directly into which route we serve and what
    // we tell the user — validate shape and bounds before trusting it.
    if (
      typeof parsed.chosen_index !== "number" ||
      !Number.isInteger(parsed.chosen_index) ||
      parsed.chosen_index < 0 ||
      parsed.chosen_index >= routes.length ||
      typeof parsed.explanation !== "string" ||
      parsed.explanation.length === 0 ||
      parsed.explanation.length > 500
    ) {
      throw new Error("AI response failed schema validation");
    }

    return {
      chosenIndex: parsed.chosen_index,
      explanation: parsed.explanation,
    };
  } catch (err) {
    // AI scoring is an enhancement, never a hard dependency.
    console.warn("[routePulse] AI scoring failed, falling back:", err);
    return { chosenIndex: 0, explanation: "Fastest available route." };
  }
}

export async function getRoute(
  originAddress: string,
  destinationAddress: string
): Promise<RouteResult> {
  // Geocode first — the cache key and every downstream step depends on
  // resolved coordinates, and a bad address should fail fast with a clear
  // message rather than an OSRM "no route" error.
  const [origin, destination] = await Promise.all([
    geocodeAddress(originAddress),
    geocodeAddress(destinationAddress),
  ]);

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
    origin,
    destination,
    generated_at: new Date().toISOString(),
    cached: false,
  };

  await writeCache(key, result);
  return result;
}

export async function listActiveIncidents() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  // RPC (not a plain table select) — PostgREST doesn't expose ST_X/ST_Y on a
  // raw select, so lat/lng extraction happens server-side in Postgres, same
  // pattern as incidents_near_route.
  const { data, error } = await supabase.rpc("list_active_incidents", {
    limit_n: 200,
  });

  if (error || !data) return [];
  // Note: unfiltered by area today. For larger coverage regions, add a
  // bbox param backed by a PostGIS RPC (same pattern as incidents_near_route)
  // rather than filtering client-side.
  return data as Array<{
    id: string;
    source: string;
    road_name: string | null;
    direction: string | null;
    incident_type: string;
    severity: RouteIncident["severity"];
    description: string | null;
    location_description: string | null;
    started_at: string | null;
    estimated_end_at: string | null;
    source_url: string | null;
    lat: number;
    lng: number;
  }>;
}
