/**
 * server/routers/routePulse/routePulse.service.ts
 *
 * RoutePulse — hyperlocal route intelligence layer.
 *
 * Data flow per request:
 *   1. Check Netlify Blobs app-cache (edge-fast) then routes_cache (Supabase)
 *      for a fresh (<2min) identical request.
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
 *
 * v12: route-choice quality. Time-of-day context (Pacific peak/offpeak/
 * night) weights congestion-type incidents; the AI returns per-route
 * "avoid" verdicts surfaced in the comparison UI; and a wait-or-go
 * advisor reads estimated_end_at for the chosen route's severe incidents
 * so we can say "wait 25 min, the crash clears by 3:20" — a call
 * mainstream apps don't make.
 *
 * v13: departure-horizon outlook. getDepartureOutlook() projects the
 * chosen route's incident delay at leave-now / +15 / +30 / +60 minutes
 * from incident end estimates, and returns the cheapest horizon when it
 * beats leaving now by 3+ minutes.
 *
 * v19: multi-objective routing for delivery drivers. Ranking is no longer
 * pure time. Each route now carries stressScore + energyScore + complexity
 * (maneuver count). Preference modes (fastest | balanced | quiet | fuel)
 * change the relative weights so RoutePulse will deliberately choose a
 * slightly longer backroad / lower-congestion alternative when it reduces
 * stress or energy enough. This is the core differentiator vs Google Maps.
 *
 * v21: preference-aware candidate generation. For balanced/quiet/fuel we
 * also request an OSRM surface-streets option (exclude=motorway) and merge
 * it into the candidate set so ranking can actually pick a backroad when
 * the weights say it wins — not just re-rank the same freeway alternatives
 * Google would show.
 *
 * v22: premium / chargeable layer.
 *   - Historical bottleneck density (21d incident history along corridor)
 *   - valueInsight: explicit time/stress/energy delta vs pure-fastest
 *   - dataConfidence: how well-grounded the pick is (sells trust)
 *   - Ordered multi-stop support (delivery waypoints via OSRM)
 *
 * v23: delivery-ops polish for paid tier.
 *   - driverHealthScore: single 0-100 glanceable route health
 *   - Smart stop ordering (nearest-neighbor + 2-opt) when optimizeStops
 *   - stopPlan returned so the UI shows the optimized sequence
 *
 * v24: Portland metro local-driver knowledge.
 *   - Chronic corridors, train traps, High Crash arterials, westside/Sunset,
 *     Vancouver spillover, and active construction events (Rose Quarter Sep 2026)
 *   - Folds into stress/bottleneck scoring + AI prompts + explanations
 *
 * ---------------------------------------------------------------------
 * NOTES FOR KIMI (2026-08-09 audit/hardening pass — Claude, merged post-v13)
 * ---------------------------------------------------------------------
 * 1. mark_incidents_cleared() was missing entirely from the live Supabase
 *    project when audited — the scheduled ingestion function has been
 *    calling it every 2min cycle and silently failing (catch block only
 *    logs), so incidents were never auto-cleared. 336 were stuck "active"
 *    in production, one since 2021. Restored on the live DB *and* now
 *    captured in drizzle/0054_routepulse_restore_clearance_fn.sql, so a
 *    fresh env built from migrations alone won't regress this. Also added
 *    search_path hardening to it + cameras_near_route/list_cameras, and
 *    enabled RLS on traffic_incidents/routes_cache/traffic_cameras (was
 *    open to the anon key via PostgREST — the client bundle does hold a
 *    Supabase anon client for other features).
 * 2. This file's own external calls (Nominatim geocode/suggest, Census
 *    fallback, OSRM, TomTom fallback) go through fetchWithTimeout() below
 *    (5s AbortController). externalGrounding.ts has its own equivalent
 *    (withTimeout()) for the v10 TomTom Traffic/Waze calls — two helpers
 *    doing the same job under different names isn't urgent to unify, just
 *    flagging so nobody's surprised there are two. Point is: every fetch()
 *    added anywhere in RoutePulse from here on should go through one of
 *    them, not a bare fetch — a stalled upstream should fail fast into
 *    whatever fallback comes next, not hang until the platform timeout.
 * ---------------------------------------------------------------------
 */
import { TRPCError } from "@trpc/server";
import { getSupabaseAdmin } from "../../_core/supabaseAdmin";
import { ENV } from "../../_core/env";

/** AbortSignal that works even when AbortSignal.timeout is missing. */
function abortAfter(ms: number): AbortSignal {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    try {
      return AbortSignal.timeout(ms);
    } catch {
      /* fall through */
    }
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}
import {
  FREE_TIER_FALLBACK_CHAIN,
  GROQ_FALLBACK_MODEL,
  invokeLLM,
} from "../../_core/llm";
import { polishResponse } from "../../lib/aiResponseFramework";
import {
  matchLocalKnowledge,
  localKnowledgePenalties,
  formatLocalKnowledgeForPrompt,
  localKnowledgeSummary,
} from "./portlandLocalKnowledge";
import { blobKvGet, blobKvSet, BlobKvNS } from "../../lib/blobKv";
import { getClearRouteBrief } from "./aiBriefWorker";
import {
  bboxForGeometries,
  dedupeIncidents,
  fetchTomTomFlow,
  fetchTomTomTrafficIncidents,
  fetchWazeAlerts,
  isNearRoute,
  type Bbox,
  type FlowGrounding,
} from "./externalGrounding";

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
// within the same warm serverless instance. Netlify Blobs (rp-geocode) extends
// this across cold starts without a durable DB table.
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
    const oldestKey = geocodeCache.keys().next().value;
    if (oldestKey !== undefined) geocodeCache.delete(oldestKey);
  }
  geocodeCache.set(geocodeCacheKey(address), {
    value,
    expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
  });
  void blobKvSet(
    BlobKvNS.routePulseGeocode,
    geocodeCacheKey(address),
    value,
    GEOCODE_CACHE_TTL_MS
  );
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

/** Match raw GPS pasted as "45.46742, -122.60254" or similar. */
function parseLatLngLiteral(input: string): LatLng | null {
  const m = input
    .trim()
    .match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]!);
  const lng = parseFloat(m[2]!);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

async function reverseGeocodeNominatim(
  lat: number,
  lng: number
): Promise<string | null> {
  const url =
    `${ENV.nominatimUrl}/reverse?format=jsonv2&lat=${lat}&lon=${lng}` +
    `&zoom=18&addressdetails=0`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": ENV.nominatimUserAgent,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { display_name?: string };
    return body.display_name ?? null;
  } catch {
    return null;
  }
}

async function reverseGeocodeTomTom(
  lat: number,
  lng: number
): Promise<string | null> {
  const key = ENV.tomtomApiKey;
  if (!key) return null;
  try {
    const url =
      `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json` +
      `?key=${key}&radius=100`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: abortAfter(6_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      addresses?: Array<{ address?: { freeformAddress?: string } }>;
    };
    return body.addresses?.[0]?.address?.freeformAddress ?? null;
  } catch {
    return null;
  }
}

/**
 * Readable label for a GPS point — TomTom first, Nominatim fallback.
 */
