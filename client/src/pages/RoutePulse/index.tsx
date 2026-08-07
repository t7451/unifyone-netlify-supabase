import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L, { type LatLngExpression, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { trpc } from "@/lib/trpc";
import PageHead from "@/components/PageHead";
import ToolLayout from "@/components/ToolLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SITE_URL } from "@/lib/siteConfig";
import { trackToolUsage } from "@/lib/userTracking";
import {
  AlertTriangle,
  Navigation,
  Loader2,
  ArrowRight,
  MapPin,
} from "lucide-react";

/**
 * RoutePulse — hyperlocal route intelligence.
 *
 * Address in, AI-scored route + explanation + active incident list out,
 * rendered on a free OpenStreetMap/Leaflet map (no API key, no billing).
 * Geocoding (address -> coordinates) runs server-side via Nominatim
 * (OSM's free geocoder) as part of the getRoute call.
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
          text: "RoutePulse layers an AI explanation on top of live incident data along your route, calling out road closures, crashes, and hazards that may not have propagated to mainstream traffic apps yet.",
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

// Custom pin icons (avoid Leaflet's default marker image path, which breaks
// under bundlers) — simple colored divs, no extra image assets to manage.
function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}
const ORIGIN_ICON = pinIcon("#3b82f6");
const DEST_ICON = pinIcon("#ef4444");

/** Recenters/fits the map whenever the bounds it's given change. */
function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useMemo(() => {
    if (bounds) map.fitBounds(bounds, { padding: [32, 32] });
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

  const routeQuery = trpc.routePulse.getRoute.useQuery(submitted!, {
    enabled: !!submitted,
    retry: false,
  });
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

  const routeLine: LatLngExpression[] | null = useMemo(() => {
    const geometry = routeQuery.data?.route.geometry as
      | { coordinates: [number, number][] }
      | undefined;
    if (!geometry?.coordinates?.length) return null;
    return geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as LatLngExpression
    );
  }, [routeQuery.data]);

  const mapBounds: LatLngBoundsExpression | null = useMemo(() => {
    if (!routeQuery.data) return null;
    const { origin: o, destination: d } = routeQuery.data;
    const points: LatLngExpression[] = [
      [o.lat, o.lng],
      [d.lat, d.lng],
      ...(routeLine ?? []),
    ];
    return L.latLngBounds(points);
  }, [routeQuery.data, routeLine]);

  return (
    <>
      <PageHead
        title="RoutePulse — Free AI Route & Incident Checker | UnifyOne"
        description="Free tool for gig drivers: check a route for live incidents and get an AI explanation of what to watch for before you drive. No account required, built on OpenStreetMap."
        canonical={CANONICAL}
        jsonLd={jsonLd}
      />

      <ToolLayout toolName="RoutePulse" breadcrumb="RoutePulse">
        <header className="mb-10">
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

        {/* Input card */}
        <Card className="p-6 sm:p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="w-3.5 h-3.5" /> Origin address
                </Label>
                <Input
                  placeholder="123 SW Broadway, Portland, OR"
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="w-3.5 h-3.5" /> Destination address
                </Label>
                <Input
                  placeholder="800 SE 10th Ave, Portland, OR"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <Button type="submit" className="gap-2 w-full sm:w-auto">
              {routeQuery.isFetching && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Find route
              {!routeQuery.isFetching && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </Card>

        {/* Map */}
        {submitted && routeQuery.data && (
          <Card className="p-0 mb-8 overflow-hidden">
            <div className="h-[360px] sm:h-[440px] w-full">
              <MapContainer
                center={[
                  routeQuery.data.origin.lat,
                  routeQuery.data.origin.lng,
                ]}
                zoom={12}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                {/* OpenStreetMap tiles — free, no API key. Attribution required. */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds bounds={mapBounds} />
                <Marker
                  position={[
                    routeQuery.data.origin.lat,
                    routeQuery.data.origin.lng,
                  ]}
                  icon={ORIGIN_ICON}
                />
                <Marker
                  position={[
                    routeQuery.data.destination.lat,
                    routeQuery.data.destination.lng,
                  ]}
                  icon={DEST_ICON}
                />
                {routeLine && (
                  <Polyline
                    positions={routeLine}
                    pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.85 }}
                  />
                )}
              </MapContainer>
            </div>
          </Card>
        )}

        {/* Result card */}
        {submitted && routeQuery.data && (
          <Card className="p-6 sm:p-8 mb-8 space-y-4">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <p className="text-2xl font-semibold">
                {(routeQuery.data.route.distance / 1609.34).toFixed(1)} mi ·{" "}
                {Math.round(routeQuery.data.route.duration / 60)} min
              </p>
              {routeQuery.data.cached && (
                <Badge variant="outline" className="text-muted-foreground">
                  cached
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>
                <span className="font-medium text-foreground">From:</span>{" "}
                {routeQuery.data.origin.displayName}
              </p>
              <p>
                <span className="font-medium text-foreground">To:</span>{" "}
                {routeQuery.data.destination.displayName}
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t">
              {routeQuery.data.explanation}
            </p>

            {routeQuery.data.route.incidents.length > 0 && (
              <div className="space-y-2.5 pt-4 border-t">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  Incidents on this route
                </p>
                {routeQuery.data.route.incidents.map(inc => (
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

        {routeQuery.isError && (
          <Card className="p-6 mb-8 border-destructive/30 bg-destructive/5">
            <p className="text-sm text-destructive">
              {routeQuery.error?.message?.includes("Couldn't find")
                ? routeQuery.error.message
                : "Couldn't find a route between those addresses. Double-check them and try again."}
            </p>
          </Card>
        )}

        {/* Active incidents feed */}
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
            the map itself is OpenStreetMap tiles — no Google Maps billing, no
            API key required.
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
                a: "RoutePulse layers an AI explanation on top of live incident data along your route, calling out closures, crashes, and hazards that may not have propagated to mainstream traffic apps yet.",
              },
              {
                q: "Do I need an account or API key to use RoutePulse?",
                a: "No. It's built on free, open infrastructure — OpenStreetMap for geocoding and the map, OSRM for routing, and free-tier AI models for the explanation. Enter an origin and destination and get a scored route immediately.",
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
