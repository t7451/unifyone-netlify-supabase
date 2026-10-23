import { describe, expect, it } from "vitest";
import { createRouteBasemaps } from "../shared/routePulseBasemap";

describe("RoutePulse basemap availability", () => {
  it.each([undefined, "", "  "])(
    "uses attributed OSM tiles without a key (%j)",
    key => {
      const maps = createRouteBasemaps(key);
      expect(maps.light.url).toBe(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      );
      expect(maps.dark.url).toBe(maps.light.url);
      expect(maps.dark.className).toBe("routepulse-osm-dark");
      expect(maps.light.attribution).toContain("OpenStreetMap");
      expect(maps.light.attribution).not.toContain("CARTO");
    }
  );
  it("uses encoded CARTO credentials on both styles when configured", () => {
    const maps = createRouteBasemaps(" demo+key&value ");
    expect(maps.light.url).toContain(
      "/voyager/{z}/{x}/{y}.png?key=demo%2Bkey%26value"
    );
    expect(maps.dark.url).toContain(
      "/dark_all/{z}/{x}/{y}.png?key=demo%2Bkey%26value"
    );
    expect(maps.dark.className).toBe("");
    expect(maps.dark.attribution).toContain("CARTO");
  });
});
