import { useState } from "react";
import { Link } from "wouter";
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
 * MVP scope (per PLAN): plain input -> AI-scored route + explanation +
 * active incident list. No turn-by-turn, no map yet -- validate the core
 * thesis (does the AI catch incidents Google Maps hasn't surfaced?)
 * before investing in a map layer.
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
        name: "Do I need an account to use RoutePulse?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. RoutePulse works with no account required — enter an origin and destination and get a scored route immediately.",
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

type Coords = { lat: string; lng: string };

function parseCoords(c: Coords): { lat: number; lng: number } | null {
  const lat = parseFloat(c.lat);
  const lng = parseFloat(c.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

const SEVERITY_BADGE: Record<string, string> = {
  minor:
    "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  moderate:
    "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400",
  major: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
  critical: "bg-red-600/20 text-red-800 border-red-600/40 dark:text-red-400",
};

export default function RoutePulse() {
  const [origin, setOrigin] = useState<Coords>({ lat: "", lng: "" });
  const [destination, setDestination] = useState<Coords>({ lat: "", lng: "" });
  const [submitted, setSubmitted] = useState<{
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const routeQuery = trpc.routePulse.getRoute.useQuery(submitted!, {
    enabled: !!submitted,
  });
  const incidentsQuery = trpc.routePulse.listIncidents.useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const o = parseCoords(origin);
    const d = parseCoords(destination);
    if (!o || !d) {
      setFormError(
        "Enter valid coordinates for both origin and destination (latitude -90 to 90, longitude -180 to 180)."
      );
      return;
    }
    setFormError(null);
    setSubmitted({ origin: o, destination: d });
    trackToolUsage("route-pulse", "start");
  };

  return (
    <>
      <PageHead
        title="RoutePulse — Free AI Route & Incident Checker | UnifyOne"
        description="Free tool for gig drivers: check a route for live incidents and get an AI explanation of what to watch for before you drive. No account required."
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
              Enter an origin and destination
            </strong>{" "}
            and get an AI-scored route with live incidents factored in — before
            they hit mainstream traffic apps.
          </p>
        </header>

        {/* Input card */}
        <Card className="p-6 sm:p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="w-3.5 h-3.5" /> Origin
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Latitude"
                    inputMode="decimal"
                    value={origin.lat}
                    onChange={e =>
                      setOrigin({ ...origin, lat: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Longitude"
                    inputMode="decimal"
                    value={origin.lng}
                    onChange={e =>
                      setOrigin({ ...origin, lng: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="w-3.5 h-3.5" /> Destination
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Latitude"
                    inputMode="decimal"
                    value={destination.lat}
                    onChange={e =>
                      setDestination({ ...destination, lat: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Longitude"
                    inputMode="decimal"
                    value={destination.lng}
                    onChange={e =>
                      setDestination({ ...destination, lng: e.target.value })
                    }
                  />
                </div>
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
            <p className="text-sm text-muted-foreground leading-relaxed">
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
              Couldn't find a route between those points. Double-check the
              coordinates and try again.
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
            checks live incident feeds along your route and uses AI to explain
            what's actually happening — not just a red line on a map.
          </p>
          <p>
            This is an early, intentionally simple version: enter coordinates,
            get a scored route and an explanation. A full map view and
            turn-by-turn are on the roadmap once the core idea proves out.
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
                q: "Do I need an account to use RoutePulse?",
                a: "No. It works with no account required — enter an origin and destination and get a scored route immediately.",
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
