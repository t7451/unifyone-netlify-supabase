/**
 * M2 Phase-2 lite: quota-capped raster tile cache for the active trip bbox.
 * Uses Cache API when available. Never blocks the UI.
 */

const CACHE_NAME = "rp-tiles-v1";
const MAX_ENTRIES = 400;
const ALLOWED_HOST_SUFFIXES = [
  "basemaps.cartocdn.com",
  "tile.openstreetmap.org",
  "a.tile.openstreetmap.org",
  "b.tile.openstreetmap.org",
  "c.tile.openstreetmap.org",
];

function hostAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_HOST_SUFFIXES.some(
      h => u.hostname === h || u.hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

/** Warm tiles for a lat/lng bbox at a single zoom (best-effort). */
export async function warmTripTiles(opts: {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom?: number;
}): Promise<number> {
  if (typeof caches === "undefined") return 0;
  const z = opts.zoom ?? 13;
  const tiles = tilesForBbox(opts.minLat, opts.minLng, opts.maxLat, opts.maxLng, z);
  // Cap network storm
  const slice = tiles.slice(0, 48);
  let ok = 0;
  const cache = await caches.open(CACHE_NAME);
  await trimCache(cache, MAX_ENTRIES - slice.length);
  await Promise.all(
    slice.map(async ({ x, y }) => {
      // CARTO voyager CDN
      const url = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
      if (!hostAllowed(url)) return;
      try {
        const existing = await cache.match(url);
        if (existing) {
          ok++;
          return;
        }
        const res = await fetch(url, { mode: "cors" });
        if (res.ok) {
          await cache.put(url, res.clone());
          ok++;
        }
      } catch {
        /* ignore single tile failures */
      }
    })
  );
  return ok;
}

export async function clearTripTiles(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    await caches.delete(CACHE_NAME);
  } catch {
    /* ignore */
  }
}

async function trimCache(cache: Cache, room: number): Promise<void> {
  const keys = await cache.keys();
  const overflow = keys.length - Math.max(0, MAX_ENTRIES - room);
  if (overflow <= 0) return;
  for (let i = 0; i < overflow; i++) {
    const k = keys[i];
    if (k) await cache.delete(k);
  }
}

function tilesForBbox(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  z: number
): Array<{ x: number; y: number }> {
  const tMin = latLngToTile(maxLat, minLng, z);
  const tMax = latLngToTile(minLat, maxLng, z);
  const out: Array<{ x: number; y: number }> = [];
  for (let x = tMin.x; x <= tMax.x; x++) {
    for (let y = tMin.y; y <= tMax.y; y++) {
      out.push({ x, y });
    }
  }
  return out;
}

function latLngToTile(lat: number, lng: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}