export async function reverseGeocodeLabel(
  lat: number,
  lng: number
): Promise<string> {
  const label =
    (await reverseGeocodeTomTom(lat, lng)) ??
    (await reverseGeocodeNominatim(lat, lng));
  return label ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export async function geocodeAddress(address: string): Promise<GeocodedPoint> {
  const trimmed = address.trim();
  if (trimmed.length < 3) {
    throw new GeocodingError("Enter a more complete address.");
  }

  const cached = readGeocodeCache(trimmed);
  if (cached) return cached;

  const fromBlob = await blobKvGet<GeocodedPoint>(
    BlobKvNS.routePulseGeocode,
    geocodeCacheKey(trimmed)
  );
  if (fromBlob?.lat != null && fromBlob?.lng != null) {
    // Refresh in-memory only (already in blobs)
    if (geocodeCache.size >= GEOCODE_CACHE_MAX_ENTRIES) {
      const oldestKey = geocodeCache.keys().next().value;
      if (oldestKey !== undefined) geocodeCache.delete(oldestKey);
    }
    geocodeCache.set(geocodeCacheKey(trimmed), {
      value: fromBlob,
      expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
    });
    return fromBlob;
  }

  // Raw GPS coordinates → reverse-geocode to a human place name.
  const coords = parseLatLngLiteral(trimmed);
  if (coords) {
    const displayName = await reverseGeocodeLabel(coords.lat, coords.lng);
    const point: GeocodedPoint = {
      lat: coords.lat,
      lng: coords.lng,
      displayName,
    };
    writeGeocodeCache(trimmed, point);
    return point;
  }

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
    const res = await fetch(url, {
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
  /**
   * v18: meters from the incident to the route line itself, only
   * populated for incidents from getIncidentsNearRoute (the
   * distance_m column added in drizzle/0056) — undefined for incidents
   * from live grounding sources (TomTom/Google Maps Traffic Alerts),
   * which don't compute this. Used by computeRouteRisk to weight
   * incidents right on the route higher than ones near the edge of the
   * search buffer (a crash on a parallel frontage road 480m away isn't
   * as relevant as one straddling your actual lane, even though both
   * pass the same "within 500m" filter).
   */
  distanceM?: number;
  /**
   * v18: when this incident started (falls back to when it was ingested,
   * if the source feed doesn't report a distinct start time — see the
   * COALESCE in incidents_near_route). Used by computeRouteRisk to decay
   * the weight of old, still-uncleared reports — agency/crowd feeds lag
   * on marking things cleared, sometimes by a lot (this migration's own
   * validation query turned up a "moderate" incident from over a year
   * ago still showing as active).
   */
  startedAt?: string | null;
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

// ── v12: time-of-day context ────────────────────────────────────────────────
// The same jam at 8:15 AM Tuesday and 11 PM Saturday are different problems.
// We score in the route's local timezone (coverage is OR/SW WA → Pacific):
// weekday commute peaks weight congestion-type incidents 25% heavier,
// overnight weighs them 10% lighter. Deterministic and explainable — the
// context is surfaced in the response and shown in the UI.
export type TimeContext = "peak" | "offpeak" | "night";

export function routeTimeContext(now = new Date()): TimeContext {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  const hour = parseInt(get("hour"), 10) % 24;
  const minute = parseInt(get("minute"), 10) || 0;
  const h = hour + minute / 60;
  const weekday = get("weekday");
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  if (h >= 22 || h < 5) return "night";
  if (isWeekday && ((h >= 7 && h < 9.5) || (h >= 15.5 && h < 18.5))) {
    return "peak";
  }
  return "offpeak";
}

/** Congestion-class incidents are the ones rush hour actually amplifies. */
function isCongestionType(incidentType: string): boolean {
  const t = incidentType.toLowerCase();
  return t.includes("jam") || t.includes("congestion") || t.includes("traffic");
}

/**
 * Planned/structural incidents (closures, construction, road works) are
 * expected to still be accurate hours later — a "road closed" report from
 * 3 hours ago is probably still closed. Everything else (accidents,
 * hazards, generic alerts) is a point-in-time report that increasingly
 * likely no longer reflects reality the older it gets, since agency and
 * crowdsourced feeds both lag on clearing entries. Used by
 * incidentTimeDecay below to decide which incidents even get decayed.
 */
function isPersistentType(incidentType: string): boolean {
  const t = incidentType.toLowerCase();
  return (
    t.includes("closure") ||
    t.includes("closed") ||
    t.includes("construction") ||
    t.includes("road works") ||
    t.includes("roadwork")
  );
}

/**
 * v18: how much an incident's age should discount its risk weight.
 * Full weight for the first 45 minutes (a report is a report), then a
 * linear taper down to a 0.25 floor by the 4-hour mark — never all the
 * way to zero, since even a stale report means *something* was
 * happening there and totally ignoring it would be its own failure mode.
 * Persistent incident types (closures/construction) and incidents with
 * no timestamp at all (undefined `startedAt` — grounding sources that
 * don't supply one) are never decayed; there's nothing here to suggest
 * they're stale.
 */
function incidentTimeDecay(inc: RouteIncident): number {
  if (!inc.startedAt || isPersistentType(inc.incident_type)) return 1;
  const ageMin = (Date.now() - new Date(inc.startedAt).getTime()) / 60_000;
  if (!Number.isFinite(ageMin) || ageMin < 0) return 1;
  const FULL_WEIGHT_MIN = 45;
  const FLOOR_AT_MIN = 240;
  const FLOOR = 0.25;
  if (ageMin <= FULL_WEIGHT_MIN) return 1;
  if (ageMin >= FLOOR_AT_MIN) return FLOOR;
  const t = (ageMin - FULL_WEIGHT_MIN) / (FLOOR_AT_MIN - FULL_WEIGHT_MIN);
  return 1 - t * (1 - FLOOR);
}

/**
 * v18: how much an incident's distance from the route line should
 * discount its risk weight. 1.0 for an incident right on the route,
 * tapering linearly to a 0.5 floor at the edge of the search buffer
 * (typically 500m — see getIncidentsNearRoute's bufferMeters) — a crash
 * on a parallel frontage road 480m away still matters (drivers merge,
 * gawk, back up adjacent roads) but shouldn't weigh the same as one
 * straddling the lane you're actually in. Incidents with no distance
 * data (undefined `distanceM` — live grounding sources that don't
 * compute it) are never discounted.
 */
function incidentDistanceWeight(
  inc: RouteIncident,
  bufferMeters = 500
): number {
  if (inc.distanceM === undefined) return 1;
  const clamped = Math.max(0, Math.min(bufferMeters, inc.distanceM));
  return 1 - 0.5 * (clamped / bufferMeters);
}

const TIME_MULTIPLIER: Record<TimeContext, number> = {
  peak: 1.25,
  offpeak: 1,
  night: 0.9,
};

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
export function computeRouteRisk(
  incidents: RouteIncident[],
  timeContext: TimeContext = "offpeak"
): RouteRisk {
  let riskScore = 0;
  let delayEstimateMin = 0;
  const mult = TIME_MULTIPLIER[timeContext];
  for (const inc of incidents) {
    const congestion = isCongestionType(inc.incident_type);
    // v18: distance-to-route and report-age both discount how much an
    // incident counts, on top of the existing severity/time-of-day
    // weighting — see incidentDistanceWeight/incidentTimeDecay above for
    // the full rationale. Multiplicative, not additive, so an incident
    // that's both far off-route AND stale gets compounded down rather
    // than either factor alone capping the discount.
    const relevance = incidentDistanceWeight(inc) * incidentTimeDecay(inc);
    const risk =
      (SEVERITY_RISK_WEIGHT[inc.severity] ?? SEVERITY_RISK_WEIGHT.minor) *
      (congestion ? mult : 1) *
      relevance;
    const delay =
      (SEVERITY_DELAY_MIN[inc.severity] ?? SEVERITY_DELAY_MIN.minor) *
      (congestion ? mult : 1) *
      relevance;
    riskScore += risk;
    delayEstimateMin += delay;
  }
  return {
    riskScore: Math.min(MAX_RISK_SCORE, Math.round(riskScore)),
    delayEstimateMin: Math.min(MAX_DELAY_MIN, Math.round(delayEstimateMin)),
  };
}

// ── v19: multi-objective scores + preference modes ──────────────────────────
export type RoutePreference = "fastest" | "balanced" | "quiet" | "fuel";

export const ROUTE_PREFERENCE_WEIGHTS: Record<
  RoutePreference,
  { time: number; stress: number; energy: number }
> = {
  fastest: { time: 1.0, stress: 0.12, energy: 0.08 },
  balanced: { time: 0.68, stress: 0.22, energy: 0.15 },
  quiet: { time: 0.48, stress: 0.38, energy: 0.18 },
  fuel: { time: 0.52, stress: 0.15, energy: 0.38 },
};

export type RouteScores = RouteRisk & {
  stressScore: number;
  energyScore: number;
  maneuverCount: number;
};

export function computeRouteScores(
  incidents: RouteIncident[],
  liveDurationS: number,
  distanceM: number,
  maneuvers: { length: number },
  flow: FlowGrounding | null | undefined,
  timeContext: TimeContext = "offpeak"
): RouteScores {
  const base = computeRouteRisk(incidents, timeContext);
  const maneuverCount = maneuvers?.length ?? 0;
  const congestion =
    flow && flow.samples >= 2 ? Math.max(0, Math.min(1, 1 - flow.avgRatio)) : 0;
  const worstCongestion =
    flow && flow.samples >= 2
      ? Math.max(0, Math.min(1, 1 - flow.worstRatio))
      : congestion;
  const complexityPenalty = Math.min(35, maneuverCount * 1.4);
  const congestionPenalty = Math.round(worstCongestion * 40 + congestion * 15);
  const stressScore = Math.min(
    100,
    Math.round(
      base.riskScore * 0.7 + congestionPenalty + complexityPenalty * 0.45
    )
  );
  const distanceMi = distanceM / 1609.34;
  const distanceBand = Math.min(40, distanceMi * 1.6);
  const energyScore = Math.min(
    100,
    Math.round(distanceBand * (1 + congestion * 1.3) + complexityPenalty * 0.35)
  );
  return { ...base, stressScore, energyScore, maneuverCount };
}

export function preferenceCost(
  route: {
    liveDurationS: number;
    incidentDelayMin: number;
    stressScore: number;
    energyScore: number;
    bottleneckScore?: number;
  },
  preference: RoutePreference
): number {
  const w = ROUTE_PREFERENCE_WEIGHTS[preference];
  const timeMin = route.liveDurationS / 60 + route.incidentDelayMin;
  const bottleneck = route.bottleneckScore ?? 0;
  // Historical bottlenecks count as stress — quiet/fuel feel them hardest.
  const bottleneckWeight =
    preference === "quiet"
      ? 0.22
      : preference === "fuel"
        ? 0.12
        : preference === "balanced"
          ? 0.1
          : 0.04;
  return (
    w.time * timeMin +
    w.stress * (route.stressScore * 0.18) +
    w.energy * (route.energyScore * 0.15) +
    bottleneckWeight * (bottleneck * 0.16)
  );
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
  /**
   * v16: live-traffic-corrected duration in seconds — `duration` scaled by
   * TomTom's measured current/free-flow ratio when we have reliable
   * samples (2+), clamped to a sane range so a couple of noisy points
   * can't produce a wild multiplier. This is the actual fix for "are we
   * better than Google Maps": Google's headline ETA is already live-
   * traffic-corrected, and ours previously wasn't — `duration` alone is
   * OSRM's static graph time (project-osrm.org's public demo server has
   * no live traffic layer at all), with incident delay only tacked on as
   * a capped badge next to it. Falls back to `duration` when flow
   * sampling didn't return enough usable points. This is what route
   * ranking (deterministicPick, the AI prompt) and the client headline
   * ETA should read — not raw `duration`.
   */
  liveDurationS: number;
  geometry: unknown;
  incidents: RouteIncident[];
  riskScore: number;
  delayEstimateMin: number;
  /**
   * v16: the incident-report portion of delayEstimateMin only (excludes
   * the flow-based portion already folded into liveDurationS). Ranking
   * uses this plus liveDurationS as its cost — using the combined
   * delayEstimateMin on top of liveDurationS would double-count the flow
   * delay that's already inside liveDurationS.
   */
  incidentDelayMin: number;
  /** v19: multi-objective scores for preference-weighted ranking. */
  stressScore: number;
  energyScore: number;
  maneuverCount: number;
  /**
   * v21: how this candidate was generated.
   * - standard: default OSRM driving graph (may include motorways)
   * - surface: OSRM with exclude=motorway (backroads / surface streets)
   */
  pathStyle?: "standard" | "surface";
  /**
   * v22: 0-100 historical bottleneck score from 21-day incident density
   * along this corridor (higher = chronically messier).
   */
  bottleneckScore?: number;
  /** Raw historical incident count feeding bottleneckScore. */
  historicalIncidentCount?: number;
  /** v24: local-driver knowledge corridor/event ids that fired. */
  localKnowledgeIds?: string[];
  /** Top local-driver tip for this route, if any. */
  localTip?: string | null;
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
  /** Best local-driver tip for the chosen route (Portland metro). */
  localTip?: string | null;
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
    /** Which TomTom products contributed to this response. */
    tomtomApis?: Array<
      | "routing"
      | "matrix"
      | "waypointOptimization"
      | "flow"
      | "incidents"
      | "reverseGeocode"
    >;
  } | null;
  /**
   * v12: per-route AI verdicts, aligned by route index. Null for the chosen
   * route, a short "why not" string for each rejected one. Absent when the
   * deterministic fallback picked the route.
   */
  verdicts?: (string | null)[];
  /**
   * v12: wait-or-go advice. Set when the chosen route has major/critical
   * incidents with a known estimated_end_at inside the next 90 minutes —
   * leaving after that point avoids their delay entirely.
   */
  waitAdvice?: {
    clearByIso: string;
    waitMin: number;
    delayAvoidedMin: number;
    roadName: string | null;
  } | null;
  /** v12: the time-of-day context the risk scores were computed under. */
  timeContext?: TimeContext;
  /**
   * v13: departure-horizon outlook. Projected incident delay for the
   * chosen route if you leave now vs in 15/30/60 minutes, derived from
   * incident estimated_end_at values. Only set when a later horizon beats
   * leaving now by at least 3 minutes.
   */
  departureOutlook?: {
    horizonsMin: number[];
    delayMin: number[];
    bestHorizonMin: number;
    savesMin: number;
  } | null;
  /** v19: the preference mode used for this ranking. */
  preference?: RoutePreference;
  /**
   * v22: premium value card — why this pick beats pure-fastest Google-style
   * routing. Null when the chosen route *is* the pure-time winner.
   */
  valueInsight?: {
    vsFastestTimeDeltaMin: number;
    stressDelta: number;
    energyDelta: number;
    bottleneckDelta: number;
    chosenPathStyle: "standard" | "surface" | null;
    fastestPathStyle: "standard" | "surface" | null;
    headline: string;
    detail: string;
  } | null;
  /**
   * v22: 0-100 confidence that live data + history actually informed the pick.
   * Low means thin grounding (closer to a plain map); high means chargeable signal.
   */
  dataConfidence?: {
    score: number;
    label: "low" | "medium" | "high";
    reasons: string[];
  };
  /** v22: geocoded intermediate stops when multi-stop was requested. */
  stops?: GeocodedPoint[];
  /**
   * v23: optimized stop sequence (when optimizeStops ran).
   * originalIndex maps back to the order the user typed stops.
   */
  stopPlan?: {
    optimized: boolean;
    stops: Array<GeocodedPoint & { originalIndex: number }>;
    /** Approximate miles saved vs the user-typed order (null if not computed). */
    estimatedMilesSaved: number | null;
  };
  /**
   * v23: single glanceable 0-100 driver health for the chosen route.
   * Higher = safer/calmer/clearer. Inverse of combined risk/stress/bottleneck.
   */
  driverHealthScore?: number;
  /** v24: local-driver tips that applied to the chosen route. */
  localDriverNotes?: string[];
  /**
   * v30: per-stop delivery schedule — set only when at least one stop was
   * given a dueBy deadline. A plain shortest-path/2-opt reorder (stopPlan
   * above) has no concept of "must arrive by 14:00" and will happily
   * reorder past a hard pickup window; this is a separate, deadline-aware
   * ordering (scheduleStopsWithDeadlines) that supersedes stopPlan's order
   * whenever any stop carries a deadline.
   */
  stopSchedule?: {
    /** False when at least one stop couldn't be reached by its deadline. */
    feasible: boolean;
    /** Total minutes late, summed across every stop that missed its deadline. */
    totalLateMin: number;
    stops: Array<{
      address: string;
      lat: number;
      lng: number;
      originalIndex: number;
      /** "HH:MM" as given by the caller, or null if this stop had none. */
      dueBy: string | null;
      /** Estimated arrival, "HH:MM" local. */
      etaClock: string;
      /** 0 if on time or no deadline; otherwise minutes past dueBy. */
      lateByMin: number;
    }>;
  } | null;
};

function cacheKey(
  origin: LatLng,
  destination: LatLng,
  preference: RoutePreference = "balanced"
) {
  return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}_${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}_${preference}`;
}

function normalizeCachedResult(result: RouteResult): RouteResult {
  const withManeuvers = (r: ScoredRoute): ScoredRoute => ({
    ...r,
    maneuvers: Array.isArray(r.maneuvers) ? r.maneuvers : [],
    stressScore:
      typeof r.stressScore === "number" ? r.stressScore : (r.riskScore ?? 0),
    energyScore: typeof r.energyScore === "number" ? r.energyScore : 0,
    maneuverCount:
      typeof r.maneuverCount === "number"
        ? r.maneuverCount
        : Array.isArray(r.maneuvers)
          ? r.maneuvers.length
          : 0,
    bottleneckScore:
      typeof r.bottleneckScore === "number" ? r.bottleneckScore : 0,
    historicalIncidentCount:
      typeof r.historicalIncidentCount === "number"
        ? r.historicalIncidentCount
        : 0,
  });
  return {
    ...result,
    route: withManeuvers(result.route),
    alternatives: (result.alternatives ?? []).map(withManeuvers),
    cached: true,
  };
}

async function readCache(key: string): Promise<RouteResult | null> {
  // 1) Netlify Blobs — edge-fast shared cache across function instances.
  const fromBlob = await blobKvGet<RouteResult>(BlobKvNS.routePulseRoutes, key);
  if (fromBlob?.route) {
    return normalizeCachedResult(fromBlob);
  }

  // 2) Supabase durable fallback (survives blob store resets / local dev).
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
  // Warm blob cache from durable hit so the next request is edge-fast.
  void blobKvSet(BlobKvNS.routePulseRoutes, key, result, CACHE_TTL_MS);
  return normalizeCachedResult(result);
}

async function writeCache(key: string, result: RouteResult) {
  // Edge-fast path first — don't block the response on Supabase if blobs work.
  void blobKvSet(BlobKvNS.routePulseRoutes, key, result, CACHE_TTL_MS);
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    await supabase
      .from("routes_cache")
      .upsert({ cache_key: key, result, created_at: new Date().toISOString() });
  } catch (err) {
    console.warn("[routePulse] routes_cache write failed:", err);
  }
}

type BaseRoute = {
  distance: number;
  duration: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  maneuvers: RouteManeuver[];
  pathStyle: "standard" | "surface";
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
      return mod
        ? `Keep ${mod} at the fork${road}`
        : `Keep straight at the fork${road}`;
    case "end of road":
      return mod
        ? `At the end of the road, turn ${mod}${road}`
        : `At the end of the road, turn${road}`;
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
  destination: LatLng,
  opts: { excludeMotorway?: boolean; via?: LatLng[] } = {}
): Promise<BaseRoute[]> {
  const exclude = opts.excludeMotorway ? "&exclude=motorway" : "";
  const via = opts.via ?? [];
  const coords = [
    `${origin.lng},${origin.lat}`,
    ...via.map(v => `${v.lng},${v.lat}`),
    `${destination.lng},${destination.lat}`,
  ].join(";");
  // alternatives only when no intermediate stops — OSRM alternatives with
  // many waypoints are expensive and often empty.
  const alternatives = via.length === 0 ? "true" : "false";
  const pathStyle: "standard" | "surface" = opts.excludeMotorway
    ? "surface"
    : "standard";
  const query = `?alternatives=${alternatives}&geometries=geojson&overview=full&steps=true${exclude}`;
  const bases = [ENV.osrmUrl, ENV.osrmFallbackUrl].filter(
    (u, i, arr) => typeof u === "string" && u.length > 0 && arr.indexOf(u) === i
  );

  let lastErr: unknown = null;
  for (const base of bases) {
    const url = `${base.replace(/\/+$/, "")}/route/v1/driving/${coords}${query}`;
    try {
      const res = await fetch(url);
      // Rate limit / upstream outage → try next base
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`OSRM error (${res.status}) at ${base}`);
        continue;
      }
      if (!res.ok) {
        throw new Error(`OSRM error (${res.status})`);
      }
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: opts.excludeMotorway
            ? "No surface-streets route found between those points"
            : "No route found between those points",
        });
      }
      return (data.routes as OsrmRoute[]).map(r => ({
        distance: r.distance,
        duration: r.duration,
        geometry: r.geometry,
        maneuvers: extractManeuvers(r),
        pathStyle,
      }));
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      lastErr = err;
      // network failure → try fallback base
      continue;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("OSRM unreachable");
}

/**
 * M28: TomTom Routing with traffic=true for a live ETA (not only as OSRM fallback).
 * One call per OD — alternatives still use OSRM geometry + flow samples.
 */
async function fetchTomTomLiveDuration(
  origin: LatLng,
  destination: LatLng
): Promise<number | null> {
  const apiKey = ENV.tomtomApiKey;
  if (!apiKey) return null;
  try {
    const url =
      `https://api.tomtom.com/routing/1/calculateRoute/` +
      `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json` +
      `?key=${apiKey}&traffic=true&travelMode=car&routeType=fastest`;
    const res = await fetch(url, { signal: abortAfter(8_000) });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      routes?: Array<{
        summary?: {
          travelTimeInSeconds?: number;
          trafficDelayInSeconds?: number;
        };
      }>;
    };
    const sec = body.routes?.[0]?.summary?.travelTimeInSeconds;
    return typeof sec === "number" && sec > 0 ? sec : null;
  } catch {
    return null;
  }
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
    pathStyle: "standard" as const,
  }));
}

