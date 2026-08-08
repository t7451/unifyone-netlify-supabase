/**
 * routepulse-ingest-scheduled.mts
 *
 * Scheduled Function — polls Road511 (multi-state), ODOT TripCheck
 * (Oregon-native), NWS weather alerts (keyless), and WSDOT highway alerts
 * (SW Washington) every 2 minutes and upserts active incidents into the
 * `traffic_incidents` Supabase table. Also polls ODOT's camera list every
 * ~5 minutes into `traffic_cameras`. RoutePulse's route-scoring endpoint
 * (server/routers/routePulse) reads from traffic_incidents via the
 * `incidents_near_route` PostGIS RPC.
 *
 * Schedule: every 2 minutes
 *
 * Env vars required:
 *   SUPABASE_URL, SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)
 *   R511_API_KEY      — Road511 unified 511 API
 *   TRIPCHECK_KEY     — ODOT TripCheck API (Ocp-Apim-Subscription-Key)
 *   WSDOT_API_KEY     — WSDOT Traffic API AccessCode (free registration)
 *
 * NWS needs no key — api.weather.gov only asks for a descriptive User-Agent.
 *
 * Supabase schema required: see migrations `routepulse_init`,
 * `routepulse_incident_geo`, `routepulse_more_streams` — traffic_incidents
 * (source CHECK widened for nws/wsdot), traffic_cameras, routes_cache,
 * incidents_near_route(), cameras_near_route(), list_cameras().
 */
import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Initial coverage area: Oregon + SW Washington (Portland metro MVP).
const REGIONS = [
  { name: "oregon", bbox: "-124.5,41.9,-116.4,46.3" },
  { name: "washington_sw", bbox: "-124.8,45.5,-122.0,49.0" },
];

// NWS alert areas — same coverage as REGIONS. WA alerts are filtered to the
// SW Washington bbox so Seattle-area weather doesn't pollute the Portland
// metro map.
const NWS_AREAS = [
  { area: "OR", bbox: "-124.5,41.9,-116.4,46.3" },
  { area: "WA", bbox: "-124.8,45.5,-122.0,49.0" },
];

// Weather events that materially change driving risk. Sourced from the
// NWS event list; curated so routine watches (e.g. "Lake Wind Advisory"
// for recreation) don't drown out signal.
const NWS_DRIVING_EVENTS = new Set([
  "Winter Storm Warning",
  "Winter Storm Watch",
  "Winter Weather Advisory",
  "Ice Storm Warning",
  "Blizzard Warning",
  "Snow Squall Warning",
  "Freeze Warning",
  "Freezing Fog Advisory",
  "Dense Fog Advisory",
  "Flash Flood Warning",
  "Flood Warning",
  "Flood Advisory",
  "High Wind Warning",
  "Wind Advisory",
  "Extreme Wind Warning",
  "Severe Thunderstorm Warning",
  "Tornado Warning",
  "Dust Storm Warning",
  "Blowing Dust Advisory",
]);

function mapIncidentType(t?: string): string {
  const m: Record<string, string> = {
    accident: "accident",
    construction: "construction",
    closure: "closure",
    hazard: "weather",
    weather: "weather",
    event: "event",
    "special event": "event",
  };
  return m[(t ?? "").toLowerCase()] ?? "other";
}

function mapSeverity(s?: string): "minor" | "moderate" | "major" | "critical" {
  const v = (s ?? "").toLowerCase();
  if (v.includes("critical") || v.includes("severe")) return "critical";
  if (v.includes("high") || v.includes("major")) return "major";
  if (v.includes("low") || v.includes("minor")) return "minor";
  return "moderate";
}

function inBbox(lng: number, lat: number, bbox: string): boolean {
  const [w, s, e, n] = bbox.split(",").map(Number);
  return lng >= w && lng <= e && lat >= s && lat <= n;
}

/** Rough centroid of a GeoJSON Polygon/MultiPolygon/Point (good enough for
 *  route-proximity buffering; alert polygons are small at metro scale). */
