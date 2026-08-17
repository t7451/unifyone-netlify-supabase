/**
 * server/routers/routePulse/externalGrounding.ts
 *
 * v10: live third-party grounding for the RoutePulse AI layer.
 *
 * The deterministic risk model and the AI prompt both reason over the
 * incidents we store from agency feeds (ODOT / Road511 / NWS / WSDOT).
 * This module adds two live, per-request sources of ground truth:
 *
 *   - TomTom Traffic Incident Details — professional traffic incidents
 *     (accidents, closures, road works) inside the route bbox, and
 *   - OpenWebNinja Waze API — crowdsourced alerts (accidents, hazards,
 *     jams, police) for the same bbox,
 *   - TomTom Traffic Flow Segment Data — measured current-vs-free-flow
 *     speeds sampled along the route, which catches congestion that
 *     hasn't generated an incident report yet (and closures TomTom
 *     flags directly on the road segment).
 *
 * Everything here is best-effort: keys unset, upstream down, quota
 * exhausted, or a weird response shape all degrade to empty results,
 * never to a failed route request. Results are deduplicated against the
 * agency-feed incidents we already have so a crash reported by both ODOT
 * and Waze doesn't double-count in the risk score.
 */
import { ENV } from "../../_core/env";
import type { RouteIncident } from "./routePulse.service";

export type Bbox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