/** Rough geometry fingerprint so we can merge standard + surface candidates
 *  without keeping near-duplicates that waste scoring quota. */
function routeFingerprint(r: BaseRoute): string {
  const coords = r.geometry.coordinates;
  if (coords.length === 0) return `${r.distance}|${r.duration}`;
  const mid = coords[Math.floor(coords.length / 2)]!;
  return [
    Math.round(r.distance / 50),
    Math.round(r.duration / 15),
    mid[0].toFixed(3),
    mid[1].toFixed(3),
  ].join("|");
}

function mergeRouteCandidates(sets: BaseRoute[][]): BaseRoute[] {
  const seen = new Set<string>();
  const out: BaseRoute[] = [];
  for (const set of sets) {
    for (const r of set) {
      const fp = routeFingerprint(r);
      if (seen.has(fp)) continue;
      seen.add(fp);
      out.push(r);
    }
  }
  return out;
}

/**
 * v21: preference-aware candidate generation.
 * - fastest: standard OSRM alternatives only
 * - balanced/quiet/fuel: also request exclude=motorway surface routes so
 *   ranking can actually select a backroad when weights favor it
 */
async function fetchBaseRoutes(
  origin: LatLng,
  destination: LatLng,
  preference: RoutePreference = "balanced",
  via: LatLng[] = []
): Promise<BaseRoute[]> {
  const wantSurface = preference !== "fastest";

  try {
    const standardPromise = fetchOSRM(origin, destination, { via });
    const surfacePromise = wantSurface
      ? fetchOSRM(origin, destination, { excludeMotorway: true, via }).catch(
          err => {
            // Surface path is an enhancement — never fail the whole request
            // because motorway-free routing is unavailable for this OD pair.
            console.warn(
              "[routePulse] surface-streets OSRM option unavailable:",
              err instanceof Error ? err.message : err
            );
            return [] as BaseRoute[];
          }
        )
      : Promise.resolve([] as BaseRoute[]);

    const tomtomPromise = fetchTomTomRoutes(origin, destination, {
      via,
      computeBestOrder: via.length >= 1,
      maxAlternatives: via.length === 0 ? 2 : 0,
    }).catch(() => null);

    const [standard, surface, tomtom] = await Promise.all([
      standardPromise,
      surfacePromise,
      tomtomPromise,
    ]);
    const merged = mergeRouteCandidates([standard, surface, tomtom ?? []]);
    if (merged.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No route found between those points",
      });
    }
    return merged;
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    console.warn("[routePulse] OSRM unreachable, trying TomTom fallback:", err);
    const tt = await fetchTomTomRoutes(origin, destination, {
      via,
      computeBestOrder: via.length >= 1,
      maxAlternatives: 2,
    });
    if (tt?.length) return tt;
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
    distanceM: typeof row.distance_m === "number" ? row.distance_m : undefined,
    startedAt: (row.started_at as string | null) ?? null,
  }));
}

/**
 * v22: historical bottleneck density along a corridor (active + cleared
 * incidents over the last `daysBack` days). Soft-degrades to zeros when the
 * RPC is missing or Supabase is unset — ranking still works on live data alone.
 */
export type HistoricalBottleneck = {
  incidentCount: number;
  majorOrWorse: number;
  congestionCount: number;
  /** 0-100 composite — higher means chronically messier corridor. */
  score: number;
};

export function bottleneckScoreFromDensity(d: {
  incidentCount: number;
  majorOrWorse: number;
  congestionCount: number;
}): number {
  // Diminishing returns so a single bad week doesn't max the score.
  const raw = d.incidentCount * 4 + d.majorOrWorse * 8 + d.congestionCount * 5;
  return Math.min(100, Math.round(raw));
}

/** Great-circle distance in meters — used only for stop-order heuristics. */
export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pathLengthM(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineM(points[i - 1]!, points[i]!);
  }
  return total;
}

/**
 * v23: order intermediate stops for a shorter delivery loop.
 * Nearest-neighbor from origin, then 2-opt improvement, fixed destination.
 * n ≤ 8 so full local search is cheap.
 */

/**
 * TomTom Waypoint Optimization API — road-network order for delivery stops.
 * Falls back to null so callers can use local NN+2-opt.
 * https://developer.tomtom.com/routing/documentation/waypoint-optimization
 */

/**
 * TomTom Matrix Routing v2 (synchronous) — live-traffic travel times between
 * many OD pairs in one request. Used for multi-stop ordering quality.
 * https://developer.tomtom.com/routing-api/documentation/matrix-routing-v2/matrix-routing-v2-service
 */
export type MatrixCell = {
  originIndex: number;
  destinationIndex: number;
  travelTimeS: number;
  distanceM: number;
  trafficDelayS: number;
};

