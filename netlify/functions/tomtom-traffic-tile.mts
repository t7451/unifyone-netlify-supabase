/**
 * Proxies TomTom Traffic Flow raster tiles so TOMTOM_API_KEY stays server-side.
 * Leaflet: url `/api/tomtom-traffic-tile/flow/{z}/{x}/{y}`
 * Optional: `/api/tomtom-traffic-tile/incidents/{z}/{x}/{y}`
 *
 * @see https://developer.tomtom.com/traffic-api/documentation/traffic-flow/raster-flow-tiles
 */
import type { Context } from "@netlify/functions";

export const config = {
  path: "/api/tomtom-traffic-tile/:layer/:z/:x/:y",
};

const FLOW_STYLE = "relative0"; // green→red relative to free-flow

export default async function handler(req: Request, _context: Context) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const key = process.env.TOMTOM_API_KEY ?? "";
  if (!key) {
    return new Response("TOMTOM_API_KEY not configured", {
      status: 503,
      headers: corsHeaders(),
    });
  }

  const url = new URL(req.url);
  // path: /api/tomtom-traffic-tile/:layer/:z/:x/:y  (y may include .png)
  const parts = url.pathname.split("/").filter(Boolean);
  // ["api","tomtom-traffic-tile", layer, z, x, y]
  const layer = parts[2] ?? "flow";
  const z = parts[3] ?? "";
  const x = parts[4] ?? "";
  let y = parts[5] ?? "";
  y = y.replace(/\.png$/i, "");

  if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
    return new Response("Bad tile coordinates", {
      status: 400,
      headers: corsHeaders(),
    });
  }
  const zi = Number(z);
  if (zi < 0 || zi > 22) {
    return new Response("Zoom out of range", {
      status: 400,
      headers: corsHeaders(),
    });
  }

  let upstream: string;
  if (layer === "incidents") {
    upstream = `https://api.tomtom.com/traffic/map/4/tile/incidents/${z}/${x}/${y}.png?key=${encodeURIComponent(key)}&t=2`;
  } else {
    // default: flow
    upstream = `https://api.tomtom.com/traffic/map/4/tile/flow/${FLOW_STYLE}/${z}/${x}/${y}.png?key=${encodeURIComponent(key)}`;
  }

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 12_000);
    const res = await fetch(upstream, {
      headers: { Accept: "image/png" },
      signal: ac.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[tomtom-traffic-tile] upstream ${res.status} ${layer} ${z}/${x}/${y}: ${body.slice(0, 120)}`
      );
      return new Response(`Upstream ${res.status}`, {
        status: res.status === 403 || res.status === 401 ? 502 : res.status,
        headers: corsHeaders(),
      });
    }
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60, s-maxage=120",
      },
    });
  } catch (err) {
    console.warn("[tomtom-traffic-tile] fetch failed:", err);
    return new Response("Tile fetch failed", {
      status: 502,
      headers: corsHeaders(),
    });
  }
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  };
}
