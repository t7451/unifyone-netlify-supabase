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
 *   4. Score every route deterministically (0-100 risk score + estimated
 *      delay minutes from incident severities) so the response is useful
 *      even when the LLM is unavailable, and so the AI prompt reasons over
 *      quantified tradeoffs rather than raw incident lists.
 *   5. If any route has incidents, ask the LLM router (free-tier OpenRouter
 *      models via server/lib/kaiModels, with automatic fallback across
 *      providers) to pick the best one and explain why in driver-actionable
 *      language. If the AI fails validation or is unreachable, fall back to
 *      a deterministic pick: lowest (duration + estimated incident delay).
 *   6. Attach traffic cameras near the chosen route (cameras_near_route
 *      RPC) so the driver can eyeball actual road conditions.
 *   7. Cache and return.
 *
 * Incident data itself is populated by the scheduled ingestion function
 * (netlify/functions/routepulse-ingest-scheduled.mts), which polls Road511
 * + ODOT TripCheck + NWS weather alerts + WSDOT highway alerts every 2
 * minutes, and ODOT's camera list every ~5 minutes.
 *
 * v10: live third-party grounding (externalGrounding.ts). On each uncached
 * request the scoring loop also merges TomTom Traffic incidents + Waze
 * crowdsourced alerts for the route bbox (deduped against the agency
 * feeds), and samples TomTom live traffic flow along each route so the
 * risk score, delay estimate, and AI prompt reason over *measured* current
 * speeds — congestion that hasn't generated an incident report yet — not
 * just reported incidents. Keys unset = clean no-ops.
 */
import { TRPCError } from "@trpc/server";
import { getSupabaseAdmin } from "../../_core/supabaseAdmin";
import { ENV } from "../../_core/env";
import { invokeLLM } from "../../_core/llm";
import { resolveKaiModel } from "../../lib/kaiModels";
import {
  bboxForGeometries,
  dedupeIncidents,
  fetchTomTomFlow,
  fetchTomTomTrafficIncidents,
  fetchWazeAlerts,
  isNearRoute,
  type FlowGrounding,
} from "./externalGrounding";

const CACHE_TTL_MS = 2 * 60 * 1000;

/**
 * fetch() with a hard timeout via AbortController. Without this, a slow
 * upstream (Nominatim under load is the realistic one) hangs the request
 * until the platform's own function timeout kills it, instead of failing
 * fast into the next fallback (Census geocoder, or OSRM -> TomTom). Default
 * of 5s is generous for these APIs in normal operation but short enough
 * that a stalled upstream doesn't eat the whole request budget.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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
    res = await fetchWithTimeout(url, {
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
    const res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
    });
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

/**
 * Lightweight address suggestion lookup for typeahead UI. Calls Nominatim
 * with a higher result limit and returns display names only — no coordinate
 * resolution, no Census fallback. Designed to be called on every keystroke
 * (with client-side debounce) so it must stay fast and never throw.
 *
 * Nominatim's usage policy asks for no more than 1 req/sec; the client
 * debounces at 400ms and only fires after 4+ characters to stay well under
 * that threshold in practice.
 */