export async function fetchTomTomMatrix(
  origins: LatLng[],
  destinations: LatLng[]
): Promise<MatrixCell[] | null> {
  const key = ENV.tomtomApiKey;
  if (!key || origins.length === 0 || destinations.length === 0) return null;
  // Sync matrix max cells = 2500; keep delivery stops small.
  if (origins.length * destinations.length > 100) return null;

  try {
    const url = `https://api.tomtom.com/routing/matrix/2?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        origins: origins.map(o => ({
          point: { latitude: o.lat, longitude: o.lng },
        })),
        destinations: destinations.map(d => ({
          point: { latitude: d.lat, longitude: d.lng },
        })),
        options: {
          departAt: "any",
          traffic: "live",
          travelMode: "car",
          routeType: "fastest",
        },
      }),
      signal: abortAfter(15_000),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.warn(
        `[routePulse] TomTom matrix HTTP ${res.status}: ${bodyText.slice(0, 240)}`
      );
      return null;
    }
    const body = (await res.json()) as {
      data?: Array<{
        originIndex?: number;
        destinationIndex?: number;
        routeSummary?: {
          lengthInMeters?: number;
          travelTimeInSeconds?: number;
          trafficDelayInSeconds?: number;
        };
        // Some responses nest under `routeResults`
        routeResults?: Array<{
          lengthInMeters?: number;
          travelTimeInSeconds?: number;
          trafficDelayInSeconds?: number;
        }>;
      }>;
      // Legacy matrix shape
      matrix?: Array<
        Array<{
          statusCode?: number;
          response?: {
            routeSummary?: {
              lengthInMeters?: number;
              travelTimeInSeconds?: number;
              trafficDelayInSeconds?: number;
            };
          };
        }>
      >;
    };

    const cells: MatrixCell[] = [];
    if (Array.isArray(body.data)) {
      for (const row of body.data) {
        const summary = row.routeSummary ?? row.routeResults?.[0] ?? null;
        if (!summary) continue;
        cells.push({
          originIndex: row.originIndex ?? 0,
          destinationIndex: row.destinationIndex ?? 0,
          travelTimeS: summary.travelTimeInSeconds ?? 0,
          distanceM: summary.lengthInMeters ?? 0,
          trafficDelayS: summary.trafficDelayInSeconds ?? 0,
        });
      }
    } else if (Array.isArray(body.matrix)) {
      body.matrix.forEach((row, oi) => {
        row.forEach((cell, di) => {
          const summary = cell.response?.routeSummary;
          if (!summary || cell.statusCode !== 200) return;
          cells.push({
            originIndex: oi,
            destinationIndex: di,
            travelTimeS: summary.travelTimeInSeconds ?? 0,
            distanceM: summary.lengthInMeters ?? 0,
            trafficDelayS: summary.trafficDelayInSeconds ?? 0,
          });
        });
      });
    }
    return cells.length ? cells : null;
  } catch (err) {
    console.warn("[routePulse] TomTom matrix failed:", err);
    return null;
  }
}

/**
 * NN + 2-opt stop order using TomTom Matrix live travel times (not haversine).
 * Points = [origin, ...stops, destination]; returns order of stop indices only.
 */
export async function optimizeStopsViaMatrix(
  origin: LatLng,
  destination: LatLng,
  stops: LatLng[]
): Promise<{ order: number[]; minutesSaved: number; usedMatrix: true } | null> {
  if (stops.length < 2 || stops.length > 8) return null;
  const points = [origin, ...stops, destination];
  const cells = await fetchTomTomMatrix(points, points);
  if (!cells) return null;

  const n = points.length;
  const time = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => Infinity)
  );
  for (const c of cells) {
    if (
      c.originIndex >= 0 &&
      c.originIndex < n &&
      c.destinationIndex >= 0 &&
      c.destinationIndex < n
    ) {
      time[c.originIndex]![c.destinationIndex] = c.travelTimeS || Infinity;
    }
  }

  const pathTime = (ord: number[]) => {
    // ord is stop indices 0..stops.length-1; path is 0 → stops → n-1
    let t = 0;
    let prev = 0;
    for (const si of ord) {
      const idx = si + 1;
      t += time[prev]![idx] ?? 1e9;
      prev = idx;
    }
    t += time[prev]![n - 1] ?? 1e9;
    return t;
  };

  // Nearest neighbor from origin
  const remaining = new Set(stops.map((_, i) => i));
  const order: number[] = [];
  let current = 0; // point index
  while (remaining.size) {
    let best: number | null = null;
    let bestT = Infinity;
    for (const si of remaining) {
      const t = time[current]![si + 1] ?? Infinity;
      if (t < bestT) {
        bestT = t;
        best = si;
      }
    }
    if (best === null) break;
    order.push(best);
    remaining.delete(best);
    current = best + 1;
  }

  // 2-opt on travel time
  let bestOrder = order;
  let bestT = pathTime(bestOrder);
  const baseline = pathTime(stops.map((_, i) => i));
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < bestOrder.length - 1; i++) {
      for (let k = i + 1; k < bestOrder.length; k++) {
        const candidate = [
          ...bestOrder.slice(0, i),
          ...bestOrder.slice(i, k + 1).reverse(),
          ...bestOrder.slice(k + 1),
        ];
        const t = pathTime(candidate);
        if (t + 1 < bestT) {
          bestT = t;
          bestOrder = candidate;
          improved = true;
        }
      }
    }
  }

  const minutesSaved = Math.max(0, Math.round((baseline - bestT) / 60));
  return { order: bestOrder, minutesSaved, usedMatrix: true };
}

/** Fallback average urban travel speed when TomTom Matrix is unavailable — 25mph. */
const FALLBACK_SPEED_M_PER_MIN = (25 * 1609.34) / 60;

/** "HH:MM" → minutes since midnight. Returns null for anything unparseable. */
export function hhmmToMin(hhmm: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return null;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

/** Minutes since midnight → "HH:MM" (24h), wrapping past 1440 into the next day. */
export function minToHHMM(min: number): string {
  const wrapped = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Current minutes-since-midnight in Portland local time (America/Los_Angeles). */
export function nowMinutesInPortland(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "0";
  return (
    (parseInt(get("hour"), 10) % 24) * 60 + (parseInt(get("minute"), 10) || 0)
  );
}

/**
 * v30: cheapest-feasible-insertion scheduler for stops with due-by deadlines
 * (a real vehicle-routing-with-time-windows problem, not a plain shortest
 * path). Pure distance/time optimizers like optimizeStopsViaMatrix have no
 * concept of "must arrive by 14:00" — reordering to minimize total drive
 * time can and will blow through hard pickup windows. This builds the route
 * stop by stop, at each step inserting whichever remaining stop/position
 * costs the least extra travel time WITHOUT pushing any already-placed stop
 * past its deadline. When no fully-feasible insertion exists for a stop
 * (deadlines are simply too tight to hit all of them), it falls back to the
 * insertion that minimizes total lateness and flags the result infeasible,
 * rather than silently producing a route that looks fine but is wrong.
 */
export async function scheduleStopsWithDeadlines(
  origin: LatLng,
  destination: LatLng,
  stops: LatLng[],
  dueByMin: (number | null)[],
  departAtMin: number,
  dwellMin = 5
): Promise<{
  order: number[];
  etaMin: number[];
  feasible: boolean;
  totalLateMin: number;
  usedMatrix: boolean;
}> {
  const points = [origin, ...stops, destination];
  const pCount = points.length;

  const cells = await fetchTomTomMatrix(points, points);
  const usedMatrix = !!cells;
  const time: number[][] = Array.from({ length: pCount }, () =>
    Array.from({ length: pCount }, () => Infinity)
  );
  for (let i = 0; i < pCount; i++) {
    for (let j = 0; j < pCount; j++) {
      if (i === j) {
        time[i]![j] = 0;
        continue;
      }
      time[i]![j] =
        haversineM(points[i]!, points[j]!) / FALLBACK_SPEED_M_PER_MIN;
    }
  }
  if (cells) {
    for (const c of cells) {
      if (
        c.originIndex >= 0 &&
        c.originIndex < pCount &&
        c.destinationIndex >= 0 &&
        c.destinationIndex < pCount &&
        c.travelTimeS > 0
      ) {
        time[c.originIndex]![c.destinationIndex] = c.travelTimeS / 60;
      }
    }
  }

  /** origin=0, stop i is point i+1, destination is point pCount-1. */
  const pointIdx = (stopIdx: number) => stopIdx + 1;

  /** Arrival clock-minutes at each stop in `seq`, starting from origin. */
  const arrivalsFor = (seq: number[]): number[] => {
    const out: number[] = [];
    let clock = departAtMin;
    let prevPoint = 0;
    for (const stopIdx of seq) {
      clock += time[prevPoint]![pointIdx(stopIdx)]!;
      out.push(clock);
      clock += dwellMin;
      prevPoint = pointIdx(stopIdx);
    }
    return out;
  };

  const latenessFor = (seq: number[], arrivals: number[]): number =>
    seq.reduce((sum, stopIdx, i) => {
      const due = dueByMin[stopIdx];
      if (due == null) return sum;
      return sum + Math.max(0, arrivals[i]! - due);
    }, 0);

  let placed: number[] = [];
  const unplaced = new Set<number>(stops.map((_, i) => i));

  while (unplaced.size > 0) {
    let bestFeasible: { seq: number[]; stopIdx: number; cost: number } | null =
      null;
    let bestAny: {
      seq: number[];
      stopIdx: number;
      lateness: number;
      cost: number;
    } | null = null;

    for (const stopIdx of unplaced) {
      for (let pos = 0; pos <= placed.length; pos++) {
        const candidate = [
          ...placed.slice(0, pos),
          stopIdx,
          ...placed.slice(pos),
        ];
        const prevPoint = pos === 0 ? 0 : pointIdx(placed[pos - 1]!);
        const nextPoint =
          pos === placed.length ? pCount - 1 : pointIdx(placed[pos]!);
        const insertionCost =
          time[prevPoint]![pointIdx(stopIdx)]! +
          time[pointIdx(stopIdx)]![nextPoint]! -
          time[prevPoint]![nextPoint]!;

        const arrivals = arrivalsFor(candidate);
        const lateness = latenessFor(candidate, arrivals);

        if (lateness === 0) {
          if (!bestFeasible || insertionCost < bestFeasible.cost) {
            bestFeasible = { seq: candidate, stopIdx, cost: insertionCost };
          }
        }
        if (
          !bestAny ||
          lateness < bestAny.lateness ||
          (lateness === bestAny.lateness && insertionCost < bestAny.cost)
        ) {
          bestAny = { seq: candidate, stopIdx, lateness, cost: insertionCost };
        }
      }
    }

    const chosen = bestFeasible ?? bestAny!;
    placed = chosen.seq;
    unplaced.delete(chosen.stopIdx);
  }

  const finalArrivals = arrivalsFor(placed);
  const totalLateMin = Math.round(latenessFor(placed, finalArrivals));
  return {
    order: placed,
    etaMin: finalArrivals.map(Math.round),
    feasible: totalLateMin === 0,
    totalLateMin,
    usedMatrix,
  };
}

export async function optimizeStopsTomTom(
  origin: LatLng,
  destination: LatLng,
  stops: LatLng[]
): Promise<number[] | null> {
  const key = ENV.tomtomApiKey;
  if (!key || stops.length < 2 || stops.length > 12) return null;
  try {
    const waypoints = [
      { point: { latitude: origin.lat, longitude: origin.lng } },
      ...stops.map(s => ({
        point: { latitude: s.lat, longitude: s.lng },
      })),
      { point: { latitude: destination.lat, longitude: destination.lng } },
    ];
    const url = `https://api.tomtom.com/routing/waypointoptimization/1?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        waypoints,
        options: {
          travelMode: "car",
          vehicleMaxSpeed: 120,
          // Keep origin first and destination last when the API supports it
          // via reconstructed order mapping below.
        },
      }),
      signal: abortAfter(10_000),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.warn(
        `[routePulse] TomTom waypoint opt HTTP ${res.status}: ${bodyText.slice(0, 200)}`
      );
      return null;
    }
    const body = (await res.json()) as { optimizedOrder?: number[] };
    const order = body.optimizedOrder;
    if (!Array.isArray(order) || order.length !== waypoints.length) return null;
    // optimizedOrder indexes into the full list (origin + stops + dest).
    // Extract only intermediate stop indices, remapped to 0..stops.length-1.
    const stopOrder: number[] = [];
    for (const idx of order) {
      if (idx === 0 || idx === waypoints.length - 1) continue; // origin/dest
      const stopIdx = idx - 1;
      if (stopIdx >= 0 && stopIdx < stops.length) stopOrder.push(stopIdx);
    }
    if (stopOrder.length !== stops.length) return null;
    return stopOrder;
  } catch (err) {
    console.warn("[routePulse] TomTom waypoint opt failed:", err);
    return null;
  }
}

/**
 * Full TomTom Routing API with traffic, vehicle settings, optional via points,
 * and computeBestOrder for multi-stop. Returns BaseRoute[] or null.
 */