/** Combined bbox of several route geometries, padded by `padKm`. */
export function bboxForGeometries(
  geometries: Array<{ coordinates: [number, number][] }>,
  padKm = 2
): Bbox | null {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  let seen = false;
  for (const g of geometries) {
    for (const [lng, lat] of g.coordinates) {
      seen = true;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }
  if (!seen) return null;
  const pad = padKm / 111.32;
  return {
    minLat: minLat - pad,
    minLng: minLng - pad,
    maxLat: maxLat + pad,
    maxLng: maxLng + pad,
  };
}

// ── Distance helpers (equirectangular approximation — plenty accurate at
//    city scale and for the few hundred meters we care about) ──────────────

const M_PER_DEG_LAT = 111_320;

function haversineM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** Is a point within `radiusM` of any segment of the route polyline? */
export function isNearRoute(
  lat: number,
  lng: number,
  coords: [number, number][],
  radiusM: number
): boolean {
  if (coords.length === 0) return false;
  if (coords.length === 1) {
    return haversineM(lat, lng, coords[0]![1], coords[0]![0]) <= radiusM;
  }
  const lngScale = Math.cos((lat * Math.PI) / 180) * M_PER_DEG_LAT;
  // Project to meters relative to the query point, then do planar
  // point-to-segment math — exact enough at these distances.
  const px = 0;
  const py = 0;
  const toXY = (c: [number, number]) => ({
    x: (c[0] - lng) * lngScale,
    y: (c[1] - lat) * M_PER_DEG_LAT,
  });
  const r2 = radiusM * radiusM;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = toXY(coords[i]!);
    const b = toXY(coords[i + 1]!);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    let t = len2 > 0 ? ((px - a.x) * abx + (py - a.y) * aby) / len2 : 0;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    const dx = a.x + abx * t - px;
    const dy = a.y + aby * t - py;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}

/**
 * Drop extras that sit within `radiusM` of an incident we already have —
 * a crash reported by both ODOT and Waze must not double-count in the
 * deterministic risk score. Agency-feed (DB) incidents always win.
 */
export function dedupeIncidents(
  base: RouteIncident[],
  extra: RouteIncident[],
  radiusM = 250
): RouteIncident[] {
  return extra.filter(
    e => !base.some(b => haversineM(e.lat, e.lng, b.lat, b.lng) <= radiusM)
  );
}

function withTimeout(): AbortSignal {
  // Hard cap on every upstream call — grounding is an enhancement, and a
  // hung third party must never stall route scoring.
  return AbortSignal.timeout(8_000);
}

// ── TomTom Traffic Incident Details ────────────────────────────────────────
// https://developer.tomtom.com/traffic-api/documentation/traffic-incidents

const TOMTOM_ICON_CATEGORY: Record<
  number,
  { type: string; severity: RouteIncident["severity"] }
> = {
  0: { type: "Traffic incident", severity: "minor" },
  1: { type: "Accident", severity: "major" },
  2: { type: "Fog", severity: "moderate" },
  3: { type: "Dangerous conditions", severity: "moderate" },
  4: { type: "Heavy rain", severity: "minor" },
  5: { type: "Ice on road", severity: "major" },
  6: { type: "Traffic jam", severity: "moderate" },
  7: { type: "Lane closed", severity: "moderate" },
  8: { type: "Road closed", severity: "critical" },
  9: { type: "Road works", severity: "moderate" },
  10: { type: "Strong wind", severity: "minor" },
  11: { type: "Flooding", severity: "major" },
  14: { type: "Broken-down vehicle", severity: "minor" },
};

// magnitudeOfDelay (0 unknown … 4 indefinite) can escalate the severity the
// icon category implies — a "road works" with indefinite delay is not
// moderate, it's effectively a closure.
const MAGNITUDE_SEVERITY: Record<number, RouteIncident["severity"]> = {
  1: "minor",
  2: "moderate",
  3: "major",
  4: "critical",
};

export async function fetchTomTomTrafficIncidents(
  bbox: Bbox
): Promise<RouteIncident[]> {
  const key = ENV.tomtomApiKey;
  if (!key) return [];

  const fields = encodeURIComponent(
    "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,from,to,length,delay,roadNumbers,events{description,code},startTime,endTime,tmc{countryCode,tableNumber,direction,points}}}}"
  );
  const url =
    `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${key}` +
    `&bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}` +
    `&fields=${fields}&language=en-GB&timeValidityFilter=present`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: withTimeout(),
    });
    if (!res.ok) {
      // Include response body — 401/403 (bad key or wrong product scope on
      // the TomTom dashboard) and 400 (malformed bbox) look identical as
      // just "HTTP 4xx" without it, and both silently degrade to an empty
      // result indistinguishable from "no incidents in this bbox right
      // now." This is the only place that failure reason surfaces.
      const bodyText = await res.text().catch(() => "");
      console.warn(
        `[routePulse] TomTom incidents HTTP ${res.status}: ${bodyText.slice(0, 300)}`
      );
      return [];
    }
    const body = (await res.json()) as {
      incidents?: Array<{
        geometry?: { type?: string; coordinates?: unknown };
        properties?: {
          iconCategory?: number;
          magnitudeOfDelay?: number;
          from?: string;
          length?: number;
          delay?: number;
          roadNumbers?: string[];
          events?: Array<{ description?: string }>;
        };
      }>;
    };

    const out: RouteIncident[] = [];
    const incidents = body.incidents ?? [];
    for (let idx = 0; idx < incidents.length; idx++) {
      const inc = incidents[idx]!;
      const p = inc.properties ?? {};
      // Representative point: Point geometry directly, first coordinate
      // of a (Multi)LineString otherwise.
      let lat: number | null = null;
      let lng: number | null = null;
      const g = inc.geometry;
      if (g?.type === "Point" && Array.isArray(g.coordinates)) {
        const c = g.coordinates as [number, number];
        lng = c[0];
        lat = c[1];
      } else if (Array.isArray(g?.coordinates)) {
        const coordsUnknown: unknown[] = g.coordinates as unknown[];
        const first: unknown = coordsUnknown[0];
        let pair: unknown = first;
        if (Array.isArray(first) && Array.isArray(first[0])) {
          pair = first[0]; // MultiLineString → first [lng, lat] pair
        }
        if (Array.isArray(pair) && pair.length >= 2) {
          const c = pair as [number, number];
          lng = c[0];
          lat = c[1];
        }
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const cat =
        TOMTOM_ICON_CATEGORY[p.iconCategory ?? 0] ?? TOMTOM_ICON_CATEGORY[0]!;
      const magSev = MAGNITUDE_SEVERITY[p.magnitudeOfDelay ?? 0];
      // Take the worse of category-implied vs delay-implied severity.
      const order: RouteIncident["severity"][] = [
        "minor",
        "moderate",
        "major",
        "critical",
      ];
      const severity =
        magSev && order.indexOf(magSev) > order.indexOf(cat.severity)
          ? magSev
          : cat.severity;

      const delayMin =
        typeof p.delay === "number" && p.delay > 0
          ? ` (~${Math.round(p.delay / 60)} min delay)`
          : "";
      const lengthKm =
        typeof p.length === "number" && p.length > 0
          ? ` over ${(p.length / 1609.34).toFixed(1)} mi`
          : "";
      const description =
        (p.events ?? [])
          .map((e: { description?: string }) => e.description)
          .find((d): d is string => typeof d === "string" && d.length > 0) ??
        `${cat.type}${lengthKm}${delayMin}`;

      out.push({
        id: `tomtom-${p.iconCategory ?? 0}-${idx}-${lat!.toFixed(4)},${lng!.toFixed(4)}`,
        incident_type: cat.type,
        severity,
        description,
        road_name: p.roadNumbers?.[0] ?? p.from ?? null,
        source: "tomtom",
        lat: lat!,
        lng: lng!,
      });
    }
    return out;
  } catch (err) {
    console.warn("[routePulse] TomTom incidents fetch failed:", err);
    return [];
  }
}

