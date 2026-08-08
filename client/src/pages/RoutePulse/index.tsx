import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L, { type LatLngExpression, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { trpc } from "@/lib/trpc";
import PageHead from "@/components/PageHead";
import ToolLayout from "@/components/ToolLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AddressInput } from "@/components/AddressInput";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";
import {
  AlertTriangle,
  Navigation,
  Loader2,
  ArrowRight,
  LocateFixed,
  Maximize,
  Minimize,
  Layers,
} from "lucide-react";

/**
 * RoutePulse — hyperlocal route intelligence.
 *
 * Address in, AI-scored route + explanation + active incident list out,
 * rendered on a full-bleed, always-live map (no API key, no billing).
 * Geocoding (address -> coordinates) runs server-side via Nominatim
 * (OSM's free geocoder) as part of the getRoute call.
 *
 * The map is deliberately built to feel like "Google Maps but better" for
 * this use case: it's alive with active incidents before you even search,
 * has a floating glass search card instead of a form-then-map flow, and
 * gives you a locate-me + fullscreen + light/dark basemap toggle — using
 * only free CARTO/OSM tiles, still zero API key and zero billing.
 */

const CANONICAL = `${SITE_URL}/tools/route-pulse`;

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "RoutePulse — AI Route Intelligence",
    url: CANONICAL,
    description:
      "Free route checker that scores a driving route using live incident data and an AI explanation, so gig drivers can spot trouble before it hits mainstream traffic apps.",
    applicationCategory: "TransportationApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: {
      "@type": "Organization",
      name: "1Commerce / UnifyOne",
      url: SITE_URL,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What does RoutePulse do differently from Google Maps or Waze?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RoutePulse layers an AI explanation on top of live incident data along your route, calling out road closures, crashes, and hazards that may not have propagated to mainstream traffic apps yet — and the map shows those incidents live, before you even search a route.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need an account or an API key to use RoutePulse?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. RoutePulse works with no account and no API key — it runs on OpenStreetMap data and free-tier AI models. Enter an origin and destination address and get a scored route immediately.",
        },
      },
      {
        "@type": "Question",
        name: "What area does RoutePulse cover?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RoutePulse currently tracks incidents in Oregon and SW Washington, with more regions planned as coverage expands.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Free Tools",
        item: `${SITE_URL}/tools`,
      },
      { "@type": "ListItem", position: 3, name: "RoutePulse", item: CANONICAL },
    ],
  },
];

const SEVERITY_BADGE: Record<string, string> = {
  minor:
    "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  moderate:
    "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400",
  major: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
  critical: "bg-red-600/20 text-red-800 border-red-600/40 dark:text-red-400",
};

// Default view before any search: Portland, OR — the center of current
// (OR / SW WA) incident coverage.
const DEFAULT_CENTER: LatLngExpression = [45.5152, -122.6784];
const DEFAULT_ZOOM = 10;

// Free CARTO basemaps — no API key, just attribution. Meaningfully cleaner
// than raw OpenStreetMap default tiles (less visual noise, better label
// hierarchy), with a dark variant for a genuine Google-Maps-style toggle.
const BASEMAPS = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const;