function centroidOf(geom: any): [number, number] | null {
  if (!geom) return null;
  const rings: any[] =
    geom.type === "Polygon"
      ? [geom.coordinates?.[0]]
      : geom.type === "MultiPolygon"
        ? (geom.coordinates ?? []).map((c: any) => c?.[0])
        : geom.type === "Point"
          ? [[geom.coordinates]]
          : [];
  const pts: [number, number][] = [];
  for (const ring of rings) {
    if (!Array.isArray(ring)) continue;
    for (const pt of ring) {
      if (Array.isArray(pt) && pt.length >= 2) pts.push([pt[0], pt[1]]);
    }
  }
  if (!pts.length) return null;
  const sum = pts.reduce(
    (a, p) => [a[0] + p[0], a[1] + p[1]],
    [0, 0] as [number, number]
  );
  return [sum[0] / pts.length, sum[1] / pts.length];
}

function mapNwsSeverity(
  s?: string
): "minor" | "moderate" | "major" | "critical" {
  const v = (s ?? "").toLowerCase();
  if (v === "extreme") return "critical";
  if (v === "severe") return "major";
  if (v === "minor") return "minor";
  return "moderate";
}

/** Maps one NWS alert GeoJSON feature to a traffic_incidents row, or null
 *  if it's not driving-relevant / outside coverage / geometry-less. */
function mapNwsAlert(f: any, bbox: string) {
  const p = f.properties ?? {};
  if (!NWS_DRIVING_EVENTS.has(p.event)) return null;

  const center = centroidOf(f.geometry);
  // Zone-only alerts (no geometry) are skipped — mapping UGC zones to
  // centroids is possible future work, but guessing a point would put
  // false precision on the map.
  if (!center) return null;
  const [lng, lat] = center;
  if (!inBbox(lng, lat, bbox)) return null;

  const extId = String(p.id ?? f.id ?? "").split("/").pop();
  if (!extId) return null;

  return {
    source: "nws",
    external_id: `nws_${extId}`,
    location: `POINT(${lng} ${lat})`,
    location_description:
      typeof p.areaDesc === "string" ? p.areaDesc.slice(0, 300) : null,
    road_name: null,
    direction: null,
    incident_type: "weather",
    severity: mapNwsSeverity(p.severity),
    description: String(p.headline ?? p.event ?? "Weather alert").slice(0, 500),
    started_at: p.onset ?? p.sent ?? null,
    estimated_end_at: p.ends ?? p.expires ?? null,
    // Trimmed on purpose — full alert bodies (instruction text etc.) are
    // huge; keep only what the AI prompt / UI might cite.
    raw_data: {
      event: p.event,
      severity: p.severity,
      certainty: p.certainty,
      urgency: p.urgency,
      senderName: p.senderName,
    },
    source_url: typeof p.id === "string" ? p.id : null,
  };
}

/** WSDOT serializes dates as "/Date(1717340400000-0700)/". */
function parseWsdotDate(d?: string): string | null {
  if (!d) return null;
  const m = String(d).match(/\/Date\((\d+)/);
  if (!m) return null;
  return new Date(Number(m[1])).toISOString();
}

function mapWsdotSeverity(
  p?: string
): "minor" | "moderate" | "major" | "critical" {
  const v = (p ?? "").toLowerCase();
  if (v === "highest") return "critical";
  if (v === "high") return "major";
  if (v === "low" || v === "lowest") return "minor";
  return "moderate";
}

const SW_WA_BBOX = "-124.8,45.5,-122.0,49.0";

/** Maps one WSDOT HighwayAlerts entry to a traffic_incidents row, or null
 *  if it's outside SW Washington coverage or has no usable location. */
function mapWsdotAlert(a: any) {
  const loc = a.StartRoadwayLocation ?? {};
  const lat = loc.Latitude;
  const lng = loc.Longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!inBbox(lng, lat, SW_WA_BBOX)) return null;

  const extId = a.AlertID ?? a.ID;
  if (extId === undefined || extId === null) return null;

  return {
    source: "wsdot",
    external_id: `wsdot_${extId}`,
    location: `POINT(${lng} ${lat})`,
    location_description: loc.Description ?? null,
    road_name: loc.RoadName ?? null,
    direction: loc.Direction ?? null,
    incident_type: mapIncidentType(a.EventCategory),
    severity: mapWsdotSeverity(a.Priority),
    description: a.HeadlineDescription ?? null,
    started_at: parseWsdotDate(a.StartTime),
    estimated_end_at: parseWsdotDate(a.EndTime),
    raw_data: a,
    source_url: null,
  };
}