export async function suggestAddresses(
  query: string
): Promise<{ suggestions: string[] }> {
  const trimmed = query.trim();
  if (trimmed.length < 4) return { suggestions: [] };

  const url =
    `${ENV.nominatimUrl}/search?format=jsonv2&limit=5&countrycodes=us` +
    `&q=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": ENV.nominatimUserAgent,
        Accept: "application/json",
      },
    });
    if (!res.ok) return { suggestions: [] };

    const results = (await res.json()) as Array<{
      display_name: string;
    }>;

    return {
      suggestions: results
        .map(r => r.display_name)
        .filter((s): s is string => typeof s === "string" && s.length > 0),
    };
  } catch (err) {
    console.warn("[routePulse] Nominatim suggestion failed:", err);
    return { suggestions: [] };
  }
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

// Deterministic risk model — the backbone of the "beats Google" claim.
// Google shows a red line after traffic has already slowed; we quantify
// *why* a route is risky before the driver commits, per route option.
const SEVERITY_RISK_WEIGHT: Record<RouteIncident["severity"], number> = {
  minor: 3,
  moderate: 8,
  major: 20,
  critical: 40,
};
const SEVERITY_DELAY_MIN: Record<RouteIncident["severity"], number> = {
  minor: 2,
  moderate: 5,
  major: 10,
  critical: 15,
};
// Pile-ups happen (a storm can stack 8+ incidents on one corridor) — cap so
// one bad corridor reads as "very risky", not "literally impossible".
const MAX_RISK_SCORE = 100;
const MAX_DELAY_MIN = 45;

export type RouteRisk = {
  /** 0-100 severity-weighted risk score. 0 = no known incidents. */
  riskScore: number;
  /** Estimated extra minutes the active incidents add to this trip. */
  delayEstimateMin: number;
};

/**
 * Deterministic, explainable per-route risk scoring. Exported so the client
 * (and tests) can reason about exactly how a score was produced — the same
 * numbers feed the AI prompt, the comparison UI, and the leave-by buffer,
 * so they must be boring, stable, and unit-testable.
 */
export function computeRouteRisk(incidents: RouteIncident[]): RouteRisk {
  let riskScore = 0;
  let delayEstimateMin = 0;
  for (const inc of incidents) {
    riskScore += SEVERITY_RISK_WEIGHT[inc.severity] ?? SEVERITY_RISK_WEIGHT.minor;
    delayEstimateMin +=
      SEVERITY_DELAY_MIN[inc.severity] ?? SEVERITY_DELAY_MIN.minor;
  }
  return {
    riskScore: Math.min(MAX_RISK_SCORE, riskScore),
    delayEstimateMin: Math.min(MAX_DELAY_MIN, delayEstimateMin),
  };
}

/**
 * One driving step from the routing engine (OSRM `steps=true`), reduced to
 * exactly what the turn-by-turn UI and the congestion-colored map need.
 * `distanceM`/`durationS` are the step's own distance/time, so the client
 * can color each step by how its implied speed compares to the route
 * average — our free, keyless stand-in for Google's traffic-colored line.
 */
export type RouteManeuver = {
  /** Human instruction, e.g. "Turn left onto SE Division St". */
  instruction: string;
  /** OSRM maneuver type (turn, merge, roundabout, arrive, …). */
  type: string;
  /** OSRM maneuver modifier (left, slight right, …) when present. */
  modifier: string | null;
  /** Road name for this step, when the engine provides one. */
  roadName: string | null;
  distanceM: number;
  durationS: number;
  /** [lng, lat] where the maneuver happens (start of the step). */
  location: [number, number];
  /**
   * Step path as [lng, lat] pairs — lets the client draw per-step
   * congestion-colored polylines without a second geometry request.
   */
  coordinates: [number, number][];
};

export type ScoredRoute = {
  distance: number;
  duration: number;
  geometry: unknown;
  incidents: RouteIncident[];
  riskScore: number;
  delayEstimateMin: number;
  /**
   * Turn-by-turn steps. Empty when the routing engine can't provide them
   * (e.g. the TomTom fallback path) — the client hides the panel then.
   */
  maneuvers: RouteManeuver[];
  /**
   * v10: TomTom live-flow grounding for this route (null when
   * TOMTOM_API_KEY is unset or every sample failed). avgRatio is
   * current/free-flow speed — 1 means free-flowing, below ~0.7 is heavy.
   */
  flow?: FlowGrounding | null;
};

/** "none" = the AI did not pick this route (deterministic fallback was used). */
export type AiConfidence = "high" | "medium" | "low" | "none";

export type RouteCamera = {
  id: string;
  road_name: string | null;
  direction: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  last_updated: string | null;
  lat: number;
  lng: number;
};

export type RouteResult = {
  route: ScoredRoute;
  explanation: string;
  alternatives: ScoredRoute[];
  origin: GeocodedPoint;
  destination: GeocodedPoint;
  generated_at: string;
  cached: boolean;
  confidence: AiConfidence;
  cameras: RouteCamera[];
  /**
   * v10: how much live third-party grounding fed this result (null when no
   * external keys are configured). Powers the "grounded with live TomTom +
   * Waze data" UI chip and makes quota burn observable.
   */
  grounding?: {
    tomtomIncidents: number;
    wazeAlerts: number;
    flowSamples: number;
  } | null;
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
  const result = data.result as RouteResult;
  // Cache entries written before maneuvers existed (or by the TomTom
  // fallback) may lack the field — normalize so the client always sees an
  // array and the turn-by-turn panel simply hides when it's empty.
  const withManeuvers = (r: ScoredRoute): ScoredRoute => ({
    ...r,
    maneuvers: Array.isArray(r.maneuvers) ? r.maneuvers : [],
  });
  return {
    ...result,
    route: withManeuvers(result.route),
    alternatives: (result.alternatives ?? []).map(withManeuvers),
    cached: true,
  };
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
  maneuvers: RouteManeuver[];
};

/** OSRM maneuver type+modifier → driver instruction. Deterministic and
 *  terse on purpose: this text renders in the turn-by-turn list and must
 *  never depend on an LLM being reachable. */
function maneuverInstruction(
  type: string,
  modifier: string | null,
  roadName: string | null
): string {
  const road = roadName ? ` onto ${roadName}` : "";
  const onto = roadName ? ` on ${roadName}` : "";
  const mod = modifier ? modifier.replace(/_/g, " ") : "";

  switch (type) {
    case "depart":
      return roadName ? `Head out on ${roadName}` : "Head out";
    case "arrive":
      return "Arrive at your destination";
    case "turn":
      return mod ? `Turn ${mod}${road}` : `Turn${road}`;
    case "new name":
      return `Continue${onto}`;
    case "continue":
      return mod ? `Continue ${mod}${onto}` : `Continue${onto}`;
    case "merge":
      return mod ? `Merge ${mod}${road}` : `Merge${road}`;
    case "on ramp":
      return `Take the ramp${road}`;
    case "off ramp":
      return `Take the exit${road}`;
    case "fork":
      return mod ? `Keep ${mod} at the fork${road}` : `Keep straight at the fork${road}`;
    case "end of road":
      return mod ? `At the end of the road, turn ${mod}${road}` : `At the end of the road, turn${road}`;
    case "roundabout":
    case "rotary":
      return roadName
        ? `At the roundabout, take the exit${road}`
        : "Enter the roundabout";
    case "exit roundabout":
    case "exit rotary":
      return `Exit the roundabout${road}`;
    case "roundabout turn":
      return mod
        ? `At the roundabout, turn ${mod}${road}`
        : `At the roundabout, turn${road}`;
    case "notification":
      return "Continue";
    case "use lane":
      return mod ? `Keep ${mod}${onto}` : `Keep your lane${onto}`;
    default:
      return mod
        ? `${mod.charAt(0).toUpperCase()}${mod.slice(1)}${road}`
        : `Continue${onto}`;
  }
}

/** Raw OSRM route shape (only the fields we read). */
type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  legs?: Array<{
    steps?: Array<{
      distance: number;
      duration: number;
      name?: string;
      maneuver?: {
        type?: string;
        modifier?: string;
        location?: [number, number];
      };
      geometry?: { coordinates?: [number, number][] };
    }>;
  }>;
};

/** Extract turn-by-turn steps from an OSRM route. Defensive by design:
 *  any missing/malformed leg or step just yields fewer maneuvers, never a
 *  throw — routes without steps are still fully usable. */
function extractManeuvers(route: OsrmRoute): RouteManeuver[] {
  const out: RouteManeuver[] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const type = step.maneuver?.type ?? "continue";
      const modifier = step.maneuver?.modifier ?? null;
      const roadName =
        typeof step.name === "string" && step.name.trim().length > 0
          ? step.name.trim()
          : null;
      const location = step.maneuver?.location;
      out.push({
        instruction: maneuverInstruction(type, modifier, roadName),
        type,
        modifier,
        roadName,
        distanceM: step.distance ?? 0,
        durationS: step.duration ?? 0,
        location:
          Array.isArray(location) && location.length === 2
            ? location
            : (step.geometry?.coordinates?.[0] ?? [0, 0]),
        coordinates: step.geometry?.coordinates ?? [],
      });
    }
  }
  return out;
}

async function fetchOSRM(
  origin: LatLng,
  destination: LatLng
): Promise<BaseRoute[]> {
  const url =
    `${ENV.osrmUrl}/route/v1/driving/` +
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?alternatives=true&geometries=geojson&overview=full&steps=true`;

  const res = await fetchWithTimeout(url);
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
  return (data.routes as OsrmRoute[]).map(r => ({
    distance: r.distance,
    duration: r.duration,
    geometry: r.geometry,
    maneuvers: extractManeuvers(r),
  }));
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

  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (err) {
    console.warn("[routePulse] TomTom fallback unreachable/timed out:", err);
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Routing engine unavailable",
    });
  }
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
  // TomTom's guidance API needs a paid tier we don't have, so this path
  // ships no turn-by-turn — the client hides the panel on empty maneuvers.
  return routes.map(r => ({
    distance: r.summary.lengthInMeters,
    duration: r.summary.travelTimeInSeconds,
    geometry: {
      type: "LineString" as const,
      coordinates: r.legs.flatMap(leg =>
        leg.points.map(p => [p.longitude, p.latitude] as [number, number])
      ),
    },
    maneuvers: [],
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

function geometryToWkt(geometry: { coordinates: [number, number][] }): string {
  // OSRM caps geometry precision fine; PostGIS just needs valid WKT.
  return `LINESTRING(${geometry.coordinates
    .map(([lng, lat]) => `${lng} ${lat}`)
    .join(",")})`;
}

async function getIncidentsNearRoute(
  geometry: { coordinates: [number, number][] },
  bufferMeters = 500
): Promise<RouteIncident[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("incidents_near_route", {
    route_wkt: geometryToWkt(geometry),
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

/**
 * Traffic cameras near a route. Cameras are sparser than incidents, so the
 * default buffer is wider (1500m vs 500m) — a cam half a mile off the route
 * still shows the conditions you're driving into.
 */
async function getCamerasNearRoute(
  geometry: { coordinates: [number, number][] },
  bufferMeters = 1500
): Promise<RouteCamera[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("cameras_near_route", {
    route_wkt: geometryToWkt(geometry),
    buffer_meters: bufferMeters,
  });

  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>)
    .map(row => ({
      id: row.id as string,
      road_name: (row.road_name as string | null) ?? null,
      direction: (row.direction as string | null) ?? null,
      image_url: (row.image_url as string | null) ?? null,
      thumbnail_url: (row.thumbnail_url as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      last_updated: (row.last_updated as string | null) ?? null,
      lat: row.lat as number,
      lng: row.lng as number,
    }))
    .filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng));
}

/** All known traffic cameras (for the always-on map layer, pre-search). */
export async function listCameras(): Promise<RouteCamera[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("list_cameras", { limit_n: 300 });

  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>)
    .map(row => ({
      id: row.id as string,
      road_name: (row.road_name as string | null) ?? null,
      direction: (row.direction as string | null) ?? null,
      image_url: (row.image_url as string | null) ?? null,
      thumbnail_url: (row.thumbnail_url as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      last_updated: (row.last_updated as string | null) ?? null,
      lat: row.lat as number,
      lng: row.lng as number,
    }))
    .filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng));
}

// Incident descriptions/road names come from third-party feeds (ODOT,
// Road511, NWS, WSDOT) verbatim — treat them as untrusted input before they
// go into an LLM prompt. Strips characters that could break out of the JSON
// we're embedding them in or read as instructions, and caps length.
function sanitizeForPrompt(text: string | null): string {
  if (!text) return "";
  return text.replace(/[{}]/g, "").replace(/["\\]/g, "").slice(0, 200);
}

type AiPick = {
  chosenIndex: number;
  explanation: string;
  confidence: AiConfidence;
};

/**
 * Deterministic route pick used when the AI is unavailable or fails
 * validation: minimize (base duration + estimated incident delay). This is
 * the same quantity a thoughtful driver optimizes, so even our "degraded"
 * path is smarter than a raw fastest-time sort.
 */
function deterministicPick(routes: ScoredRoute[]): AiPick {
  let best = 0;
  let bestCost = Infinity;
  routes.forEach((r, i) => {
    const cost = r.duration + r.delayEstimateMin * 60;
    if (cost < bestCost) {
      bestCost = cost;
      best = i;
    }
  });
  const delay = routes[best]?.delayEstimateMin ?? 0;
  return {
    chosenIndex: best,
    explanation:
      delay > 0
        ? `Fastest route after adjusting for current incidents (est. +${delay} min delay).`
        : "Fastest available route.",
    confidence: "none",
  };
}

async function scoreRoutesWithAI(routes: ScoredRoute[]): Promise<AiPick> {
  // The prompt leads with the deterministic scores so the model reasons
  // over quantified tradeoffs (risk_score, est_delay_min) instead of
  // re-deriving severity math from raw text — better picks, fewer tokens.
  const prompt = `You are a route intelligence engine for gig drivers. Pick the best driving route, weighing both base duration and the active incidents on each route — a severe incident usually costs more time than a small distance or duration saving. Prefer the route with the lowest combined duration + est_delay_min unless there is a clear reason otherwise.

Incidents combine DOT/511/NWS/WSDOT agency feeds with live TomTom Traffic and Waze crowdsourced alerts (source field tells you which). live_flow is TomTom's measured speed as a percentage of free-flow, sampled along the route right now: 100 = free-flowing, below 70 = heavy congestion, road_closed_segments > 0 means TomTom flags the road itself as closed. Treat live_flow as ground truth for current conditions — it catches slowdowns that haven't generated an incident report yet.

Routes: ${JSON.stringify(
    routes.map(r => ({
      distance_m: r.distance,
      duration_s: r.duration,
      risk_score: r.riskScore,
      est_delay_min: r.delayEstimateMin,
      live_flow:
        r.flow && r.flow.samples > 0
          ? {
              pct_of_freeflow: Math.round(r.flow.avgRatio * 100),
              worst_pct: Math.round(r.flow.worstRatio * 100),
              road_closed_segments: r.flow.roadClosedCount,
            }
          : null,
      incidents: r.incidents.slice(0, 5).map(i => ({
        type: i.incident_type,
        severity: i.severity,
        source: i.source,
        description: sanitizeForPrompt(i.description),
        road_name: sanitizeForPrompt(i.road_name),
      })),
    }))
  )}

Respond ONLY with JSON: { "chosen_index": 0, "explanation": "1-2 short sentences for the driver: name the specific road or incident and quantify the delay when relevant", "confidence": "high|medium|low" }`;

  try {
    // Free-tier model, routed through OpenRouter (invokeLLM falls back
    // across the model chain automatically if one :free endpoint is
    // rate-limited) — never charges Kai credits, never touches Gemini.
    // gpt-oss-120b is the strongest free reasoning model in the catalog,
    // which matters here because route choice is a tradeoff judgement,
    // not a formatting task.
    const model = resolveKaiModel("gpt-oss-120b");
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

    // Confidence is advisory (UI label only) — accept the known values,
    // default to "medium" when the model omits or free-styles it, rather
    // than throwing away an otherwise valid pick.
    const confidence: AiConfidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "medium";

    return {
      chosenIndex: parsed.chosen_index,
      explanation: parsed.explanation,
      confidence,
    };
  } catch (err) {
    // AI scoring is an enhancement, never a hard dependency — and the
    // deterministic fallback is itself delay-aware, not just route[0].
    console.warn("[routePulse] AI scoring failed, falling back:", err);
    return deterministicPick(routes);
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

  // v10: one bbox covering every route option → a single TomTom + Waze
  // call set per uncached query, so upstream quotas stay flat no matter
  // how many alternatives the router returns. Keys unset = clean no-ops.
  const combinedBbox = bboxForGeometries(baseRoutes.map(r => r.geometry));
  const [tomtomIncidents, wazeAlerts] = combinedBbox
    ? await Promise.all([
        fetchTomTomTrafficIncidents(combinedBbox),
        fetchWazeAlerts(combinedBbox),
      ])
    : [[], []];

  const scoredRoutes: ScoredRoute[] = await Promise.all(
    baseRoutes.map(async r => {
      const dbIncidents = await getIncidentsNearRoute(r.geometry);
      // Merge live TomTom/Waze incidents near this path, skipping any that
      // duplicate an agency-feed incident we already store (within ~250m)
      // so a crash reported by both ODOT and Waze doesn't double-count.
      const liveNearby = [...tomtomIncidents, ...wazeAlerts].filter(i =>
        isNearRoute(i.lat, i.lng, r.geometry.coordinates, 500)
      );
      const incidents = [
        ...dbIncidents,
        ...dedupeIncidents(dbIncidents, liveNearby),
      ];
      // TomTom live flow: measured current-vs-free-flow speeds sampled
      // along the route. Catches congestion that hasn't generated an
      // incident report yet — the difference between "an incident exists"
      // and "traffic is actually moving slowly right now".
      const flow = await fetchTomTomFlow(r.geometry.coordinates);
      let { riskScore, delayEstimateMin } = computeRouteRisk(incidents);
      if (
        flow &&
        flow.samples >= 2 &&
        flow.avgRatio > 0.05 &&
        flow.avgRatio < 0.95
      ) {
        const flowDelayMin = Math.min(
          25,
          Math.round((r.duration * (1 / flow.avgRatio - 1)) / 60)
        );
        delayEstimateMin = Math.min(MAX_DELAY_MIN, delayEstimateMin + flowDelayMin);
      }
      if (flow && flow.roadClosedCount > 0) {
        // TomTom flags the segment itself as closed — stronger than any
        // inferred severity.
        riskScore = Math.min(MAX_RISK_SCORE, riskScore + 30);
      } else if (flow && flow.samples >= 2 && flow.worstRatio < 0.5) {
        riskScore = Math.min(MAX_RISK_SCORE, riskScore + 10);
      }
      return {
        distance: r.distance,
        duration: r.duration,
        geometry: r.geometry,
        incidents,
        riskScore,
        delayEstimateMin,
        maneuvers: r.maneuvers,
        flow,
      };
    })
  );

  // The AI earns its call when there's something to weigh: any incident,
  // a TomTom-flagged closure, or measured congestion below 90% of
  // free-flow. A totally clear corridor doesn't need a model.
  const needsAi = scoredRoutes.some(
    r =>
      r.incidents.length > 0 ||
      (r.flow?.roadClosedCount ?? 0) > 0 ||
      ((r.flow?.samples ?? 0) >= 2 && (r.flow?.avgRatio ?? 1) < 0.9)
  );

  let chosenIndex = 0;
  let explanation = "Fastest route, no active incidents.";
  let confidence: AiConfidence = "none";
  if (needsAi) {
    const ai = await scoreRoutesWithAI(scoredRoutes);
    chosenIndex = ai.chosenIndex;
    explanation = ai.explanation;
    confidence = ai.confidence;
  }

  // Cameras near the chosen route — one extra RPC after the pick so the
  // driver can eyeball actual road conditions along what we're recommending.
  const chosen = scoredRoutes[chosenIndex] ?? scoredRoutes[0];
  const cameras = chosen?.geometry
    ? await getCamerasNearRoute(
        chosen.geometry as { coordinates: [number, number][] }
      )
    : [];

  // v10: observability + the UI's "grounded with live data" chip. Only
  // set when at least one external source actually contributed — a null
  // means every key was unset or every upstream call came back empty.
  const flowSamples = scoredRoutes.reduce(
    (n, r) => n + (r.flow?.samples ?? 0),
    0
  );
  const grounding =
    tomtomIncidents.length + wazeAlerts.length + flowSamples > 0
      ? {
          tomtomIncidents: tomtomIncidents.length,
          wazeAlerts: wazeAlerts.length,
          flowSamples,
        }
      : null;

  const result: RouteResult = {
    route: scoredRoutes[chosenIndex] ?? scoredRoutes[0],
    explanation,
    alternatives: scoredRoutes,
    origin,
    destination,
    generated_at: new Date().toISOString(),
    cached: false,
    confidence,
    cameras,
    grounding,
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