async function fetchTomTomRoutes(
  origin: LatLng,
  destination: LatLng,
  opts: {
    via?: LatLng[];
    computeBestOrder?: boolean;
    maxAlternatives?: number;
  } = {}
): Promise<BaseRoute[] | null> {
  const apiKey = ENV.tomtomApiKey;
  if (!apiKey) return null;
  const via = opts.via ?? [];
  const parts = [
    `${origin.lat},${origin.lng}`,
    ...via.map(v => `${v.lat},${v.lng}`),
    `${destination.lat},${destination.lng}`,
  ];
  const maxAlt =
    via.length === 0 && !opts.computeBestOrder
      ? Math.min(2, opts.maxAlternatives ?? 2)
      : 0;
  // Minimal freemium-safe query. Extra params (computeTravelTimeFor, vehicleMaxSpeed,
  // sectionType) have produced 4xx on free keys without counting as "Routing API".
  let url =
    `https://api.tomtom.com/routing/1/calculateRoute/${parts.join(":")}/json` +
    `?key=${apiKey}` +
    `&traffic=true` +
    `&travelMode=car` +
    `&routeType=fastest`;
  if (opts.computeBestOrder && via.length >= 1) url += `&computeBestOrder=true`;
  if (maxAlt > 0) url += `&maxAlternatives=${maxAlt}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: abortAfter(12_000),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.warn(
        `[routePulse] TomTom routing HTTP ${res.status}: ${bodyText.slice(0, 300)}`
      );
      // One retry with absolute-minimum params (still counts as Routing API usage).
      if (res.status >= 400 && res.status < 500) {
        const bare =
          `https://api.tomtom.com/routing/1/calculateRoute/${parts.join(":")}/json` +
          `?key=${apiKey}&travelMode=car`;
        try {
          const res2 = await fetch(bare, {
            headers: { Accept: "application/json" },
            signal: abortAfter(10_000),
          });
          if (res2.ok) {
            console.info("[routePulse] TomTom routing recovered on bare retry");
            const body2 = (await res2.json()) as {
              routes?: Array<{
                summary?: {
                  lengthInMeters?: number;
                  travelTimeInSeconds?: number;
                  trafficDelayInSeconds?: number;
                };
                legs?: Array<{
                  points?: Array<{ latitude: number; longitude: number }>;
                }>;
                guidance?: {
                  instructions?: Array<{
                    message?: string;
                    routeOffsetInMeters?: number;
                    point?: { latitude: number; longitude: number };
                  }>;
                };
              }>;
            };
            const routes2 = body2.routes ?? [];
            if (routes2.length) {
              return routes2.map(r => {
                const coords: [number, number][] = [];
                for (const leg of r.legs ?? []) {
                  for (const p of leg.points ?? []) {
                    coords.push([p.longitude, p.latitude]);
                  }
                }
                return {
                  distance: r.summary?.lengthInMeters ?? 0,
                  duration: r.summary?.travelTimeInSeconds ?? 0,
                  geometry: {
                    type: "LineString" as const,
                    coordinates: coords,
                  },
                  maneuvers: [],
                  pathStyle: "standard" as const,
                  trafficDelayInSeconds: r.summary?.trafficDelayInSeconds,
                } satisfies BaseRoute;
              });
            }
          } else {
            const t2 = await res2.text().catch(() => "");
            console.warn(
              `[routePulse] TomTom routing bare retry HTTP ${res2.status}: ${t2.slice(0, 200)}`
            );
          }
        } catch (err2) {
          console.warn("[routePulse] TomTom routing bare retry failed:", err2);
        }
      }
      return null;
    }
    const body = (await res.json()) as {
      routes?: Array<{
        summary?: {
          lengthInMeters?: number;
          travelTimeInSeconds?: number;
          trafficDelayInSeconds?: number;
        };
        legs?: Array<{
          points?: Array<{ latitude: number; longitude: number }>;
        }>;
        guidance?: {
          instructions?: Array<{
            message?: string;
            routeOffsetInMeters?: number;
            point?: { latitude: number; longitude: number };
          }>;
        };
        optimizedWaypoints?: Array<{
          providedIndex?: number;
          optimizedIndex?: number;
        }>;
      }>;
    };
    const routes = body.routes ?? [];
    if (!routes.length) {
      console.warn("[routePulse] TomTom routing returned 0 routes");
      return null;
    }
    console.info(`[routePulse] TomTom routing OK — ${routes.length} route(s)`);
    return routes.map(r => {
      const coords: [number, number][] = [];
      for (const leg of r.legs ?? []) {
        for (const p of leg.points ?? []) {
          coords.push([p.longitude, p.latitude]);
        }
      }
      const maneuvers: RouteManeuver[] = (r.guidance?.instructions ?? [])
        .filter(i => i.message)
        .map(i => ({
          instruction: i.message!,
          type: "turn",
          modifier: null,
          roadName: null,
          distanceM: i.routeOffsetInMeters ?? 0,
          location: i.point
            ? ([i.point.longitude, i.point.latitude] as [number, number])
            : ([coords[0]?.[0] ?? 0, coords[0]?.[1] ?? 0] as [number, number]),
          durationS: 0,
          coordinates: [] as [number, number][],
        }));
      return {
        distance: r.summary?.lengthInMeters ?? 0,
        duration: r.summary?.travelTimeInSeconds ?? 0,
        geometry: { type: "LineString" as const, coordinates: coords },
        maneuvers,
        pathStyle: "standard" as const,
      };
    });
  } catch (err) {
    console.warn("[routePulse] TomTom routing failed:", err);
    return null;
  }
}

export function optimizeStopOrder(
  origin: LatLng,
  destination: LatLng,
  stops: LatLng[]
): { order: number[]; milesSaved: number } {
  if (stops.length <= 1) {
    return { order: stops.map((_, i) => i), milesSaved: 0 };
  }

  const n = stops.length;
  // Nearest neighbor from origin
  const remaining = new Set(Array.from({ length: n }, (_, i) => i));
  const order: number[] = [];
  let current: LatLng = origin;
  while (remaining.size > 0) {
    let best = -1;
    let bestD = Infinity;
    for (const i of remaining) {
      const d = haversineM(current, stops[i]!);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    order.push(best);
    remaining.delete(best);
    current = stops[best]!;
  }

  const fullPath = (ord: number[]) => [
    origin,
    ...ord.map(i => stops[i]!),
    destination,
  ];
  let bestOrder = order;
  let bestLen = pathLengthM(fullPath(bestOrder));
  const baseline = pathLengthM(fullPath(stops.map((_, i) => i)));

  // 2-opt
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < bestOrder.length - 1; i++) {
      for (let k = i + 1; k < bestOrder.length; k++) {
        const candidate = [
          ...bestOrder.slice(0, i),
          ...bestOrder.slice(i, k + 1).reverse(),
          ...bestOrder.slice(k + 1),
        ];
        const len = pathLengthM(fullPath(candidate));
        if (len + 1 < bestLen) {
          bestLen = len;
          bestOrder = candidate;
          improved = true;
        }
      }
    }
  }

  const milesSaved = Math.max(0, (baseline - bestLen) / 1609.34);
  return {
    order: bestOrder,
    milesSaved: Math.round(milesSaved * 10) / 10,
  };
}

/**
 * v23: single glanceable health for drivers — inverse of risk/stress/bottleneck/flow pain.
 */
export function computeDriverHealthScore(route: {
  riskScore: number;
  stressScore: number;
  energyScore: number;
  bottleneckScore?: number;
  flow?: { samples: number; avgRatio: number; roadClosedCount: number } | null;
}): number {
  const bottleneck = route.bottleneckScore ?? 0;
  let pain =
    route.riskScore * 0.35 +
    route.stressScore * 0.3 +
    route.energyScore * 0.15 +
    bottleneck * 0.2;
  if (route.flow && route.flow.roadClosedCount > 0) pain += 20;
  else if (route.flow && route.flow.samples >= 2 && route.flow.avgRatio < 0.55)
    pain += 12;
  return Math.max(0, Math.min(100, Math.round(100 - pain)));
}

async function getHistoricalBottleneck(
  geometry: { coordinates: [number, number][] },
  bufferMeters = 400,
  daysBack = 21
): Promise<HistoricalBottleneck> {
  const empty: HistoricalBottleneck = {
    incidentCount: 0,
    majorOrWorse: 0,
    congestionCount: 0,
    score: 0,
  };
  const supabase = getSupabaseAdmin();
  if (!supabase) return empty;

  try {
    const { data, error } = await supabase.rpc("incident_density_near_route", {
      route_wkt: geometryToWkt(geometry),
      buffer_meters: bufferMeters,
      days_back: daysBack,
    });
    if (error || !data) return empty;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return empty;
    const incidentCount = Number(row.incident_count ?? 0) || 0;
    const majorOrWorse = Number(row.major_or_worse ?? 0) || 0;
    const congestionCount = Number(row.congestion_count ?? 0) || 0;
    return {
      incidentCount,
      majorOrWorse,
      congestionCount,
      score: bottleneckScoreFromDensity({
        incidentCount,
        majorOrWorse,
        congestionCount,
      }),
    };
  } catch (err) {
    console.warn("[routePulse] historical bottleneck lookup failed:", err);
    return empty;
  }
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

/**
 * v17: bbox param (optional, backwards-compatible) — geofenced query
 * backed by list_cameras_in_bbox (drizzle/0055_routepulse_bbox_queries.sql)
 * instead of always pulling the whole state. See the matching note on
 * listActiveIncidents below for the full rationale; same story here.
 */
export async function listCameras(bbox?: Bbox): Promise<RouteCamera[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = bbox
    ? await supabase.rpc("list_cameras_in_bbox", {
        min_lat: bbox.minLat,
        min_lng: bbox.minLng,
        max_lat: bbox.maxLat,
        max_lng: bbox.maxLng,
        limit_n: 300,
      })
    : await supabase.rpc("list_cameras", { limit_n: 300 });

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
  /**
   * v12: per-route verdicts aligned by index (null for the chosen route).
   * Absent when the deterministic fallback was used.
   */
  verdicts?: (string | null)[];
};

/**
 * Deterministic route pick used when the AI is unavailable or fails
 * validation: minimize (live-traffic-corrected duration + incident-report
 * delay not already reflected in that correction). This is the same
 * quantity a thoughtful driver optimizes, so even our "degraded" path is
 * smarter than a raw fastest-time sort — and smarter than ranking on a
 * static graph duration the way a plain routing API would.
 */
function deterministicPick(
  routes: ScoredRoute[],
  preference: RoutePreference = "balanced"
): AiPick {
  let best = 0;
  let bestCost = Infinity;
  routes.forEach((r, i) => {
    const cost = preferenceCost(r, preference);
    if (cost < bestCost) {
      bestCost = cost;
      best = i;
    }
  });
  const chosen = routes[best];
  if (!chosen) {
    return {
      chosenIndex: 0,
      explanation: "Best available route.",
      confidence: "none",
    };
  }
  let pureTimeBest = 0;
  let pureTimeCost = Infinity;
  routes.forEach((r, i) => {
    const c = r.liveDurationS + r.incidentDelayMin * 60;
    if (c < pureTimeCost) {
      pureTimeCost = c;
      pureTimeBest = i;
    }
  });
  const flowDelay = Math.round((chosen.liveDurationS - chosen.duration) / 60);
  const delay = chosen.delayEstimateMin;
  const timeMin = Math.round(chosen.liveDurationS / 60);
  let explanation: string;
  if (preference !== "fastest" && best !== pureTimeBest) {
    const pure = routes[pureTimeBest]!;
    const pureMin = Math.round(pure.liveDurationS / 60);
    const stressDelta = pure.stressScore - chosen.stressScore;
    const energyDelta = pure.energyScore - chosen.energyScore;
    const timeDelta = timeMin - pureMin;
    const parts: string[] = [];
    if (stressDelta >= 8) parts.push(`cuts stress by ~${stressDelta} pts`);
    if (energyDelta >= 8)
      parts.push(`lower energy/effort (~${energyDelta} pts)`);
    if (chosen.maneuverCount + 3 < pure.maneuverCount) {
      parts.push(
        `fewer turns (${chosen.maneuverCount} vs ${pure.maneuverCount})`
      );
    }
    if (chosen.pathStyle === "surface" && pure.pathStyle !== "surface") {
      parts.push("uses surface streets instead of the freeway");
    }
    const localHits = matchLocalKnowledge(
      {
        geometry: pure.geometry,
        maneuvers: pure.maneuvers,
        incidents: pure.incidents,
      },
      "peak"
    );
    const avoidedLocal = localHits.filter(
      h => !(chosen.localKnowledgeIds ?? []).includes(h.id)
    );
    if (avoidedLocal.length > 0) {
      parts.push(`avoids known local pain (${avoidedLocal[0]!.id})`);
    }
    const why =
      parts.length > 0
        ? parts.join(", ")
        : "avoids heavier congestion / incidents";
    explanation = `Chose a calmer option (+${Math.max(0, timeDelta)} min vs pure fastest) because it ${why}. Preference: ${preference}.`;
    const chosenLocalSummary = localKnowledgeSummary(
      matchLocalKnowledge(
        {
          geometry: chosen.geometry,
          maneuvers: chosen.maneuvers,
          incidents: chosen.incidents,
        },
        "peak"
      )
    );
    if (chosenLocalSummary && preference !== "fastest") {
      explanation = `${explanation} Local note: ${chosenLocalSummary.slice(0, 180)}`;
      if (explanation.length > 480)
        explanation = explanation.slice(0, 477) + "...";
    }
  } else if (flowDelay >= 3) {
    explanation = `Best route under ${preference} preference accounting for current traffic (measured ~${flowDelay} min slower than usual${chosen.incidentDelayMin > 0 ? `, plus ${chosen.incidentDelayMin} min for incidents` : ""}).`;
  } else if (delay > 0) {
    explanation = `Best route under ${preference} preference after adjusting for current incidents (est. +${delay} min delay).`;
  } else {
    explanation =
      preference === "fastest"
        ? "Fastest available route."
        : `Best available route for ${preference} preference (~${timeMin} min).`;
  }
  return { chosenIndex: best, explanation, confidence: "none" };
}

async function scoreRoutesWithAI(
  routes: ScoredRoute[],
  timeContext: TimeContext,
  preference: RoutePreference = "balanced"
): Promise<AiPick> {
  const timeNote =
    timeContext === "peak"
      ? "Local time context: weekday commute peak — congestion incidents are weighted heavier, and jams are likely still building."
      : timeContext === "night"
        ? "Local time context: overnight — congestion is lighter, but closures and hazards matter more relative to traffic."
        : "Local time context: off-peak.";
  const prefNote =
    preference === "fastest"
      ? "Driver preference: FASTEST — prioritize pure time almost exclusively."
      : preference === "quiet"
        ? "Driver preference: QUIET / LOW-STRESS — strongly prefer routes with lower stressScore even if 5-12% slower."
        : preference === "fuel"
          ? "Driver preference: FUEL / ENERGY — prefer lower energyScore even if a bit slower."
          : "Driver preference: BALANCED (default for delivery) — time still matters most, but accept a modest time penalty when stress or energy drops substantially.";

  // v24: aggregate local-driver hits across candidates for the AI brief.
  const allLocalHits = routes.flatMap(r =>
    matchLocalKnowledge(
      { geometry: r.geometry, maneuvers: r.maneuvers, incidents: r.incidents },
      timeContext
    )
  );
  const uniqueLocal = new Map(allLocalHits.map(h => [h.id, h]));
  const localBlock = formatLocalKnowledgeForPrompt(
    Array.from(uniqueLocal.values()).sort(
      (a, b) =>
        b.stressPenalty +
        b.bottleneckPenalty -
        (a.stressPenalty + a.bottleneckPenalty)
    )
  );

  // Compact TomTom snapshot for the model (ratios already in route objects).
  const flowLines = routes
    .map((r, i) => {
      const f = r.flow;
      if (!f || f.samples < 1) return null;
      return `Route ${i}: TomTom flow avg ${(f.avgRatio * 100).toFixed(0)}% free-flow, worst ${(f.worstRatio * 100).toFixed(0)}%, closedSamples=${f.roadClosedCount}, ~${f.avgCurrentMph} mph now vs ${f.avgFreeflowMph} free-flow`;
    })
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a senior Portland-metro route desk for delivery and gig drivers. Pick the best driving route under the stated preference. Reason like someone who drives these streets daily: weigh live-traffic-corrected duration, TomTom measured flow, incident delay, stressScore, energyScore, bottleneckScore, and local-driver knowledge. Under balanced/quiet/fuel modes you SHOULD prefer a slightly longer route when it clearly reduces stress, chronic bottleneck exposure, or known local pain. Name real corridor pressure (I-5, I-205, US-26, bridges, SE arterial backups) when the numbers support it. ${timeNote} ${prefNote}

${flowLines ? "Live TomTom flow grounding:\n" + flowLines + "\n" : ""}

${localBlock ? localBlock + "\n\n" : ""}
Incidents combine DOT/511/NWS/WSDOT agency feeds with live TomTom Traffic and Google Maps crowdsourced alerts (source field tells you which). Each incident may include distance_m (how far off the route line it is — already factored into risk_score, but useful context) and age_min (minutes since it was first reported — also already factored in, except for closures/construction which don't decay). A report over 2-3 hours old with no closure/construction type may already be cleared in reality even though it's still in the feed; you can note that in your explanation when it's the deciding factor, but don't need to re-derive risk from these fields yourself. live_flow is TomTom's measured speed as a percentage of free-flow, sampled along the route right now: 100 = free-flowing, below 70 = heavy congestion, road_closed_segments > 0 means TomTom flags the road itself as closed. live_duration_s already has this live-flow correction baked in (it is NOT the same as base duration_s — it's what the trip will actually take right now, not the static routing-graph estimate). Treat live_flow/live_duration_s as ground truth for current conditions — it catches slowdowns that haven't generated an incident report yet.

Routes: ${JSON.stringify(
    routes.map(r => ({
      distance_m: r.distance,
      duration_s: r.duration,
      live_duration_s: r.liveDurationS,
      risk_score: r.riskScore,
      stress_score: r.stressScore,
      energy_score: r.energyScore,
      maneuver_count: r.maneuverCount,
      path_style: r.pathStyle ?? "standard",
      bottleneck_score: r.bottleneckScore ?? 0,
      historical_incidents_21d: r.historicalIncidentCount ?? 0,
      local_knowledge_ids: r.localKnowledgeIds ?? [],
      incident_delay_min: r.incidentDelayMin,
      preference_cost: Math.round(preferenceCost(r, preference) * 10) / 10,
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
        // v18: same distance/age signal now feeding computeRouteRisk's
        // weighting (see incidentDistanceWeight/incidentTimeDecay) —
        // surfaced here too so the AI's explanation text can reflect it
        // directly ("a 3-hour-old report may already be cleared") rather
        // than only seeing its downstream effect on risk_score. Omitted
        // when unknown (grounding sources that don't compute distance,
        // or feeds with no timestamp) rather than sent as a misleading 0.
        distance_m:
          i.distanceM !== undefined ? Math.round(i.distanceM) : undefined,
        age_min: i.startedAt
          ? Math.max(
              0,
              Math.round(
                (Date.now() - new Date(i.startedAt).getTime()) / 60_000
              )
            )
          : undefined,
      })),
    }))
  )}