/**
 * Marks incidents as cleared if they were not present in the latest poll,
 * scoped to a single source. Scoping matters: if e.g. Road511 fails or its
 * key is unset this cycle, we must NOT sweep road511-sourced incidents using
 * only this cycle's (empty) ODOT set — that would false-clear everything
 * Road511 previously reported. Only call this for a source that actually
 * completed a successful poll this cycle. Guarded by min_age_minutes
 * (server-side, in the RPC) so a single missed poll can't false-clear
 * something still active either.
 */
async function markClearedIncidents(
  supabase: ReturnType<typeof createClient>,
  source: string,
  activeIds: string[]
) {
  const { error } = await supabase.rpc("mark_incidents_cleared", {
    p_source: source,
    active_ids: activeIds,
    min_age_minutes: 10,
  });
  if (error)
    console.error(`[routepulse-ingest] Clearance error (${source}):`, error.message);
}

export default async (req: Request) => {
  const { next_run } = await req.json().catch(() => ({ next_run: "unknown" }));
  console.log(`[routepulse-ingest] Poll start. Next: ${next_run}`);

  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const supabaseKey =
    Netlify.env.get("SUPABASE_SECRET_KEY") ??
    Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const r511Key = Netlify.env.get("R511_API_KEY");
  const tripcheckKey = Netlify.env.get("TRIPCHECK_KEY");
  const wsdotKey = Netlify.env.get("WSDOT_API_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[routepulse-ingest] Supabase env vars not configured, skipping.");
    return new Response(JSON.stringify({ skipped: "no_supabase_config" }), {
      status: 200,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const results: Record<string, number | string> = {};

  // ── ODOT TripCheck (Oregon-native, richer narratives) ──
  if (tripcheckKey) {
    try {
      const res = await fetch(
        "https://apiportal.odot.state.or.us/api/tripcheck/v1/incidents",
        { headers: { "Ocp-Apim-Subscription-Key": tripcheckKey } }
      );
      if (!res.ok) {
        results.odot = `error_${res.status}`;
      } else {
        const incidents = await res.json();
        const rows = (incidents as any[])
          .filter((inc) => inc.latitude && inc.longitude)
          .map((inc) => ({
            source: "odot_tripcheck",
            external_id: `odot_${inc.id}`,
            location: `POINT(${inc.longitude} ${inc.latitude})`,
            location_description: inc.locationDescription ?? null,
            road_name: inc.roadwayName ?? null,
            direction: inc.direction ?? null,
            incident_type: mapIncidentType(inc.eventCategory),
            severity: mapSeverity(inc.severity),
            description: inc.headline ?? inc.description ?? null,
            started_at: inc.createTime ?? null,
            estimated_end_at: inc.estimatedClearTime ?? null,
            raw_data: inc,
            source_url: inc.url ?? null,
          }));

        if (rows.length) {
          const { error } = await supabase
            .from("traffic_incidents")
            .upsert(rows, { onConflict: "source,external_id" });
          if (error) console.error("[routepulse-ingest] ODOT upsert error:", error.message);
        }
        // Sweep only after a confirmed-successful poll (res.ok, this branch)
        // so a fetch failure never wipes out previously-ingested incidents.
        await markClearedIncidents(
          supabase,
          "odot_tripcheck",
          rows.map((r) => r.external_id)
        );
        results.odot = rows.length;
      }
    } catch (err) {
      console.error("[routepulse-ingest] ODOT fetch failed:", err);
      results.odot = "fetch_failed";
    }
  } else {
    results.odot = "no_key";
  }

  // ── Road511 (multi-state normalized) ──
  if (r511Key) {
    let total = 0;
    let allRegionsOk = true;
    const road511ActiveIds: string[] = [];
    for (const region of REGIONS) {
      try {
        const url = `https://api.road511.com/v1/incidents?bbox=${region.bbox}&active=true`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${r511Key}` },
        });
        if (!res.ok) {
          console.error(`[routepulse-ingest] Road511 ${region.name} failed: ${res.status}`);
          allRegionsOk = false;
          continue;
        }
        const data = await res.json();
        const features = data.features ?? [];

        const rows = features.map((f: any) => {
          const [lng, lat] = f.geometry.coordinates;
          const p = f.properties;
          return {
            source: "road511",
            external_id: `r511_${p.id}`,
            location: `POINT(${lng} ${lat})`,
            location_description: p.location_description ?? null,
            road_name: p.road_name ?? null,
            direction: p.direction ?? null,
            incident_type: mapIncidentType(p.type),
            severity: mapSeverity(p.severity),
            description: p.description ?? null,
            started_at: p.start_time ?? null,
            estimated_end_at: p.estimated_end_time ?? null,
            raw_data: f,
            source_url: p.url ?? null,
          };
        });

        if (rows.length) {
          const { error } = await supabase
            .from("traffic_incidents")
            .upsert(rows, { onConflict: "source,external_id" });
          if (error) console.error(`[routepulse-ingest] Road511 ${region.name} upsert error:`, error.message);
        }
        road511ActiveIds.push(...rows.map((r: { external_id: string }) => r.external_id));
        total += rows.length;
      } catch (err) {
        console.error(`[routepulse-ingest] Road511 ${region.name} fetch failed:`, err);
        allRegionsOk = false;
      }
    }
    // Only sweep if every region was polled successfully this cycle — a
    // partial failure (one region down) must not clear that region's
    // still-active incidents just because they're missing from this round.
    if (allRegionsOk) {
      await markClearedIncidents(supabase, "road511", road511ActiveIds);
    } else {
      console.warn(
        "[routepulse-ingest] Skipping road511 clearance sweep — not all regions polled successfully."
      );
    }
    results.road511 = total;
  } else {
    results.road511 = "no_key";
  }

  // ── NWS weather alerts (free, keyless — api.weather.gov) ──
  // Driving-relevant weather alerts scored into route risk alongside
  // crashes/closures. Google shows weather in a different app; we put it
  // *on* the route. Only alerts with polygon geometry are ingested (see
  // mapNwsAlert), so the sweep id set below is exactly what we ingested.
  try {
    let nwsTotal = 0;
    let allAreasOk = true;
    const nwsActiveIds: string[] = [];
    for (const region of NWS_AREAS) {
      try {
        const res = await fetch(
          `https://api.weather.gov/alerts/active?area=${region.area}`,
          {
            headers: {
              // NWS asks for a descriptive UA with a contact point.
              "User-Agent": "UnifyOne-RoutePulse/1.0 (+https://1commerce.online)",
              Accept: "application/geo+json",
            },
          }
        );
        if (!res.ok) {
          console.error(`[routepulse-ingest] NWS ${region.area} failed: ${res.status}`);
          allAreasOk = false;
          continue;
        }
        const data = await res.json();
        const features = data.features ?? [];
        const rows = features
          .map((f: any) => mapNwsAlert(f, region.bbox))
          .filter((r: any): r is NonNullable<typeof r> => r !== null);

        if (rows.length) {
          const { error } = await supabase
            .from("traffic_incidents")
            .upsert(rows, { onConflict: "source,external_id" });
          if (error) console.error(`[routepulse-ingest] NWS ${region.area} upsert error:`, error.message);
        }
        nwsActiveIds.push(...rows.map((r: { external_id: string }) => r.external_id));
        nwsTotal += rows.length;
      } catch (err) {
        console.error(`[routepulse-ingest] NWS ${region.area} fetch failed:`, err);
        allAreasOk = false;
      }
    }
    if (allAreasOk) {
      await markClearedIncidents(supabase, "nws", nwsActiveIds);
    } else {
      console.warn(
        "[routepulse-ingest] Skipping nws clearance sweep — not all areas polled successfully."
      );
    }
    results.nws = nwsTotal;
  } catch (err) {
    console.error("[routepulse-ingest] NWS block failed:", err);
    results.nws = "fetch_failed";
  }

  // ── WSDOT highway alerts (SW Washington coverage gap) ──
  // Road511 is the only other WA source today; WSDOT's own feed is the
  // authoritative one for I-5/I-205/SR-14 around Vancouver.
  if (wsdotKey) {
    try {
      const res = await fetch(
        `https://wsdot.wa.gov/traffic/api/HighwayAlerts/HighwayAlertsREST.svc/GetAlertsAsJson?AccessCode=${wsdotKey}`
      );
      if (!res.ok) {
        results.wsdot = `error_${res.status}`;
      } else {
        const alerts = await res.json();
        const rows = (alerts as any[])
          .map((a) => mapWsdotAlert(a))
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (rows.length) {
          const { error } = await supabase
            .from("traffic_incidents")
            .upsert(rows, { onConflict: "source,external_id" });
          if (error) console.error("[routepulse-ingest] WSDOT upsert error:", error.message);
        }
        await markClearedIncidents(
          supabase,
          "wsdot",
          rows.map((r) => r.external_id)
        );
        results.wsdot = rows.length;
      }
    } catch (err) {
      console.error("[routepulse-ingest] WSDOT fetch failed:", err);
      results.wsdot = "fetch_failed";
    }
  } else {
    results.wsdot = "no_key";
  }

  // ── ODOT TripCheck cameras ──
  // Runs every ~5 minutes (this function itself polls every 2) rather than
  // every cycle — camera list/images change far less often than incidents,
  // and it's a separate rate-limited endpoint on the same ODOT key.
  if (tripcheckKey && new Date().getMinutes() % 5 === 0) {
    try {
      const res = await fetch(
        "https://apiportal.odot.state.or.us/api/tripcheck/v1/cameras",
        { headers: { "Ocp-Apim-Subscription-Key": tripcheckKey } }
      );
      if (!res.ok) {
        results.cameras = `error_${res.status}`;
      } else {
        const cameras = await res.json();
        const rows = (cameras as any[])
          .filter((cam) => cam.latitude && cam.longitude)
          .map((cam) => ({
            id: `odot_${cam.id}`,
            location: `POINT(${cam.longitude} ${cam.latitude})`,
            road_name: cam.roadwayName ?? null,
            direction: cam.direction ?? null,
            image_url: cam.imageUrl ?? null,
            thumbnail_url: cam.thumbnailUrl ?? null,
            description: cam.locationDescription ?? null,
            last_updated: cam.lastUpdated ?? null,
          }));

        if (rows.length) {
          const { error } = await supabase
            .from("traffic_cameras")
            .upsert(rows, { onConflict: "id" });
          if (error) console.error("[routepulse-ingest] Camera upsert error:", error.message);
        }
        results.cameras = rows.length;
      }
    } catch (err) {
      console.error("[routepulse-ingest] Camera fetch failed:", err);
      results.cameras = "fetch_failed";
    }
  } else if (!tripcheckKey) {
    results.cameras = "no_key";
  } else {
    results.cameras = "skipped_this_cycle";
  }

  console.log("[routepulse-ingest] Done:", results);
  return new Response(JSON.stringify({ ingested: results, timestamp: new Date().toISOString() }), {
    status: 200,
  });
};

export const config: Config = {
  schedule: "*/2 * * * *", // every 2 minutes
};
