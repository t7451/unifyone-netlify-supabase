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

  console.log("[routepulse-ingest] Done:", results);
  return new Response(JSON.stringify({ ingested: results, timestamp: new Date().toISOString() }), {
    status: 200,
  });
};

export const config: Config = {
  schedule: "*/2 * * * *", // every 2 minutes
};
