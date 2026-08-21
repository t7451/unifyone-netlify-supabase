/**
 * Build deep links so drivers can hand a RoutePulse plan to Google/Apple Maps
 * for turn-by-turn — the web app owns planning; native apps still win navigation.
 */

export type HandoffPoint = {
  lat: number;
  lng: number;
  label?: string;
};

/** Google Maps directions URL (works on mobile + desktop). */
export function googleMapsDirectionsUrl(
  origin: HandoffPoint,
  destination: HandoffPoint,
  stops: HandoffPoint[] = []
): string {
  const o = `${origin.lat},${origin.lng}`;
  const d = `${destination.lat},${destination.lng}`;
  const params = new URLSearchParams({
    api: "1",
    origin: o,
    destination: d,
    travelmode: "driving",
  });
  if (stops.length > 0) {
    params.set("waypoints", stops.map(s => `${s.lat},${s.lng}`).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Apple Maps directions URL.
 * Note: Apple supports a limited number of intermediate stops via `daddr`
 * chaining; we pass origin + destination and append stops when few.
 */
export function appleMapsDirectionsUrl(
  origin: HandoffPoint,
  destination: HandoffPoint,
  stops: HandoffPoint[] = []
): string {
  // saddr / daddr form is the most reliable cross-device Apple Maps link.
  let url = `https://maps.apple.com/?saddr=${origin.lat},${origin.lng}&daddr=${destination.lat},${destination.lng}&dirflg=d`;
  // Additional stops: Apple accepts multiple daddr in some clients; keep ≤3 extras.
  for (const s of stops.slice(0, 3)) {
    url += `+to:${s.lat},${s.lng}`;
  }
  return url;
}

/** Plain-text summary for SMS / clipboard. */
export function formatRouteSmsSummary(opts: {
  originLabel: string;
  destinationLabel: string;
  miles: number;
  minutes: number;
  incidentCount: number;
  shareUrl?: string;
}): string {
  const lines = [
    `RoutePulse: ${opts.originLabel} → ${opts.destinationLabel}`,
    `${opts.miles.toFixed(1)} mi · ~${opts.minutes} min · ${opts.incidentCount} incident${opts.incidentCount === 1 ? "" : "s"} on path`,
  ];
  if (opts.shareUrl) lines.push(opts.shareUrl);
  return lines.join("\n");
}

export function buildShareSearchParams(opts: {
  origin: string;
  destination: string;
  preference?: string;
  stops?: string[];
}): string {
  const params = new URLSearchParams();
  params.set("origin", opts.origin);
  params.set("destination", opts.destination);
  if (opts.preference && opts.preference !== "balanced") {
    params.set("pref", opts.preference);
  }
  if (opts.stops?.length) {
    params.set("stops", opts.stops.filter(Boolean).join("|"));
  }
  return params.toString();
}