Respond ONLY with JSON: { "chosen_index": 0, "explanation": "1-2 short sentences for the driver: name the specific trade-off (time vs stress/energy/incidents) and quantify when relevant. If you chose a non-fastest route, say why the calmer/leaner option wins under the preference.", "confidence": "high|medium|low", "avoid_reasons": ["", "2-8 words on why each NON-chosen route loses, aligned by route index; empty string for the chosen route"] }`;

  try {
    // Prefer native Gemini when GEMINI_API_KEY is set (Netlify already has it).
    // Then Groq, then OpenRouter free. Unset keys are skipped by the chain.
    const geminiPrimary = (ENV.geminiApiKey ?? "").length > 0;
    const primary = geminiPrimary
      ? "gemini-2.5-flash"
      : `groq/${GROQ_FALLBACK_MODEL}`;
    const chain = geminiPrimary
      ? [
          "gemini-2.5-flash",
          `gemini/${GEMINI_FALLBACK_MODEL}`,
          `groq/${GROQ_FALLBACK_MODEL}`,
          ...FREE_TIER_FALLBACK_CHAIN,
        ]
      : [...FREE_TIER_FALLBACK_CHAIN];
    const result = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      model: primary,
      modelChain: chain,
      maxTokens: 380,
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

    // v12: avoid_reasons is advisory — accept only a well-shaped array
    // aligned to the route count, normalize the chosen slot to null, and
    // drop the whole thing rather than failing an otherwise valid pick.
    let verdicts: (string | null)[] | undefined;
    if (
      Array.isArray(parsed.avoid_reasons) &&
      parsed.avoid_reasons.length === routes.length &&
      parsed.avoid_reasons.every(
        (v: unknown) => typeof v === "string" && v.length <= 120
      )
    ) {
      verdicts = (parsed.avoid_reasons as string[]).map(
        (v: string, i: number) =>
          i === parsed.chosen_index || v.trim().length === 0 ? null : v.trim()
      );
    }

    return {
      chosenIndex: parsed.chosen_index,
      explanation: polishResponse(parsed.explanation),
      confidence,
      verdicts,
    };
  } catch (err) {
    // AI scoring is an enhancement, never a hard dependency — and the
    // deterministic fallback is itself delay-aware, not just route[0].
    console.warn("[routePulse] AI scoring failed, falling back:", err);
    return deterministicPick(routes, preference);
  }
}

/** A stop address, optionally with a "must arrive by" deadline ("HH:MM", 24h). */
export type StopWithDeadline = string | { address: string; dueBy?: string };

export async function getRoute(
  originAddress: string,
  destinationAddress: string,
  preference: RoutePreference = "balanced",
  stopAddresses: StopWithDeadline[] = [],
  optimizeStops = true,
  /** "HH:MM" local departure time — only meaningful when a stop has a dueBy. */
  departAt?: string
): Promise<RouteResult> {
  // Geocode first — the cache key and every downstream step depends on
  // resolved coordinates, and a bad address should fail fast with a clear
  // message rather than an OSRM "no route" error.
  const stopEntries = stopAddresses
    .map(s =>
      typeof s === "string"
        ? { address: s.trim(), dueBy: undefined as string | undefined }
        : { address: s.address.trim(), dueBy: s.dueBy }
    )
    .filter(s => s.address.length >= 3)
    .slice(0, 15);
  const stopList = stopEntries.map(s => s.address);
  if (!ENV.tomtomApiKey) {
    console.warn(
      "[routePulse] TOMTOM_API_KEY is empty at runtime — flow/routing/matrix/incidents will no-op"
    );
  }

  const [origin, destination, ...rawStops] = await Promise.all([
    geocodeAddress(originAddress),
    geocodeAddress(destinationAddress),
    ...stopList.map(a => geocodeAddress(a)),
  ]);

  // v30: dueBy deadlines turn this from a shortest-path problem into a
  // vehicle-routing-with-time-windows problem — a plain distance/time
  // optimizer (below) has no idea a stop must happen by a specific clock
  // time and will happily reorder past it. Deadlines take priority over
  // optimizeStops whenever any are present.
  const dueByMinList = stopEntries.map(s =>
    s.dueBy ? hhmmToMin(s.dueBy) : null
  );
  const hasDeadlines = dueByMinList.some(d => d != null);

  // v23: smart stop order for delivery — reorder before OSRM so the route
  // itself follows the efficient sequence, not just the typed order.
  let stops = rawStops;
  let stopPlan: RouteResult["stopPlan"] = undefined;
  let stopSchedule: RouteResult["stopSchedule"] = null;
  // Track which TomTom products actually answered (for UI receipts).
  let tomtomMatrixUsed = false;
  let tomtomWaypointOptUsed = false;

  if (rawStops.length >= 1 && hasDeadlines) {
    const departAtMin = departAt
      ? (hhmmToMin(departAt) ?? nowMinutesInPortland())
      : nowMinutesInPortland();
    const sched = await scheduleStopsWithDeadlines(
      origin,
      destination,
      rawStops,
      dueByMinList,
      departAtMin
    );
    if (sched.usedMatrix) tomtomMatrixUsed = true;
    stops = sched.order.map(i => rawStops[i]!);
    const orderChanged = sched.order.some((v, i) => v !== i);
    stopPlan = {
      optimized: orderChanged,
      stops: sched.order.map(i => ({ ...rawStops[i]!, originalIndex: i })),
      estimatedMilesSaved: null,
    };
    stopSchedule = {
      feasible: sched.feasible,
      totalLateMin: sched.totalLateMin,
      stops: sched.order.map((stopIdx, seqPos) => {
        const due = dueByMinList[stopIdx];
        const eta = sched.etaMin[seqPos]!;
        return {
          address: stopEntries[stopIdx]!.address,
          lat: rawStops[stopIdx]!.lat,
          lng: rawStops[stopIdx]!.lng,
          originalIndex: stopIdx,
          dueBy: due != null ? minToHHMM(due) : null,
          etaClock: minToHHMM(eta),
          lateByMin: due != null ? Math.max(0, Math.round(eta - due)) : 0,
        };
      }),
    };
  } else if (rawStops.length >= 2 && optimizeStops) {
    // 1) Matrix v2 live-traffic TSP  2) Waypoint Optimization API  3) haversine
    const matrixPlan = await optimizeStopsViaMatrix(
      origin,
      destination,
      rawStops
    );
    const ttOrder = matrixPlan
      ? null
      : await optimizeStopsTomTom(origin, destination, rawStops);
    if (matrixPlan) tomtomMatrixUsed = true;
    if (ttOrder) tomtomWaypointOptUsed = true;

    const { order: localOrder, milesSaved } = optimizeStopOrder(
      origin,
      destination,
      rawStops
    );
    const order = matrixPlan?.order ?? ttOrder ?? localOrder;
    stops = order.map(i => rawStops[i]!);
    const orderChanged = order.some((v, i) => v !== i);
    const milesFromMatrix =
      matrixPlan && orderChanged
        ? Math.round((matrixPlan.minutesSaved / 60) * 25 * 10) / 10 // rough mi from min
        : null;
    stopPlan = {
      optimized: orderChanged,
      stops: order.map(i => ({ ...rawStops[i]!, originalIndex: i })),
      estimatedMilesSaved: orderChanged ? (milesFromMatrix ?? milesSaved) : 0,
    };
  } else if (rawStops.length > 0) {
    stopPlan = {
      optimized: false,
      stops: rawStops.map((s, i) => ({ ...s, originalIndex: i })),
      estimatedMilesSaved: null,
    };
  }

  // _vtt1 busts caches written before TomTom routing/flow were reliably called.
  const key =
    cacheKey(origin, destination, preference) +
    (stops.length
      ? `_via:${stops.map(s => `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`).join("|")}`
      : "") +
    (optimizeStops && rawStops.length >= 2 ? "_opt" : "") +
    // Deadlines change stopSchedule (ETAs/feasibility) independent of the
    // stop lat/lngs above, so they need their own cache-key component —
    // otherwise a different departAt/dueBy set could hit a stale schedule.
    (hasDeadlines ? `_dl:${departAt ?? "now"}:${dueByMinList.join(",")}` : "") +
    "_vtt1";

  const cached = await readCache(key);
  if (cached) {
    // v10 pattern: never skip live Traffic API just because geometry is cached.
    // Cache was swallowing all TomTom calls after the first hit → MyTomTom flatlined.
    if (ENV.tomtomApiKey) {
      try {
        const geom = cached.route.geometry as {
          coordinates: [number, number][];
        };
        const bbox = bboxForGeometries([geom]);
        const [freshIncidents, freshFlow] = await Promise.all([
          bbox ? fetchTomTomTrafficIncidents(bbox) : Promise.resolve([]),
          fetchTomTomFlow(geom.coordinates),
        ]);
        console.info(
          `[routePulse] TomTom traffic on cache-hit: incidents=${freshIncidents.length} flowSamples=${freshFlow?.samples ?? 0}`
        );
        if (freshIncidents.length || freshFlow) {
          const near = freshIncidents.filter(i =>
            isNearRoute(i.lat, i.lng, geom.coordinates, 500)
          );
          const existing = cached.route.incidents ?? [];
          const mergedIncidents = [
            ...existing,
            ...dedupeIncidents(existing, near),
          ];
          let liveDurationS =
            cached.route.liveDurationS ?? cached.route.duration;
          if (freshFlow && freshFlow.samples >= 2 && freshFlow.avgRatio > 0) {
            const clamped = Math.max(0.3, Math.min(1.15, freshFlow.avgRatio));
            liveDurationS = Math.round(cached.route.duration / clamped);
          }
          return {
            ...cached,
            route: {
              ...cached.route,
              incidents: mergedIncidents,
              liveDurationS,
              flow: freshFlow ?? cached.route.flow,
            },
            grounding: {
              ...(cached.grounding ?? {}),
              sources: Array.from(
                new Set([
                  ...((cached.grounding as { sources?: string[] })?.sources ??
                    []),
                  ...(freshIncidents.length ? ["tomtom-incidents"] : []),
                  ...(freshFlow ? ["tomtom-flow"] : []),
                ])
              ),
              tomtomApis: Array.from(
                new Set([
                  ...((cached.grounding as { tomtomApis?: string[] })
                    ?.tomtomApis ?? []),
                  ...(freshIncidents.length ? (["incidents"] as const) : []),
                  ...(freshFlow ? (["flow"] as const) : []),
                ])
              ),
            },
            cached: true,
          };
        }
      } catch (err) {
        console.warn("[routePulse] TomTom cache-hit refresh failed:", err);
      }
    }
    return cached;
  }

  const baseRoutes = await fetchBaseRoutes(
    origin,
    destination,
    preference,
    stops
  );

  // v12: time-of-day context for the risk model — computed once per
  // uncached request so every route in the comparison is scored under the
  // same conditions.
  const timeContext = routeTimeContext();

  // v10: one bbox covering every route option → a single TomTom + Waze
  // call set per uncached query, so upstream quotas stay flat no matter
  // how many alternatives the router returns. Keys unset = clean no-ops.
  const combinedBbox = bboxForGeometries(baseRoutes.map(r => r.geometry));
  const [tomtomIncidents, wazeAlerts, tomtomLiveDurationS] = combinedBbox
    ? await Promise.all([
        fetchTomTomTrafficIncidents(combinedBbox),
        fetchWazeAlerts(combinedBbox),
        fetchTomTomLiveDuration(origin, destination),
      ])
    : [[], [], null];
  console.info(
    `[routePulse] TomTom live path: incidents=${tomtomIncidents.length} liveEta=${tomtomLiveDurationS ?? "n/a"} key=${ENV.tomtomApiKey ? "yes" : "NO"}`
  );

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
      const [flow, historical] = await Promise.all([
        fetchTomTomFlow(r.geometry.coordinates),
        getHistoricalBottleneck(r.geometry),
      ]);
      let liveDurationS = r.duration;
      if (flow && flow.samples >= 2 && flow.avgRatio > 0) {
        const clampedRatio = Math.max(0.3, Math.min(1.15, flow.avgRatio));
        liveDurationS = r.duration / clampedRatio;
      }
      // Prefer TomTom traffic-aware ETA when present — anchors all alts to
      // a measured network delay, then scale by relative OSRM length.
      if (
        typeof tomtomLiveDurationS === "number" &&
        tomtomLiveDurationS > 0 &&
        baseRoutes[0]
      ) {
        const primaryOsrm = baseRoutes[0]!.duration || r.duration;
        const scale = primaryOsrm > 0 ? r.duration / primaryOsrm : 1;
        const tomtomScaled = tomtomLiveDurationS * scale;
        // Blend 60% TomTom traffic ETA + 40% flow-adjusted OSRM when both exist
        liveDurationS =
          flow && flow.samples >= 2
            ? tomtomScaled * 0.6 + liveDurationS * 0.4
            : tomtomScaled;
      }
      const flowDelayMin = Math.max(
        0,
        Math.round((liveDurationS - r.duration) / 60)
      );

      // v19: full multi-objective scores
      const scores = computeRouteScores(
        incidents,
        Math.round(liveDurationS),
        r.distance,
        r.maneuvers,
        flow,
        timeContext
      );
      let riskScore = scores.riskScore;
      let stressScore = scores.stressScore;
      let energyScore = scores.energyScore;
      const incidentDelayMin = scores.delayEstimateMin;
      const delayEstimateMin = flowDelayMin + incidentDelayMin;
      let bottleneckScore = historical.score;

      if (flow && flow.roadClosedCount > 0) {
        riskScore = Math.min(MAX_RISK_SCORE, riskScore + 30);
      } else if (flow && flow.samples >= 2 && flow.worstRatio < 0.5) {
        riskScore = Math.min(MAX_RISK_SCORE, riskScore + 10);
      }

      // v21: surface-streets candidates get a structural stress discount —
      // fewer highway merges/weaving, even before live incidents are known.
      // Quiet/fuel preferences lean on this via preferenceCost weights.
      if (r.pathStyle === "surface") {
        stressScore = Math.max(0, stressScore - 8);
        energyScore = Math.max(0, Math.round(energyScore * 0.92));
        bottleneckScore = Math.max(0, bottleneckScore - 5);
      }

      // Fold chronic bottleneck into stress so live+history stay aligned.
      stressScore = Math.min(
        100,
        Math.round(stressScore + bottleneckScore * 0.25)
      );

      // v24: Portland local-driver prior (chronic corridors + active events).
      const localHits = matchLocalKnowledge(
        {
          geometry: r.geometry,
          maneuvers: r.maneuvers,
          incidents,
        },
        timeContext
      );
      const localPen = localKnowledgePenalties(localHits);
      stressScore = Math.min(
        100,
        Math.round(stressScore + localPen.stress * 0.55)
      );
      bottleneckScore = Math.min(
        100,
        Math.round(bottleneckScore + localPen.bottleneck * 0.5)
      );

      return {
        distance: r.distance,
        duration: r.duration,
        liveDurationS: Math.round(liveDurationS),
        geometry: r.geometry,
        incidents,
        riskScore,
        delayEstimateMin,
        incidentDelayMin,
        stressScore,
        energyScore,
        maneuverCount: scores.maneuverCount,
        pathStyle: r.pathStyle,
        bottleneckScore,
        historicalIncidentCount: historical.incidentCount,
        localKnowledgeIds: localHits.map(h => h.id),
        localTip: localKnowledgeSummary(localHits),
        maneuvers: r.maneuvers,
        flow,
      };
    })
  );

  // AI earns its call for incidents/congestion, or any non-fastest preference
  // so it can explain deliberate trade-offs.
  // With Gemini free tier available, always run brief inference so the
  // driver gets a grounded one-liner even on "clear" corridors. Without
  // Gemini, keep the cheaper gate (incidents / congestion / non-fastest).
  const needsAi =
    (ENV.geminiApiKey ?? "").length > 0 ||
    preference !== "fastest" ||
    scoredRoutes.some(
      r =>
        r.incidents.length > 0 ||
        (r.flow?.roadClosedCount ?? 0) > 0 ||
        ((r.flow?.samples ?? 0) >= 2 && (r.flow?.avgRatio ?? 1) < 0.9)
    );

  let chosenIndex = 0;
  let explanation = "Best available route.";
  let confidence: AiConfidence = "none";
  let verdicts: (string | null)[] | undefined;
  if (needsAi) {
    const ai = await scoreRoutesWithAI(scoredRoutes, timeContext, preference);
    chosenIndex = ai.chosenIndex;
    explanation = ai.explanation;
    confidence = ai.confidence;
    verdicts = ai.verdicts;
  } else {
    const pick = deterministicPick(scoredRoutes, preference);
    chosenIndex = pick.chosenIndex;
    explanation = pick.explanation;
    // v15: clear route, so this doesn't earn the paid model — but if the
    // free-tier Workers AI brief worker is configured, ask it for a
    // route-specific one-liner instead of the static string. Best-effort:
    // any failure (unset, unreachable, timeout) keeps the static fallback
    // exactly as it was before this existed.
    const fastest = scoredRoutes[chosenIndex] ?? scoredRoutes[0];
    if (fastest) {
      const roadNames = Array.from(
        new Set(
          fastest.maneuvers.map(m => m.roadName).filter((n): n is string => !!n)
        )
      ).slice(0, 6);
      const brief = await getClearRouteBrief({
        distanceMi: fastest.distance / 1609.34,
        durationMin: fastest.liveDurationS / 60,
        roadNames,
      });
      if (brief) explanation = brief;
    }
  }

  // Cameras near the chosen route — one extra RPC after the pick so the
  // driver can eyeball actual road conditions along what we're recommending.
  const chosen = scoredRoutes[chosenIndex] ?? scoredRoutes[0];
  const cameras = chosen?.geometry
    ? await getCamerasNearRoute(
        chosen.geometry as { coordinates: [number, number][] }
      )
    : [];

  // v12: wait-or-go advice. If the chosen route's worst agency-feed
  // incidents have a known estimated end inside the next 90 minutes,
  // leaving after that point avoids their delay entirely — a call neither
  // Google nor Waze can make, because neither tells you *when* a crash
  // clears. TomTom/Waze-derived rows (synthetic ids) carry no end time, so
  // only DB incidents participate.
  const waitAdvice = chosen ? await getWaitAdvice(chosen.incidents) : null;

  // v13: departure-horizon outlook for the chosen route — "leave now vs
  // in 15/30/60", projected from the same incident end estimates.
  const departureOutlook = chosen
    ? await getDepartureOutlook(chosen.incidents)
    : null;

  // v10: observability + the UI's "grounded with live data" chip. Only
  // set when at least one external source actually contributed — a null
  // means every key was unset or every upstream call came back empty.
  const flowSamples = scoredRoutes.reduce(
    (n, r) => n + (r.flow?.samples ?? 0),
    0
  );
  const tomtomApis: Array<
    "routing" | "matrix" | "waypointOptimization" | "flow" | "incidents"
  > = [];
  if (tomtomIncidents.length > 0) tomtomApis.push("incidents");
  if (flowSamples > 0) tomtomApis.push("flow");
  if (typeof tomtomLiveDurationS === "number" && tomtomLiveDurationS > 0) {
    tomtomApis.push("routing");
  }
  if (tomtomMatrixUsed) tomtomApis.push("matrix");
  if (tomtomWaypointOptUsed) tomtomApis.push("waypointOptimization");

  const grounding =
    tomtomIncidents.length +
      wazeAlerts.length +
      flowSamples +
      tomtomApis.length >
    0
      ? {
          tomtomIncidents: tomtomIncidents.length,
          wazeAlerts: wazeAlerts.length,
          flowSamples,
          tomtomApis: [...new Set(tomtomApis)],
        }
      : null;

  const chosenRoute = scoredRoutes[chosenIndex] ?? scoredRoutes[0]!;

  // Pure-time winner for the value card (what Google-style routing would pick).
  let pureTimeBest = 0;
  let pureTimeCost = Infinity;
  scoredRoutes.forEach((r, i) => {
    const c = r.liveDurationS + r.incidentDelayMin * 60;
    if (c < pureTimeCost) {
      pureTimeCost = c;
      pureTimeBest = i;
    }
  });
  const pureFastest = scoredRoutes[pureTimeBest] ?? chosenRoute;
  const timeDeltaMin = Math.round(
    (chosenRoute.liveDurationS - pureFastest.liveDurationS) / 60
  );
  const stressDelta = pureFastest.stressScore - chosenRoute.stressScore;
  const energyDelta = pureFastest.energyScore - chosenRoute.energyScore;
  const bottleneckDelta =
    (pureFastest.bottleneckScore ?? 0) - (chosenRoute.bottleneckScore ?? 0);

  let valueInsight: RouteResult["valueInsight"] = null;
  if (chosenIndex !== pureTimeBest) {
    const parts: string[] = [];
    if (stressDelta >= 6) parts.push(`~${stressDelta} pts less stress`);
    if (energyDelta >= 6) parts.push(`~${energyDelta} pts less energy/effort`);
    if (bottleneckDelta >= 6)
      parts.push(
        `historically clearer corridor (−${bottleneckDelta} bottleneck)`
      );
    if (chosenRoute.pathStyle === "surface")
      parts.push("surface streets instead of the freeway");
    const detail =
      parts.length > 0
        ? parts.join(" · ")
        : "better overall fit for your route style";
    const headline =
      timeDeltaMin <= 0
        ? "Smarter than pure-fastest — and not slower"
        : timeDeltaMin <= 5
          ? `Worth +${timeDeltaMin} min vs pure-fastest`
          : `Calmer pick (+${timeDeltaMin} min vs pure-fastest)`;
    valueInsight = {
      vsFastestTimeDeltaMin: timeDeltaMin,
      stressDelta,
      energyDelta,
      bottleneckDelta,
      chosenPathStyle: chosenRoute.pathStyle ?? null,
      fastestPathStyle: pureFastest.pathStyle ?? null,
      headline,
      detail,
    };
  }

  // Data confidence — how chargeable / grounded this recommendation is.
  const reasons: string[] = [];
  let confScore = 35;
  if ((grounding?.flowSamples ?? 0) >= 2) {
    confScore += 20;
    reasons.push("live traffic flow samples");
  }
  if ((grounding?.tomtomIncidents ?? 0) + (grounding?.wazeAlerts ?? 0) > 0) {
    confScore += 15;
    reasons.push("live third-party incidents");
  }
  if (chosenRoute.incidents.length > 0) {
    confScore += 10;
    reasons.push("agency incident feeds on path");
  }
  if ((chosenRoute.historicalIncidentCount ?? 0) > 0) {
    confScore += 15;
    reasons.push("21-day corridor history");
  }
  if (scoredRoutes.length >= 2) {
    confScore += 10;
    reasons.push("multiple candidates compared");
  }
  if (chosenRoute.pathStyle === "surface" || preference !== "fastest") {
    confScore += 5;
    reasons.push("preference-aware ranking");
  }
  confScore = Math.min(100, confScore);
  const dataConfidence: RouteResult["dataConfidence"] = {
    score: confScore,
    label: confScore >= 75 ? "high" : confScore >= 50 ? "medium" : "low",
    reasons,
  };

  const driverHealthScore = computeDriverHealthScore(chosenRoute);
  const chosenLocalHits = matchLocalKnowledge(
    {
      geometry: chosenRoute.geometry,
      maneuvers: chosenRoute.maneuvers,
      incidents: chosenRoute.incidents,
    },
    timeContext
  );
  const localDriverNotes =
    chosenLocalHits.length > 0
      ? chosenLocalHits.slice(0, 4).map(h => h.tip)
      : undefined;

  // Boost data confidence when local knowledge + history both fired.
  if (localDriverNotes && dataConfidence) {
    dataConfidence.score = Math.min(100, dataConfidence.score + 8);
    dataConfidence.reasons = [
      ...dataConfidence.reasons,
      "Portland local-driver knowledge",
    ];
    dataConfidence.label =
      dataConfidence.score >= 75
        ? "high"
        : dataConfidence.score >= 50
          ? "medium"
          : "low";
  }

  const result: RouteResult = {
    route: chosenRoute,
    explanation,
    alternatives: scoredRoutes,
    origin,
    destination,
    generated_at: new Date().toISOString(),
    cached: false,
    confidence,
    preference,
    cameras,
    grounding,
    verdicts,
    waitAdvice,
    timeContext,
    departureOutlook,
    valueInsight,
    dataConfidence,
    stops: stops.length ? stops : undefined,
    stopPlan,
    stopSchedule,
    driverHealthScore,
    localDriverNotes,
  };

  await writeCache(key, result);
  return result;
}

/**
 * v12: computes wait-or-go advice for the chosen route. One extra indexed
 * select by incident id, only for agency-feed rows (uuid ids — synthetic
 * TomTom/Waze ids are filtered out by prefix). Only major/critical
 * incidents ending within 90 minutes count: waiting 20 minutes to dodge a
 * minor slowdown is bad advice, and end estimates beyond ~90 minutes are
 * too unreliable to recommend around.
 */
async function getWaitAdvice(
  incidents: RouteIncident[]
): Promise<RouteResult["waitAdvice"]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const severeIds = incidents
    .filter(
      i =>
        (i.severity === "major" || i.severity === "critical") &&
        !i.id.startsWith("tomtom-") &&
        !i.id.startsWith("waze-")
    )
    .map(i => i.id);
  if (severeIds.length === 0) return null;

  const { data, error } = await supabase
    .from("traffic_incidents")
    .select("id, estimated_end_at, road_name, severity")
    .in("id", severeIds);
  if (error || !data) return null;

  const now = Date.now();
  const windowEnd = now + 90 * 60_000;
  const relevant = (
    data as Array<{
      id: string;
      estimated_end_at: string | null;
      road_name: string | null;
      severity: RouteIncident["severity"];
    }>
  ).filter(row => {
    if (!row.estimated_end_at) return false;
    const t = new Date(row.estimated_end_at).getTime();
    return Number.isFinite(t) && t > now && t <= windowEnd;
  });
  if (relevant.length === 0) return null;

  // Wait until the LAST relevant incident clears — leaving earlier still
  // hits the remaining ones, so the honest advice keys off the max.
  const latest = relevant.reduce((a, b) =>
    new Date(a.estimated_end_at!).getTime() >=
    new Date(b.estimated_end_at!).getTime()
      ? a
      : b
  );
  const clearByMs = new Date(latest.estimated_end_at!).getTime();
  const delayAvoidedMin = relevant.reduce(
    (sum, row) =>
      sum + (SEVERITY_DELAY_MIN[row.severity] ?? SEVERITY_DELAY_MIN.major),
    0
  );

  return {
    clearByIso: new Date(clearByMs).toISOString(),
    waitMin: Math.ceil((clearByMs - now) / 60_000),
    delayAvoidedMin,
    roadName: latest.road_name,
  };
}

/**
 * v13: best-departure-horizon outlook for the chosen route. For each
 * horizon (now / +15 / +30 / +60 min) we project the incident delay you'd
 * still face leaving then: agency-feed incidents with an estimated end
 * before the horizon count as cleared; incidents without an end time count
 * at every horizon (unknown = assume still there); live TomTom/Waze
 * reports only count for leaving now (their lifetime is minutes, but we
 * have no end estimate, so we don't project around them).
 *
 * Returned only when some later horizon beats leaving now by >= 3 minutes —
 * "leave in 30, save 12 min" is advice; "leave in 30, save 1 min" is noise.
 */
async function getDepartureOutlook(
  incidents: RouteIncident[]
): Promise<RouteResult["departureOutlook"]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  if (incidents.length === 0) return null;

  const HORIZONS_MIN = [0, 15, 30, 60];
  const now = Date.now();

  // One indexed select for end times of the agency-feed incidents.
  const dbIds = incidents
    .filter(i => !i.id.startsWith("tomtom-") && !i.id.startsWith("waze-"))
    .map(i => i.id);
  const endById = new Map<string, number>();
  if (dbIds.length > 0) {
    const { data, error } = await supabase
      .from("traffic_incidents")
      .select("id, estimated_end_at")
      .in("id", dbIds);
    if (!error && data) {
      for (const row of data as Array<{
        id: string;
        estimated_end_at: string | null;
      }>) {
        if (!row.estimated_end_at) continue;
        const t = new Date(row.estimated_end_at).getTime();
        if (Number.isFinite(t)) endById.set(row.id, t);
      }
    }
  }

  const delayAt = (horizonMin: number): number => {
    const departAt = now + horizonMin * 60_000;
    let total = 0;
    for (const inc of incidents) {
      const base = SEVERITY_DELAY_MIN[inc.severity] ?? SEVERITY_DELAY_MIN.minor;
      const isLive = inc.id.startsWith("tomtom-") || inc.id.startsWith("waze-");
      if (isLive) {
        if (horizonMin === 0) total += base;
        continue;
      }
      const end = endById.get(inc.id);
      if (end === undefined || end > departAt) total += base;
    }
    return Math.round(total);
  };

  const delayMin = HORIZONS_MIN.map(delayAt);
  let bestIdx = 0;
  for (let i = 1; i < delayMin.length; i++) {
    if (delayMin[i]! < delayMin[bestIdx]!) bestIdx = i;
  }
  const savesMin = delayMin[0]! - delayMin[bestIdx]!;
  if (bestIdx === 0 || savesMin < 3) return null;

  return {
    horizonsMin: HORIZONS_MIN,
    delayMin,
    bestHorizonMin: HORIZONS_MIN[bestIdx]!,
    savesMin,
  };
}

/**
 * v17: bbox param (optional, backwards-compatible — omit for the full
 * statewide feed same as before). Backed by list_active_incidents_in_bbox
 * (drizzle/0055_routepulse_bbox_queries.sql), which closes the gap this
 * function used to flag directly in its own comment: previously always
 * unfiltered by area, so the always-on map layer pulled the entire
 * state's active incidents regardless of where the map was actually
 * pointed. The client now passes the current map viewport bounds (see
 * MapViewportTracker in client/src/pages/RoutePulse/index.tsx) so this
 * only returns what's actually near the driver, and re-queries as they
 * pan/zoom/drive instead of holding one fixed statewide snapshot for the
 * whole session.
 */
export async function listActiveIncidents(bbox?: Bbox) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  // RPC (not a plain table select) — PostgREST doesn't expose ST_X/ST_Y on a
  // raw select, so lat/lng extraction happens server-side in Postgres, same
  // pattern as incidents_near_route.
  const { data, error } = bbox
    ? await supabase.rpc("list_active_incidents_in_bbox", {
        min_lat: bbox.minLat,
        min_lng: bbox.minLng,
        max_lat: bbox.maxLat,
        max_lng: bbox.maxLng,
        limit_n: 200,
      })
    : await supabase.rpc("list_active_incidents", { limit_n: 200 });

  if (error || !data) return [];
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