// ── OpenWebNinja Google Maps Traffic Alerts API ─────────────────────────────────
// https://www.openwebninja.com/api/google-maps-traffic-alerts
//
// NOTE FOR KIMI (2026-08-10): everything below this comment used to call
// OpenWebNinja's *Waze* API (`/waze/alerts-and-jams`, an {alerts, jams}
// shape with speed_kmh/delay_seconds/line_coordinates). That endpoint was
// never actually reachable with this account's key — checking the
// OpenWebNinja dashboard directly showed the subscribed products are
// "Real-Time News Search" and "Google Maps Traffic Alerts", with zero
// requests ever logged against either, and no Waze product listed at all.
// The commit that "fixed" the Waze response-shape parsing (9527c48) was a
// real bug fix on paper but was chasing an endpoint this key was never
// entitled to call in the first place, so it never actually produced a
// nonzero call either — the 0/50 and 0/100 usage in the dashboard predates
// and postdates that fix identically.
//
// This function now calls the product the key is actually subscribed to:
// Google Maps Traffic Alerts, confirmed shape `{ count, alerts: [{ type,
// latitude, longitude }] }` — no jams array, no street/subtype/speed
// fields at all. This is a materially smaller feed than Waze would have
// been (just type + coordinates, no jam severity or delay estimate), so
// jam-style incidents synthesize a moderate default severity instead of
// deriving one from a delay figure that this API doesn't provide.
//
// If you want the *actual* Waze product later (richer jam/delay data,
// separate pricing/quota — see https://www.openwebninja.com/api/waze),
// that's a distinct subscription on the OpenWebNinja account, not just a
// URL change here.
//
// The endpoint path (`/google-maps-traffic-alerts/traffic-alerts`) follows
// OpenWebNinja's documented `<product-slug>/<action>` convention seen
// across their other products (e.g. `/google-ai-mode/ai-mode`,
// `/web-unblocker/request`) — confirmed against their published code
// samples for sibling products, but NOT hand-verified against a live call
// from this sandbox (network egress here can't reach api.openwebninja.com
// to test). If this still logs 0 calls after deploy, check the exact path
// in the API Playground (https://app.openwebninja.com/api/google-maps-traffic-alerts)
// before assuming anything else is wrong — same lesson as the Waze saga
// above, verify against what the dashboard shows actually happened, not
// what the code assumes should happen.

