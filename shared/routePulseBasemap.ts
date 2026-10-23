const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** CARTO keys are public browser keys. Without one, use standard OSM tiles. */
export function createRouteBasemaps(cartoKey?: string) {
  const key = cartoKey?.trim();
  const attribution = key
    ? OSM_ATTRIBUTION +
      ' &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : OSM_ATTRIBUTION;
  const tileUrl = (style: string) =>
    key
      ? `https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  return {
    light: { url: tileUrl("voyager"), attribution, className: "" },
    dark: {
      url: tileUrl("dark_all"),
      attribution,
      className: key ? "" : "routepulse-osm-dark",
    },
  };
}
