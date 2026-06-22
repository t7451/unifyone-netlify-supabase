/**
 * Coarse, privacy-friendly geo extraction from request headers.
 *
 * Returns country / region (subdivision) / city derived from the CDN edge — no
 * precise coordinates, no third-party lookup, no IP stored. This answers "WHERE
 * are my shoppers" at a city/region level without tracking individuals.
 *
 * Works behind Netlify (`x-nf-geo`, a base64-encoded JSON blob) and falls back
 * to the common single-value country headers other CDNs set (Vercel,
 * Cloudflare, etc.). Reads from either an Express request (plain headers object)
 * or a WHATWG fetch request (`Headers` instance).
 */

type HeaderBag = {
  headers: Headers | Record<string, string | string[] | undefined>;
};

export type GeoInfo = {
  country?: string;
  region?: string;
  city?: string;
};

function getHeader(req: HeaderBag, name: string): string | undefined {
  if (req.headers instanceof Headers) {
    return req.headers.get(name) ?? undefined;
  }
  const val = req.headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0];
  return typeof val === "string" ? val : undefined;
}

export function extractGeo(req: HeaderBag): GeoInfo {
  // Netlify edge: x-nf-geo is base64-encoded JSON
  // { country: { code, name }, subdivision: { code, name }, city }
  const nfGeo = getHeader(req, "x-nf-geo");
  if (nfGeo) {
    try {
      const json = JSON.parse(
        Buffer.from(nfGeo, "base64").toString("utf8")
      ) as {
        country?: { code?: string };
        subdivision?: { code?: string };
        city?: string;
      };
      const geo: GeoInfo = {};
      if (json.country?.code) geo.country = json.country.code;
      if (json.subdivision?.code) geo.region = json.subdivision.code;
      if (json.city) geo.city = json.city;
      if (geo.country || geo.region || geo.city) return geo;
    } catch {
      // Fall through to single-value headers.
    }
  }

  // Common single-value country headers from other CDNs / proxies.
  const country =
    getHeader(req, "x-vercel-ip-country") ??
    getHeader(req, "cf-ipcountry") ??
    getHeader(req, "x-country") ??
    getHeader(req, "x-geo-country");
  const region =
    getHeader(req, "x-vercel-ip-country-region") ??
    getHeader(req, "x-geo-region");
  const city =
    getHeader(req, "x-vercel-ip-city") ?? getHeader(req, "x-geo-city");

  const geo: GeoInfo = {};
  if (country && country.toLowerCase() !== "xx") geo.country = country;
  if (region) geo.region = region;
  if (city) geo.city = decodeURIComponent(city);
  return geo;
}