const GMAPS_TRAFFIC_TYPE: Record<
  string,
  { type: string; severity: RouteIncident["severity"] }
> = {
  accident: { type: "Accident", severity: "major" },
  construction: { type: "Road construction", severity: "moderate" },
  road_closed: { type: "Road closure", severity: "critical" },
  incident: { type: "Traffic incident", severity: "moderate" },
};

export async function fetchWazeAlerts(bbox: Bbox): Promise<RouteIncident[]> {
  const key = ENV.openwebninjaApiKey;
  if (!key) return [];

  const base = ENV.openwebninjaWazeUrl.replace(/\/+$/, "");
  const host = new URL(base).hostname;
  const isRapidApi = host.endsWith("rapidapi.com");
  const url =
    `${base}/traffic-alerts` +
    `?bottom_left=${bbox.minLat},${bbox.minLng}` +
    `&top_right=${bbox.maxLat},${bbox.maxLng}`;

  const headers: Record<string, string> = isRapidApi
    ? { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host }
    : { "x-api-key": key };

  try {
    const res = await fetch(url, { headers, signal: withTimeout() });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.warn(
        `[routePulse] Google Maps Traffic Alerts HTTP ${res.status} (url=${url}, auth=${isRapidApi ? "rapidapi" : "native"}): ${bodyText.slice(0, 500)}`
      );
      return [];
    }
    const body = (await res.json()) as {
      count?: number;
      alerts?: Array<{
        type?: string;
        latitude?: number;
        longitude?: number;
      }>;
    };

    const out: RouteIncident[] = [];
    const alerts = body.alerts ?? [];
    for (let idx = 0; idx < alerts.length; idx++) {
      const a = alerts[idx]!;
      const lat = a.latitude;
      const lng = a.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const cat = GMAPS_TRAFFIC_TYPE[a.type ?? ""] ?? {
        type: "Traffic incident",
        severity: "minor" as const,
      };
      out.push({
        id: `gmta-${idx}-${lat!.toFixed(4)},${lng!.toFixed(4)}`,
        incident_type: cat.type,
        severity: cat.severity,
        description: cat.type,
        // Google Maps Traffic Alerts doesn't return a street/road name —
        // only type + coordinates. Leave null rather than guessing.
        road_name: null,
        source: "gmaps_traffic",
        lat: lat!,
        lng: lng!,
      });
    }

    return out;
  } catch (err) {
    console.warn("[routePulse] Google Maps Traffic Alerts fetch failed:", err);
    return [];
  }
}

// ── TomTom Traffic Flow Segment Data ───────────────────────────────────────
// Measured current vs free-flow speed for the road segment nearest a point.
// https://developer.tomtom.com/traffic-api/documentation/traffic-flow

/** A single sampled point along the route, for map coloring. */
export type FlowPoint = {
  lat: number;
  lng: number;
  /** current/free-flow ratio, clamped [0, 1.2]. Null if TomTom had no data here. */
  ratio: number | null;
  currentMph: number | null;
  freeflowMph: number | null;
  closed: boolean;
};

export type FlowGrounding = {
  /** Points that returned usable flow data. */
  samples: number;
  /** Mean current/free-flow ratio across samples (1 = free-flowing). */
  avgRatio: number;
  /** Worst single-sample ratio — the slowest stretch found. */
  worstRatio: number;
  /** Samples where TomTom flags the segment as closed outright. */
  roadClosedCount: number;
  avgCurrentMph: number;
  avgFreeflowMph: number;
  /**
   * v15: every sampled point along the route with its own ratio, in route
   * order (sorted by original coordinate index). Lets the client draw
   * TomTom-measured congestion coloring instead of the maneuver-duration
   * heuristic, when TomTom actually has data for this stretch. Points
   * TomTom had nothing for are still included with ratio: null so the
   * client can choose to fall back to the heuristic for that gap only,
   * not the whole route.
   */
  points: FlowPoint[];
};

