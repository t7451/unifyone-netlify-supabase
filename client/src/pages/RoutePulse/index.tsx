import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Navigation, Loader2 } from "lucide-react";

/**
 * RoutePulse — hyperlocal route intelligence.
 *
 * MVP scope (per PLAN): plain input → AI-scored route + explanation +
 * active incident list. No turn-by-turn, no map yet — validate the core
 * thesis (does the AI catch incidents Google Maps hasn't surfaced?)
 * before investing in a map layer.
 */

type Coords = { lat: string; lng: string };

function parseCoords(c: Coords): { lat: number; lng: number } | null {
  const lat = parseFloat(c.lat);
  const lng = parseFloat(c.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

const SEVERITY_COLOR: Record<string, string> = {
  minor: "text-yellow-400",
  moderate: "text-orange-400",
  major: "text-red-400",
  critical: "text-red-600",
};

export default function RoutePulse() {
  const [origin, setOrigin] = useState<Coords>({ lat: "", lng: "" });
  const [destination, setDestination] = useState<Coords>({ lat: "", lng: "" });
  const [submitted, setSubmitted] = useState<{
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  } | null>(null);

  const routeQuery = trpc.routePulse.getRoute.useQuery(submitted!, {
    enabled: !!submitted,
  });
  const incidentsQuery = trpc.routePulse.listIncidents.useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const o = parseCoords(origin);
    const d = parseCoords(destination);
    if (!o || !d) return;
    setSubmitted({ origin: o, destination: d });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Navigation className="w-6 h-6" />
          RoutePulse
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Routes that read the news so you don't have to — AI-scored
          alternatives that factor in incidents before they hit mainstream
          traffic apps.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">Origin</p>
          <div className="flex gap-2">
            <Input
              placeholder="Lat"
              value={origin.lat}
              onChange={e => setOrigin({ ...origin, lat: e.target.value })}
            />
            <Input
              placeholder="Lng"
              value={origin.lng}
              onChange={e => setOrigin({ ...origin, lng: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">Destination</p>
          <div className="flex gap-2">
            <Input
              placeholder="Lat"
              value={destination.lat}
              onChange={e =>
                setDestination({ ...destination, lat: e.target.value })
              }
            />
            <Input
              placeholder="Lng"
              value={destination.lng}
              onChange={e =>
                setDestination({ ...destination, lng: e.target.value })
              }
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" className="gap-2">
            {routeQuery.isFetching && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Find route
          </Button>
        </div>
      </form>

      {submitted && routeQuery.data && (
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-semibold text-white">
              {(routeQuery.data.route.distance / 1609.34).toFixed(1)} mi ·{" "}
              {Math.round(routeQuery.data.route.duration / 60)} min
            </p>
            {routeQuery.data.cached && (
              <span className="text-xs text-slate-500">cached</span>
            )}
          </div>
          <p className="text-sm text-slate-300">
            {routeQuery.data.explanation}
          </p>

          {routeQuery.data.route.incidents.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-xs uppercase text-slate-500 tracking-wide">
                Incidents on this route
              </p>
              {routeQuery.data.route.incidents.map(inc => (
                <div key={inc.id} className="flex items-start gap-2 text-sm">
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      SEVERITY_COLOR[inc.severity] ?? "text-slate-400"
                    }`}
                  />
                  <span className="text-slate-300">
                    {inc.road_name && (
                      <span className="font-medium">{inc.road_name}: </span>
                    )}
                    {inc.description ?? inc.incident_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {routeQuery.isError && (
        <p className="text-sm text-red-400">
          Couldn't find a route between those points. Double-check the
          coordinates and try again.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase text-slate-500 tracking-wide">
          Active incidents (Oregon / SW Washington)
        </p>
        {incidentsQuery.data?.length ? (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {incidentsQuery.data.map(inc => (
              <div
                key={inc.id as string}
                className="flex items-start gap-2 text-sm text-slate-400"
              >
                <AlertTriangle
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    SEVERITY_COLOR[inc.severity as string] ?? "text-slate-500"
                  }`}
                />
                <span>
                  {inc.road_name ? `${inc.road_name} — ` : ""}
                  {(inc.description as string) ?? (inc.incident_type as string)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No active incidents reported.
          </p>
        )}
      </div>
    </div>
  );
}
