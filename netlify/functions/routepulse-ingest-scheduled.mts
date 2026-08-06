/**
 * routepulse-ingest-scheduled.mts
 *
 * Scheduled Function — polls Road511 (multi-state) and ODOT TripCheck
 * (Oregon-native) every 2 minutes and upserts active incidents into the
 * `traffic_incidents` Supabase table. RoutePulse's route-scoring endpoint
 * (server/routers/routePulse) reads from this table via the
 * `incidents_near_route` PostGIS RPC.
 *
 * Schedule: every 2 minutes
 *
 * Env vars required:
 *   SUPABASE_URL, SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)
 *   R511_API_KEY      — Road511 unified 511 API
 *   TRIPCHECK_KEY     — ODOT TripCheck API (Ocp-Apim-Subscription-Key)
 *
 * Supabase schema required: see migration `routepulse_init` —
 * traffic_incidents, traffic_cameras, routes_cache, incidents_near_route().
 */
import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Initial coverage area: Oregon + SW Washington (Portland metro MVP).
const REGIONS = [
  { name: "oregon", bbox: "-124.5,41.9,-116.4,46.3" },
  { name: "washington_sw", bbox: "-124.8,45.5,-122.0,49.0" },
];

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

export default async (req: Request) => {
  const { next_run } = await req.json().catch(() => ({ next_run: "unknown" }));
  console.log(`[routepulse-ingest] Poll start. Next: ${next_run}`);

  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const supabaseKey =
    Netlify.env.get("SUPABASE_SECRET_KEY") ??
    Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const r511Key = Netlify.env.get("R511_API_KEY");
  const tripcheckKey = Netlify.env.get("TRIPCHECK_KEY");

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
    for (const region of REGIONS) {
      try {
        const url = `https://api.road511.com/v1/incidents?bbox=${region.bbox}&active=true`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${r511Key}` },
        });
        if (!res.ok) {
          console.error(`[routepulse-ingest] Road511 ${region.name} failed: ${res.status}`);
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
        total += rows.length;
      } catch (err) {
        console.error(`[routepulse-ingest] Road511 ${region.name} fetch failed:`, err);
      }
    }
    results.road511 = total;
  } else {
    results.road511 = "no_key";
  }

  console.log("[routepulse-ingest] Done:", results);
  return new Response(JSON.stringify({ ingested: results, timestamp: new Date().toISOString() }), {
    status: 200,
  });
};

export const config: Config = {
  schedule: "*/2 * * * *", // every 2 minutes
};