export async function fetchTomTomFlow(
  coords: [number, number][]
): Promise<FlowGrounding | null> {
  const key = ENV.tomtomApiKey;
  if (!key || coords.length === 0) return null;

  // Dense enough to catch mid-corridor jams; still bounded for freemium quota.
  // ~14 samples × alternatives stays well under TomTom's 2.5k/day at modest traffic.
  const SAMPLE_COUNT = Math.min(16, Math.max(8, Math.ceil(coords.length / 40)));
  const idxs = new Set<number>();
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    idxs.add(
      Math.min(
        coords.length - 1,
        Math.round((i * (coords.length - 1)) / (SAMPLE_COUNT - 1))
      )
    );
  }

  // Sorted so `points` comes back in route order regardless of Set/Promise
  // ordering — the client zips these against route geometry positionally.
  const sortedIdxs = Array.from(idxs).sort((a, b) => a - b);

  try {
    const results = await Promise.all(
      sortedIdxs.map(async (i, resultPos) => {
        const [lng, lat] = coords[i]!;
        const url =
          `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json` +
          `?key=${key}&point=${lat},${lng}&unit=MPH`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: withTimeout(),
        });
        if (!res.ok) {
          // Log once, not per-sample — same TomTom key/scope issue would
          // otherwise spam 5x per request with identical info.
          if (resultPos === 0) {
            const bodyText = await res.text().catch(() => "");
            console.warn(
              `[routePulse] TomTom flow HTTP ${res.status}: ${bodyText.slice(0, 300)}`
            );
          }
          return { lat, lng, current: null, freeflow: null, closed: false };
        }
        const body = (await res.json()) as {
          flowSegmentData?: {
            currentSpeed?: number;
            freeFlowSpeed?: number;
            roadClosure?: boolean;
          };
        };
        const f = body.flowSegmentData;
        if (!f)
          return { lat, lng, current: null, freeflow: null, closed: false };
        return {
          lat,
          lng,
          current: typeof f.currentSpeed === "number" ? f.currentSpeed : null,
          freeflow:
            typeof f.freeFlowSpeed === "number" ? f.freeFlowSpeed : null,
          closed: f.roadClosure === true,
        };
      })
    );

    let samples = 0;
    let ratioSum = 0;
    let worstRatio = Infinity;
    let roadClosedCount = 0;
    let currentSum = 0;
    let freeflowSum = 0;
    const points: FlowPoint[] = [];
    for (const r of results) {
      if (r.closed) roadClosedCount++;
      const hasSpeeds =
        r.current !== null && r.freeflow !== null && r.freeflow > 0;
      const ratio = hasSpeeds
        ? Math.max(0, Math.min(1.2, r.current! / r.freeflow!))
        : null;
      if (hasSpeeds) {
        samples++;
        ratioSum += ratio!;
        if (ratio! < worstRatio) worstRatio = ratio!;
        currentSum += r.current!;
        freeflowSum += r.freeflow!;
      }
      points.push({
        lat: r.lat,
        lng: r.lng,
        ratio,
        currentMph: r.current !== null ? Math.round(r.current) : null,
        freeflowMph: r.freeflow !== null ? Math.round(r.freeflow) : null,
        closed: r.closed,
      });
    }
    if (samples === 0 && roadClosedCount === 0) return null;
    return {
      samples,
      avgRatio: samples > 0 ? ratioSum / samples : 1,
      worstRatio: samples > 0 ? worstRatio : 1,
      roadClosedCount,
      avgCurrentMph: samples > 0 ? Math.round(currentSum / samples) : 0,
      avgFreeflowMph: samples > 0 ? Math.round(freeflowSum / samples) : 0,
      points,
    };
  } catch (err) {
    console.warn("[routePulse] TomTom flow fetch failed:", err);
    return null;
  }
}
