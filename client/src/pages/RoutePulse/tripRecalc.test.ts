import { describe, it, expect } from "vitest";
import {
  buildRecalcPayload,
  nextOffRouteStrikes,
  isGpsMeaningfullyMoved,
  distanceToPolylineM,
  OFF_ROUTE_THRESHOLD_M,
  OFF_ROUTE_STRIKES_REQUIRED,
} from "./tripRecalc";

/** Short eastbound segment near downtown Portland. */
const PDX_LINE: Array<[number, number]> = [
  [45.515, -122.68],
  [45.515, -122.67],
  [45.515, -122.66],
];

describe("distanceToPolylineM", () => {
  it("returns Infinity for empty line", () => {
    expect(distanceToPolylineM(45.5, -122.7, [])).toBe(Infinity);
  });

  it("is ~0 when on a vertex", () => {
    expect(distanceToPolylineM(45.515, -122.67, PDX_LINE)).toBeLessThan(5);
  });

  it("is small near the segment midpoint", () => {
    // Midpoint between first two points
    const d = distanceToPolylineM(45.515, -122.675, PDX_LINE);
    expect(d).toBeLessThan(OFF_ROUTE_THRESHOLD_M);
  });

  it("flags a point ~300m north as beyond threshold", () => {
    // ~0.0027 deg lat ≈ 300 m
    const d = distanceToPolylineM(45.5177, -122.67, PDX_LINE);
    expect(d).toBeGreaterThan(OFF_ROUTE_THRESHOLD_M);
  });
});

describe("nextOffRouteStrikes", () => {
  it("requires two consecutive strikes before offRoute", () => {
    const far = OFF_ROUTE_THRESHOLD_M + 50;
    const s1 = nextOffRouteStrikes(0, far);
    expect(s1).toEqual({ strikes: 1, offRoute: false });
    const s2 = nextOffRouteStrikes(s1.strikes, far);
    expect(s2).toEqual({ strikes: 2, offRoute: true });
  });

  it("resets strikes when back on route", () => {
    const s = nextOffRouteStrikes(2, 10);
    expect(s).toEqual({ strikes: 0, offRoute: false });
  });

  it("does not prompt on empty polyline (Infinity distance)", () => {
    expect(nextOffRouteStrikes(0, Infinity)).toEqual({
      strikes: 0,
      offRoute: false,
    });
  });

  it("stays off-route while strikes keep accumulating past required", () => {
    const far = OFF_ROUTE_THRESHOLD_M + 1;
    let strikes = 0;
    let off = false;
    for (let i = 0; i < 5; i++) {
      const n = nextOffRouteStrikes(strikes, far);
      strikes = n.strikes;
      off = n.offRoute;
    }
    expect(off).toBe(true);
    expect(strikes).toBeGreaterThanOrEqual(OFF_ROUTE_STRIKES_REQUIRED);
  });
});

describe("buildRecalcPayload", () => {
  const base = {
    userLat: 45.52345,
    userLng: -122.6789,
    destination: "3229 NW Pittock Dr, Portland",
    preference: "fastest",
    stops: ["", "  ", "Coffee stop"],
  };

  it("builds origin fixed to 5 decimals and filters stops", () => {
    const r = buildRecalcPayload(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.origin).toBe("45.52345, -122.67890");
    expect(r.payload.destination).toBe(base.destination);
    expect(r.payload.preference).toBe("fastest");
    expect(r.payload.stops).toEqual(["Coffee stop"]);
  });

  it("rejects missing GPS", () => {
    expect(buildRecalcPayload({ ...base, userLat: null }).ok).toBe(false);
    expect(
      (buildRecalcPayload({ ...base, userLat: null }) as { reason: string })
        .reason
    ).toBe("no_gps");
  });

  it("rejects null-island and out-of-range coordinates", () => {
    expect(
      buildRecalcPayload({ ...base, userLat: 0, userLng: 0 }).ok
    ).toBe(false);
    expect(
      buildRecalcPayload({ ...base, userLat: 95, userLng: -122 }).ok
    ).toBe(false);
  });

  it("rejects empty / tiny destination", () => {
    expect(buildRecalcPayload({ ...base, destination: "" }).ok).toBe(false);
    expect(buildRecalcPayload({ ...base, destination: "ab" }).ok).toBe(false);
  });

  it("defaults preference to balanced", () => {
    const r = buildRecalcPayload({ ...base, preference: null });
    expect(r.ok && r.payload.preference).toBe("balanced");
  });

  it("caps stops at 8", () => {
    const stops = Array.from({ length: 12 }, (_, i) => `Stop ${i} long enough`);
    const r = buildRecalcPayload({ ...base, stops });
    expect(r.ok && r.payload.stops).toHaveLength(8);
  });
});

describe("isGpsMeaningfullyMoved", () => {
  it("false when still at origin", () => {
    expect(isGpsMeaningfullyMoved(45.5, -122.7, 45.5, -122.7)).toBe(false);
  });

  it("true when moved ~100m", () => {
    // ~0.001 deg lat ≈ 111 m
    expect(isGpsMeaningfullyMoved(45.5, -122.7, 45.501, -122.7)).toBe(true);
  });
});