// Custom pin icons (avoid Leaflet's default marker image path, which breaks
// under bundlers) — simple colored divs, no extra image assets to manage.
function pinIcon(color: string, size = 16) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
const ORIGIN_ICON = pinIcon("#3b82f6");
const DEST_ICON = pinIcon("#ef4444");
const USER_LOCATION_ICON = L.divIcon({
  className: "",
  html: `<div class="animate-pulse" style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.25)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const INCIDENT_ICON_COLOR: Record<string, string> = {
  minor: "#eab308",
  moderate: "#f97316",
  major: "#dc2626",
  critical: "#991b1b",
};
const INCIDENT_ICONS: Record<string, L.DivIcon> = Object.fromEntries(
  Object.entries(INCIDENT_ICON_COLOR).map(([severity, color]) => [
    severity,
    pinIcon(color, 14),
  ])
);

/** Recenters/fits the map whenever the bounds it's given change. */
function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }, [bounds, map]);
  return null;
}

export default function RoutePulse() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [submitted, setSubmitted] = useState<{
    origin: string;
    destination: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<keyof typeof BASEMAPS>("light");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);

  const routeQuery = trpc.routePulse.getRoute.useQuery(submitted!, {
    enabled: !!submitted,
    retry: false,
  });
  // routeQuery.isError stays true for the *previous* submitted pair until a
  // new query key runs — react-query has no way to know the user has since
  // edited the fields and hasn't resubmitted yet, so without this the error
  // banner from a failed geocode reads as if the corrected address also
  // failed. Only surface the banner while the visible fields still match
  // what was actually submitted.
  const resultsAreStale =
    !submitted ||
    submitted.origin !== origin.trim() ||
    submitted.destination !== destination.trim();
  const incidentsQuery = trpc.routePulse.listIncidents.useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin.trim().length < 3 || destination.trim().length < 3) {
      setFormError(
        "Enter a more complete origin and destination address (e.g. street, city, state)."
      );
      return;
    }
    setFormError(null);
    setSubmitted({ origin: origin.trim(), destination: destination.trim() });
    trackToolUsage("route-pulse", "start");
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocateError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const point: LatLngExpression = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setUserLocation(point);
        mapRef.current?.flyTo(point, 14, { duration: 0.75 });
        setLocating(false);
      },
      () => {
        setLocateError("Couldn't get your location — check permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleToggleFullscreen = () => {
    const el = mapWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === mapWrapperRef.current;
      setIsFullscreen(active);
      // Container size changed (fullscreen <-> normal) — Leaflet needs a
      // nudge to recompute its internal size, or tiles render into a
      // stale viewport.
      setTimeout(() => mapRef.current?.invalidateSize(), 50);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const routeLine: LatLngExpression[] | null = useMemo(() => {
    const geometry = routeQuery.data?.route.geometry as
      { coordinates: [number, number][] } | undefined;
    if (!geometry?.coordinates?.length) return null;
    return geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as LatLngExpression
    );
  }, [routeQuery.data]);

  // Active incidents with valid coordinates — used both as the always-on
  // map layer (before any route search) and the list card below the map.
  const activeIncidents = useMemo(
    () =>
      (incidentsQuery.data ?? []).filter(
        (i: any) => Number.isFinite(i.lat) && Number.isFinite(i.lng)
      ),
    [incidentsQuery.data]
  );

  const mapBounds: LatLngBoundsExpression | null = useMemo(() => {
    if (routeQuery.data) {
      const { origin: o, destination: d, route } = routeQuery.data;
      const points: LatLngExpression[] = [
        [o.lat, o.lng],
        [d.lat, d.lng],
        ...(routeLine ?? []),
        ...route.incidents
          .filter(i => Number.isFinite(i.lat) && Number.isFinite(i.lng))
          .map((i): LatLngExpression => [i.lat, i.lng]),
      ];
      return L.latLngBounds(points);
    }
    if (activeIncidents.length > 1) {
      return L.latLngBounds(
        activeIncidents.map((i: any): LatLngExpression => [i.lat, i.lng])
      );
    }
    return null;
  }, [routeQuery.data, routeLine, activeIncidents]);

  const hasRoute = !!(submitted && routeQuery.data);

  return (
    <>
      <PageHead
        title="RoutePulse — Free AI Route & Incident Checker | UnifyOne"
        description="Free tool for gig drivers: check a route for live incidents and get an AI explanation of what to watch for before you drive. No account required, built on OpenStreetMap."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />

      <ToolLayout toolName="RoutePulse" breadcrumb="RoutePulse">
        <header className="mb-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Route Intelligence
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 flex items-center gap-3">
            <Navigation className="w-8 h-8 shrink-0" />
            RoutePulse
          </h1>
          <p className="text-lg text-muted-foreground">
            Routes that read the news so you don't have to.{" "}
            <strong className="text-foreground">
              Enter an origin and destination address
            </strong>{" "}
            and get an AI-scored route on a live map, with incidents factored in
            before they hit mainstream traffic apps.
          </p>
        </header>

        {/* Full-bleed immersive map — breaks out of the tool's content
            column on purpose so it reads as the hero of the page, not a
            small embed. Always live with active incidents, even before a
            route is searched. */}
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen mb-8">
          <div
            ref={mapWrapperRef}
            className="relative h-[70vh] max-h-[640px] min-h-[420px] w-full bg-muted"
          >
            <MapContainer
              ref={mapRef}
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              zoomControl={false}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                key={basemap}
                attribution={BASEMAPS[basemap].attribution}
                url={BASEMAPS[basemap].url}
              />
              <ZoomControl position="bottomright" />
              <FitBounds bounds={mapBounds} />

              {userLocation && (
                <Marker position={userLocation} icon={USER_LOCATION_ICON} />
              )}

              {hasRoute ? (
                <>
                  <Marker
                    position={[
                      routeQuery.data!.origin.lat,
                      routeQuery.data!.origin.lng,
                    ]}
                    icon={ORIGIN_ICON}
                  />
                  <Marker
                    position={[
                      routeQuery.data!.destination.lat,
                      routeQuery.data!.destination.lng,
                    ]}
                    icon={DEST_ICON}
                  />
                  {routeLine && (
                    <Polyline
                      positions={routeLine}
                      pathOptions={{
                        color: "#3b82f6",
                        weight: 5,
                        opacity: 0.9,
                      }}
                    />
                  )}
                  {routeQuery
                    .data!.route.incidents.filter(
                      inc =>
                        Number.isFinite(inc.lat) && Number.isFinite(inc.lng)
                    )
                    .map(inc => (
                      <Marker
                        key={inc.id}
                        position={[inc.lat, inc.lng]}
                        icon={
                          INCIDENT_ICONS[inc.severity] ?? INCIDENT_ICONS.minor
                        }
                      >
                        <Popup>
                          <div className="text-sm space-y-0.5">
                            {inc.road_name && (
                              <p className="font-medium">{inc.road_name}</p>
                            )}
                            <p>{inc.description ?? inc.incident_type}</p>
                            <p className="text-xs uppercase text-muted-foreground">
                              {inc.severity}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                </>
              ) : (
                // No route searched yet — show every active incident so the
                // map is never just an empty base layer.
                activeIncidents.map((inc: any) => (
                  <Marker
                    key={inc.id}
                    position={[inc.lat, inc.lng]}
                    icon={INCIDENT_ICONS[inc.severity] ?? INCIDENT_ICONS.minor}
                  >
                    <Popup>
                      <div className="text-sm space-y-0.5">
                        {inc.road_name && (
                          <p className="font-medium">{inc.road_name}</p>
                        )}
                        <p>{inc.description ?? inc.incident_type}</p>
                        <p className="text-xs uppercase text-muted-foreground">
                          {inc.severity}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))
              )}
            </MapContainer>

            {/* Loading veil while a route is being scored */}
            {routeQuery.isFetching && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/50 backdrop-blur-[1px] pointer-events-none">
                <div className="flex items-center gap-2 rounded-full bg-background/90 border shadow-lg px-4 py-2 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scoring your route…
                </div>
              </div>
            )}

            {/* Floating glass search card — Google-Maps-style search-over-map
                instead of a form stacked above the map. */}
            <Card className="absolute z-[400] top-4 left-4 right-4 sm:right-auto sm:w-[380px] p-4 sm:p-5 bg-background/90 backdrop-blur-md shadow-xl border">
              <form onSubmit={handleSubmit} className="space-y-3">
                <AddressInput
                  id="routepulse-origin"
                  label="Origin"
                  placeholder="123 SW Broadway, Portland, OR"
                  value={origin}
                  onChange={setOrigin}
                  pinColor="blue"
                  name="routepulse-origin-query"
                />
                <AddressInput
                  id="routepulse-destination"
                  label="Destination"
                  placeholder="800 SE 10th Ave, Portland, OR"
                  value={destination}
                  onChange={setDestination}
                  pinColor="red"
                  name="routepulse-destination-query"
                />

                {formError && (
                  <p className="text-xs text-destructive">{formError}</p>
                )}

                <Button type="submit" size="sm" className="gap-2 w-full">
                  {routeQuery.isFetching && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Find route
                  {!routeQuery.isFetching && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>
            </Card>

            {/* Floating controls — locate me, basemap toggle, fullscreen */}
            <div className="absolute z-[400] top-4 right-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLocateMe}
                title="Find my location"
                className="w-9 h-9 rounded-md bg-background/90 backdrop-blur-md border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
              >
                {locating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LocateFixed className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  setBasemap(m => (m === "light" ? "dark" : "light"))
                }
                title="Toggle map style"
                className="w-9 h-9 rounded-md bg-background/90 backdrop-blur-md border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="w-9 h-9 rounded-md bg-background/90 backdrop-blur-md border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            </div>

            {locateError && (
              <div className="absolute z-[400] top-[calc(4rem+7rem)] right-4 max-w-[220px] rounded-md bg-background/95 border shadow-lg px-3 py-2 text-xs text-destructive sm:top-32">
                {locateError}
              </div>
            )}

            {/* Floating legend */}
            <div className="hidden sm:flex absolute z-[400] bottom-4 left-4 items-center gap-3 rounded-md bg-background/90 backdrop-blur-md border shadow-lg px-3 py-2 text-xs">
              {Object.entries(INCIDENT_ICON_COLOR).map(([severity, color]) => (
                <span key={severity} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white shadow"
                    style={{ background: color }}
                  />
                  <span className="capitalize text-muted-foreground">
                    {severity}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Result card */}
        {hasRoute && (
          <Card className="p-6 sm:p-8 mb-8 space-y-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <p className="text-2xl font-semibold">
                {(routeQuery.data!.route.distance / 1609.34).toFixed(1)} mi ·{" "}
                {Math.round(routeQuery.data!.route.duration / 60)} min
              </p>
              {routeQuery.data!.cached && (
                <Badge variant="outline" className="text-muted-foreground">
                  cached
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>
                <span className="font-medium text-foreground">From:</span>{" "}
                {routeQuery.data!.origin.displayName}
              </p>
              <p>
                <span className="font-medium text-foreground">To:</span>{" "}
                {routeQuery.data!.destination.displayName}
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t">
              {routeQuery.data!.explanation}
            </p>

            {routeQuery.data!.route.incidents.length > 0 && (
              <div className="space-y-2.5 pt-4 border-t">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  Incidents on this route
                </p>
                {routeQuery.data!.route.incidents.map(inc => (
                  <div
                    key={inc.id}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">
                      {inc.road_name && (
                        <span className="font-medium">{inc.road_name}: </span>
                      )}
                      {inc.description ?? inc.incident_type}
                    </span>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${SEVERITY_BADGE[inc.severity] ?? ""}`}
                    >
                      {inc.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {routeQuery.isError && !resultsAreStale && (
          <Card className="p-6 mb-8 border-destructive/30 bg-destructive/5">
            <p className="text-sm text-destructive">
              {routeQuery.error?.message?.includes("Couldn't find")
                ? routeQuery.error.message
                : "Couldn't find a route between those addresses. Double-check them and try again."}
            </p>
          </Card>
        )}

        {/* Active incidents feed (list form, for accessibility / no-JS-map
            fallback — the map above already shows these live). */}
        <Card className="p-6 sm:p-8 mb-10">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-4">
            Active incidents (Oregon / SW Washington)
          </p>
          {incidentsQuery.data?.length ? (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {incidentsQuery.data.map(inc => (
                <div
                  key={inc.id as string}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-muted-foreground">
                    {inc.road_name ? `${inc.road_name} — ` : ""}
                    {(inc.description as string) ??
                      (inc.incident_type as string)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${SEVERITY_BADGE[inc.severity as string] ?? ""}`}
                  >
                    {inc.severity as string}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active incidents reported right now.
            </p>
          )}
        </Card>

        {/* Context */}
        <section className="prose prose-neutral dark:prose-invert max-w-none mb-12">
          <h2>Why route intelligence matters for gig drivers</h2>
          <p>
            A closed lane or a fresh crash can add 15+ minutes to a delivery or
            rideshare trip before mainstream traffic apps catch up. RoutePulse
            checks live incident feeds along your route and uses free-tier AI to
            explain what's actually happening — not just a red line on a map.
          </p>
          <p>
            Built entirely on free, open infrastructure: addresses are resolved
            with OpenStreetMap's Nominatim geocoder, routing runs on OSRM, and
            the map itself uses free CARTO/OpenStreetMap tiles — no Google Maps
            billing, no API key required.
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "What does RoutePulse do differently from Google Maps or Waze?",
                a: "RoutePulse layers an AI explanation on top of live incident data along your route, calling out closures, crashes, and hazards that may not have propagated to mainstream traffic apps yet — and the map is live with those incidents before you even search.",
              },
              {
                q: "Do I need an account or API key to use RoutePulse?",
                a: "No. It's built on free, open infrastructure — OpenStreetMap for geocoding, CARTO/OpenStreetMap for the map, OSRM for routing, and free-tier AI models for the explanation. Enter an origin and destination and get a scored route immediately.",
              },
              {
                q: "What area does RoutePulse cover?",
                a: "Oregon and SW Washington today, with more regions planned as coverage expands.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b pb-6 last:border-0">
                <h3 className="font-semibold mb-2">{q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl border bg-muted/30 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">
            Get route intelligence built into your gig dashboard
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Create a free UnifyOne account to save routes, get incident alerts
            on your active shift, and manage earnings across gig platforms in
            one place.
          </p>
          <Link
            href="/register"
            onClick={() => trackToolUsage("route-pulse", "signup_cta")}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start for free →
          </Link>
        </section>
      </ToolLayout>
    </>
  );
}
