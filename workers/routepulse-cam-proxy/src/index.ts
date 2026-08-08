/**
 * RoutePulse camera proxy — Cloudflare Worker.
 *
 * Why this exists:
 *  1. ODOT TripCheck camera stills can require an Ocp-Apim-Subscription-Key
 *     header. Shipping that key to the browser would leak it; this worker
 *     injects it server-side from a secret.
 *  2. Some camera hosts send no (or restrictive) CORS headers; the worker
 *     normalizes CORS so <img> tags from our origin always work.
 *  3. Edge caching (120s) shields ODOT/WSDOT from per-visitor refreshes —
 *     camera stills update slower than that anyway.
 *
 * Endpoint: GET /img?u=<url-encoded upstream image URL>
 * Only allowlisted camera hosts are proxied (open-proxy prevention), and
 * only over HTTPS. Everything else returns 403/404.
 */

export interface Env {
  /** ODOT TripCheck API subscription key (wrangler secret). Optional. */
  TRIPCHECK_KEY?: string;
}

const ALLOWED_HOSTS = new Set([
  "apiportal.odot.state.or.us",
  "odot.state.or.us",
  "www.tripcheck.com",
  "tripcheck.com",
  "wsdot.wa.gov",
  "www.wsdot.wa.gov",
  "images.wsdot.wa.gov",
]);

// Hosts that get the TripCheck subscription key injected on upstream fetches.
const TRIPCHECK_KEY_HOSTS = new Set([
  "apiportal.odot.state.or.us",
  "odot.state.or.us",
  "www.tripcheck.com",
  "tripcheck.com",
]);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "routepulse-cam-proxy" });
    }

    if (url.pathname !== "/img") {
      return json({ error: "not found" }, 404);
    }

    const target = url.searchParams.get("u");
    if (!target) return json({ error: "missing u param" }, 400);

    let upstream: URL;
    try {
      upstream = new URL(target);
    } catch {
      return json({ error: "invalid url" }, 400);
    }

    // HTTPS only + host allowlist — this worker must never become an
    // open proxy for arbitrary content.
    if (
      upstream.protocol !== "https:" ||
      !ALLOWED_HOSTS.has(upstream.hostname)
    ) {
      return json({ error: "host not allowed" }, 403);
    }

    const headers = new Headers({
      "User-Agent": "UnifyOne-RoutePulse/1.0 (+https://1commerce.online)",
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
    });
    if (env.TRIPCHECK_KEY && TRIPCHECK_KEY_HOSTS.has(upstream.hostname)) {
      headers.set("Ocp-Apim-Subscription-Key", env.TRIPCHECK_KEY);
    }

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstream.toString(), {
        headers,
        // Edge-cache identical stills for 2 minutes. Camera images refresh
        // slower than that, and the cache keeps us well under ODOT/WSDOT
        // rate expectations even with many concurrent viewers.
        cf: { cacheTtl: 120, cacheEverything: true },
      });
    } catch {
      return json({ error: "upstream unreachable" }, 502);
    }

    if (!upstreamRes.ok) {
      return json({ error: `upstream ${upstreamRes.status}` }, 502);
    }

    const contentType = upstreamRes.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      // Never proxy non-image payloads (error pages, HTML, etc.).
      return json({ error: "upstream did not return an image" }, 502);
    }

    return new Response(upstreamRes.body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "Cache-Control": "public, max-age=120",
        ...CORS_HEADERS,
      },
    });
  },
};
