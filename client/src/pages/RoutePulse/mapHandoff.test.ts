import { describe, it, expect } from "vitest";
import {
  googleMapsDirectionsUrl,
  appleMapsDirectionsUrl,
  buildShareSearchParams,
} from "./mapHandoff";

describe("mapHandoff", () => {
  const o = { lat: 45.52, lng: -122.68 };
  const d = { lat: 45.51, lng: -122.65 };

  it("builds Google Maps directions URL", () => {
    const url = googleMapsDirectionsUrl(o, d, [{ lat: 45.515, lng: -122.66 }]);
    expect(url).toContain("google.com/maps/dir");
    expect(url).toContain("origin=45.52");
    expect(url).toContain("waypoints=");
  });

  it("builds Apple Maps directions URL", () => {
    const url = appleMapsDirectionsUrl(o, d);
    expect(url).toContain("maps.apple.com");
    expect(url).toContain("saddr=45.52");
    expect(url).toContain("dirflg=d");
  });

  it("builds share query with pref and stops", () => {
    const qs = buildShareSearchParams({
      origin: "A",
      destination: "B",
      preference: "quiet",
      stops: ["C", "D"],
    });
    expect(qs).toContain("origin=A");
    expect(qs).toContain("pref=quiet");
    expect(qs).toContain("stops=C%7CD") || expect(qs).toContain("stops=C|D");
  });
});
