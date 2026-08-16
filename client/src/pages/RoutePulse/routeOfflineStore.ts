/**
 * M2: IndexedDB snapshot of the last successful RoutePulse result + active trip.
 * Device-local offline — complements Netlify Blobs (server) and localStorage (legacy).
 */

const DB_NAME = "routepulse-offline";
const DB_VERSION = 1;
const STORE = "routes";
const LAST_KEY = "last-route";
const TRIP_KEY = "active-trip";

export type OfflineRouteSnapshot = {
  savedAt: number;
  originLabel: string;
  destinationLabel: string;
  preference?: string;
  stops?: string[];
  miles: number;
  minutes: number;
  incidentCount: number;
  explanation: string;
  geometry: { type: "LineString"; coordinates: [number, number][] } | null;
  maneuvers: Array<{
    instruction: string;
    distanceM: number;
    location?: [number, number];
  }>;
  sharePath?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb put failed"));
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error ?? new Error("idb get failed"));
    });
  } catch {
    return null;
  }
}

async function idbDel(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb del failed"));
    });
  } catch {
    /* ignore */
  }
}

export async function saveLastRoute(
  snapshot: OfflineRouteSnapshot
): Promise<void> {
  try {
    await idbPut(LAST_KEY, snapshot);
  } catch {
    /* private mode / quota — non-fatal */
  }
}

export async function loadLastRoute(): Promise<OfflineRouteSnapshot | null> {
  return idbGet<OfflineRouteSnapshot>(LAST_KEY);
}

export async function saveActiveTrip(
  snapshot: OfflineRouteSnapshot
): Promise<void> {
  try {
    await idbPut(TRIP_KEY, { ...snapshot, savedAt: Date.now() });
  } catch {
    /* ignore */
  }
}

export async function loadActiveTrip(): Promise<OfflineRouteSnapshot | null> {
  return idbGet<OfflineRouteSnapshot>(TRIP_KEY);
}

export async function clearActiveTrip(): Promise<void> {
  await idbDel(TRIP_KEY);
}

/** Distance from point to nearest segment on a polyline (lat/lng degrees). */
export function distanceToPolylineM(
  lat: number,
  lng: number,
  line: Array<[number, number]>
): number {
  if (!line.length) return Infinity;
  let best = Infinity;
  for (let i = 0; i < line.length; i++) {
    const [aLat, aLng] = line[i]!;
    best = Math.min(best, haversineM(lat, lng, aLat, aLng));
    if (i + 1 < line.length) {
      const [bLat, bLng] = line[i + 1]!;
      // Sample midpoint as a cheap segment proxy
      best = Math.min(
        best,
        haversineM(lat, lng, (aLat + bLat) / 2, (aLng + bLng) / 2)
      );
    }
  }
  return best;
}

function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Off-route if farther than this from the active polyline. */
export const OFF_ROUTE_THRESHOLD_M = 160;
