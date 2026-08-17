/**
 * Pure helpers for off-route detection + recalculate-from-here.
 * Kept free of React so edge cases can be unit-tested.
 */

import {
  distanceToPolylineM,
  OFF_ROUTE_THRESHOLD_M,
} from "./routeOfflineStore";

export { OFF_ROUTE_THRESHOLD_M, distanceToPolylineM };

/** How many consecutive GPS samples beyond threshold before UI prompts. */
export const OFF_ROUTE_STRIKES_REQUIRED = 2;

export type RecalcInput = {
  userLat: number | null | undefined;
  userLng: number | null | undefined;
  destination: string | null | undefined;
  preference: string | null | undefined;
  stops?: string[] | null;
};

export type RecalcPayload = {
  origin: string;
  destination: string;
  preference: string;
  stops: string[];
};

export type RecalcRejectReason =
  | "no_gps"
  | "invalid_gps"
  | "no_destination"
  | "destination_too_short";

/**
 * Build a new plan payload from current GPS, or a reject reason.
 * Origin is fixed to 5 decimals (~1.1 m) for stable geocoding + cache keys.
 */
export function buildRecalcPayload(
  input: RecalcInput
): { ok: true; payload: RecalcPayload } | { ok: false; reason: RecalcRejectReason } {
  const { userLat, userLng, destination, preference, stops } = input;

  if (
    userLat == null ||
    userLng == null ||
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng)
  ) {
    return { ok: false, reason: "no_gps" };
  }
  // Reject absurd / null-island style fixes
  if (Math.abs(userLat) < 1e-5 && Math.abs(userLng) < 1e-5) {
    return { ok: false, reason: "invalid_gps" };
  }
  if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    return { ok: false, reason: "invalid_gps" };
  }

  const dest = (destination ?? "").trim();
  if (!dest) return { ok: false, reason: "no_destination" };
  if (dest.length < 3) return { ok: false, reason: "destination_too_short" };

  return {
    ok: true,
    payload: {
      origin: `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`,
      destination: dest,
      preference: preference ?? "balanced",
      stops: (stops ?? []).map(s => s.trim()).filter(s => s.length >= 3).slice(0, 8),
    },
  };
}

/**
 * Update consecutive off-route strike count for one GPS sample.
 * Returns next strike count and whether the UI should show off-route.
 */
export function nextOffRouteStrikes(
  currentStrikes: number,
  distToRouteM: number,
  thresholdM: number = OFF_ROUTE_THRESHOLD_M,
  required: number = OFF_ROUTE_STRIKES_REQUIRED
): { strikes: number; offRoute: boolean } {
  if (!Number.isFinite(distToRouteM)) {
    // Empty polyline → treat as not off-route (no false prompt mid-load)
    return { strikes: 0, offRoute: false };
  }
  if (distToRouteM > thresholdM) {
    const strikes = currentStrikes + 1;
    return { strikes, offRoute: strikes >= required };
  }
  return { strikes: 0, offRoute: false };
}

/** True if GPS is meaningfully different from the plan origin (avoid no-op recalc). */
export function isGpsMeaningfullyMoved(
  originLat: number,
  originLng: number,
  gpsLat: number,
  gpsLng: number,
  minMoveM = 40
): boolean {
  const dist = distanceToPolylineM(gpsLat, gpsLng, [[originLat, originLng]]);
  return dist >= minMoveM;
}
