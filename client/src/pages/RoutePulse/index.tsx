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
  useMapEvents,
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
  Share2,
  MapPin,
  ArrowLeftRight,
  History,
  X,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Clock,
  RefreshCw,
  Star,
  Copy,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useRecentRoutes } from "@/hooks/useRecentRoutes";

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
 *
 * v4 driver tools (all client-side, still zero API key):
 *   - Arrive-by leave-time planner with a per-incident risk buffer
 *   - Tappable route comparison (distance / time / incidents per option)
 *   - Voice address entry (Web Speech API) inside AddressInput
 *   - Live incident auto-refresh with an "updated Xs ago" pulse
 *   - One-tap plain-text trip summary for SMS/dispatch
 *   - Starred saved routes (localStorage, cross-tab synced)
 *
 * v5 (AI layer v2, server-driven):
 *   - 0-100 risk meter per route, computed server-side (deterministic,
 *     severity-weighted) with a local fallback for pre-v5 cached responses
 *   - Estimated delay minutes per route option in the comparison strip
 *   - Leave-by buffer now uses the server's delay estimate, not a
 *     client-side lookup table
 *   - AI confidence chip on the explanation (high/medium/low)
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
      {
        "@type": "Question",
        name: "Can RoutePulse tell me when to leave?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Set an arrive-by time and RoutePulse computes a leave-by time from the live route duration plus a risk buffer sized by the severity of incidents currently on your route — so a crash on your path adds real minutes, not just a red pin.",
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

// Minutes of buffer each incident severity adds to the leave-by estimate.
// Fallback only — v5+ responses carry a server-computed delayEstimateMin
// (same numbers, computed in routePulse.service.ts) which takes precedence.
const RISK_BUFFER_MIN: Record<string, number> = {
  minor: 2,
  moderate: 5,
  major: 10,
  critical: 15,
};

// Mirrors SEVERITY_RISK_WEIGHT in server/routers/routePulse/
// routePulse.service.ts — used only to score pre-v5 cached responses
// (2-min TTL) that predate server-computed riskScore.
const LOCAL_RISK_WEIGHT: Record<string, number> = {
  minor: 3,
  moderate: 8,
  major: 20,
  critical: 40,
};

const fmtTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

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

/**
 * Handles map clicks for reverse-geocoding origin/destination.
 * Clicking the map when an input is empty sets that point via reverse geocode.
 */
function MapClickHandler({
  onSetAddress,
  disabled,
}: {
  onSetAddress: (address: string) => void;
  disabled?: boolean;
}) {
  useMapEvents({
    click: async e => {
      if (disabled) return;
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          {
            headers: {
              "User-Agent": "UnifyOne-RoutePulse/1.0 (+https://1commerce.online)",
              Accept: "application/json",
            },
          }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { display_name?: string };
        if (data.display_name) {
          onSetAddress(data.display_name);
          toast.success("Location set from map click");
        }
      } catch {
        // silent — map click is a convenience, not a hard dependency
      }
    },
  });
  return null;
}

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
  // v4: arrive-by planner + alternative-route preview on the map.
  const [arriveBy, setArriveBy] = useState("");
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  // Ticker so the "updated Xs ago" live indicator stays honest.
  const [nowTick, setNowTick] = useState(0);

  // Read permalink params on mount so shared routes load immediately.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlOrigin = params.get("origin");
    const urlDestination = params.get("destination");
    if (urlOrigin) setOrigin(urlOrigin);
    if (urlDestination) setDestination(urlDestination);
    // Auto-submit if both are present and valid.
    if (urlOrigin && urlDestination) {
      if (urlOrigin.trim().length >= 3 && urlDestination.trim().length >= 3) {
        setSubmitted({
          origin: urlOrigin.trim(),
          destination: urlDestination.trim(),
        });
      }
    }
  }, []);

  // Update URL when a route is submitted so the link is shareable.
  useEffect(() => {
    if (!submitted) {
      // Clear params when there's no active route.
      if (window.location.search) {
        window.history.replaceState(
          {},
          "",
          window.location.pathname
        );
      }
      return;
    }
    const params = new URLSearchParams();
    params.set("origin", submitted.origin);
    params.set("destination", submitted.destination);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [submitted]);

  // A new search resets the alternative-route preview back to the
  // AI-recommended route.
  useEffect(() => {
    setPreviewIdx(null);
  }, [submitted]);

  // 10s ticker for the "updated Xs ago" freshness label.
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(t => t + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

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
  // Incidents auto-refresh every 60s — the map layer and the feed below it
  // stay live without a reload, which matters when the page sits open on a
  // phone mounted in a car.
  const incidentsQuery = trpc.routePulse.listIncidents.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const { recent, starred, addRoute, clearRoutes, starRoute, unstarRoute } =
    useRecentRoutes();

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleShareRoute = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Route link copied to clipboard");
    } catch {
      toast.error("Couldn't copy link — copy the URL manually");
    }
  };

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
    addRoute(origin.trim(), destination.trim());
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

  // Every scored route (the server returns the full set, including the one
  // it picked) so the comparison cards and the dashed alternates layer can
  // both reason about distance / duration / incidents per option.
  const allRoutes = useMemo(
    () => routeQuery.data?.alternatives ?? [],
    [routeQuery.data]
  );

  // The AI-chosen route inside `alternatives` — matched on the distance /
  // duration pair, which is unique per OSRM route in practice.
  const chosenIdx = useMemo(() => {
    if (!routeQuery.data) return -1;
    const { route } = routeQuery.data;
    return allRoutes.findIndex(
      a => a.distance === route.distance && a.duration === route.duration
    );
  }, [routeQuery.data, allRoutes]);

  // Which route is drawn solid on the map right now — the previewed
  // alternative if the driver tapped one, otherwise the recommended route.
  const displayedIdx = previewIdx ?? (chosenIdx >= 0 ? chosenIdx : null);

  const displayedLine: LatLngExpression[] | null = useMemo(() => {
    if (displayedIdx === null || previewIdx === null) return routeLine;
    const geometry = allRoutes[displayedIdx]?.geometry as
      | { coordinates: [number, number][] }
      | undefined;
    if (!geometry?.coordinates?.length) return routeLine;
    return geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as LatLngExpression
    );
  }, [displayedIdx, previewIdx, allRoutes, routeLine]);

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

  // Risk: prefer the server's deterministic 0-100 score (v5+). Pre-v5
  // cached responses (2-min TTL) lack it — fall back to the same weights
  // computed locally so the meter never disappears mid-rollout.
  const riskInfo = useMemo(() => {
    if (!routeQuery.data) return null;
    const route = routeQuery.data.route;
    const localScore = Math.min(
      100,
      route.incidents.reduce(
        (sum, i) => sum + (LOCAL_RISK_WEIGHT[i.severity] ?? 3),
        0
      )
    );
    const score = (route.riskScore as number | undefined) ?? localScore;
    const level =
      score >= 40
        ? ("critical" as const)
        : score >= 20
          ? ("high" as const)
          : score >= 8
            ? ("moderate" as const)
            : ("low" as const);
    const label =
      level === "critical"
        ? "Critical Risk"
        : level === "high"
          ? "High Risk"
          : level === "moderate"
            ? "Moderate Risk"
            : "Low Risk";
    return { score, level, label };
  }, [routeQuery.data]);

  // Server-reported AI confidence on the route pick (v5+). "none" (or a
  // missing field on pre-v5 cached responses) means the deterministic
  // fallback picked the route — we don't badge those.
  const aiConfidence =
    ((routeQuery.data?.confidence as string | undefined) ?? "none") as
      | "high"
      | "medium"
      | "low"
      | "none";

  // Arrive-by planner: leave-by = arrival time minus drive time minus the
  // server's estimated incident delay (falls back to the local severity
  // table for pre-v5 cached responses). The buffer is the differentiator —
  // Google adjusts for traffic; we adjust for the specific crash/closure
  // on your path and say so in plain English.
  const leaveByInfo = useMemo(() => {
    if (!routeQuery.data || !arriveBy) return null;
    const [h, m] = arriveBy.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    const arrive = new Date();
    arrive.setHours(h, m, 0, 0);
    // If the arrival time already passed today, the driver almost
    // certainly means tomorrow (e.g. planning tonight for a morning shift).
    if (arrive.getTime() < Date.now()) {
      arrive.setDate(arrive.getDate() + 1);
    }
    const localBuffer = routeQuery.data.route.incidents.reduce(
      (sum, i) => sum + (RISK_BUFFER_MIN[i.severity] ?? 2),
      0
    );
    const bufferMin =
      (routeQuery.data.route.delayEstimateMin as number | undefined) ??
      localBuffer;
    const driveMin = routeQuery.data.route.duration / 60;
    const leave = new Date(arrive.getTime() - (driveMin + bufferMin) * 60_000);
    return { leave, bufferMin };
  }, [routeQuery.data, arriveBy]);

  const currentIsStarred =
    !!submitted &&
    starred.some(
      s => s.origin === submitted.origin && s.destination === submitted.destination
    );

  const handleToggleStar = () => {
    if (!submitted) return;
    if (currentIsStarred) {
      unstarRoute(submitted.origin, submitted.destination);
      toast.success("Removed from saved routes");
    } else {
      starRoute(submitted.origin, submitted.destination);
      toast.success("Route saved — find it above the search box");
    }
  };

  // Plain-text trip summary for SMS / dispatch apps — one tap, no account.
  const handleCopySummary = async () => {
    if (!routeQuery.data) return;
    const d = routeQuery.data;
    const miles = (d.route.distance / 1609.34).toFixed(1);
    const mins = Math.round(d.route.duration / 60);
    const lines = [
      `RoutePulse: ${d.origin.displayName.split(",")[0]} → ${d.destination.displayName.split(",")[0]}`,
      `${miles} mi · ~${mins} min · ${d.route.incidents.length} incident${d.route.incidents.length === 1 ? "" : "s"}${riskInfo ? ` (${riskInfo.label}, ${riskInfo.score}/100)` : ""}`,
    ];
    if (leaveByInfo) {
      lines.push(
        `Leave by ${fmtTime(leaveByInfo.leave)}${leaveByInfo.bufferMin > 0 ? ` (incl. +${leaveByInfo.bufferMin} min incident buffer)` : ""}`
      );
    }
    for (const inc of d.route.incidents.slice(0, 3)) {
      lines.push(
        `⚠ ${inc.road_name ? `${inc.road_name}: ` : ""}${inc.description ?? inc.incident_type}`
      );
    }
    lines.push(window.location.href);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Trip summary copied — paste it anywhere");
    } catch {
      toast.error("Couldn't copy summary — try the Share button instead");
    }
  };

  const hasRoute = !!(submitted && routeQuery.data);

  // "Updated Xs ago" for the live indicator. nowTick is referenced so the
  // 10s interval re-renders this label even when no query has refetched.
  const updatedAgoSec =
    nowTick >= 0 && incidentsQuery.dataUpdatedAt
      ? Math.max(0, Math.round((Date.now() - incidentsQuery.dataUpdatedAt) / 1000))
      : null;

  return (
    <>
      <PageHead
        title={
          hasRoute
            ? `${routeQuery.data!.origin.displayName.split(",")[0]} → ${routeQuery.data!.destination.displayName.split(",")[0]} | RoutePulse`
            : "RoutePulse — Free AI Route & Incident Checker | UnifyOne"
        }
        description={
          hasRoute
            ? `Route from ${routeQuery.data!.origin.displayName} to ${routeQuery.data!.destination.displayName}: ${routeQuery.data!.route.incidents.length} incident${routeQuery.data!.route.incidents.length === 1 ? "" : "s"} reported. ${routeQuery.data!.explanation}`
            : "Free tool for gig drivers: check a route for live incidents and get an AI explanation of what to watch for before you drive. No account required, built on OpenStreetMap."
        }
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
              <MapClickHandler
                onSetAddress={addr => {
                  if (!origin.trim()) {
                    setOrigin(addr);
                  } else if (!destination.trim()) {
                    setDestination(addr);
                  } else {
                    // Both filled — set destination and let user decide
                    setDestination(addr);
                  }
                }}
                disabled={routeQuery.isFetching}
              />

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
                  {displayedLine && (
                    <Polyline
                      positions={displayedLine}
                      pathOptions={{
                        color: "#3b82f6",
                        weight: 5,
                        opacity: 0.9,
                      }}
                    />
                  )}
                  {/* Alternative routes — lighter, dashed lines. The route
                      currently displayed solid is skipped so the chosen
                      route isn't double-drawn. */}
                  {allRoutes.map((alt, idx) => {
                      if (idx === displayedIdx) return null;
                      const coords = (alt.geometry as {
                        coordinates: [number, number][];
                      })?.coordinates;
                      if (!coords?.length) return null;
                      return (
                        <Polyline
                          key={`alt-${idx}`}
                          positions={coords.map(
                            ([lng, lat]) => [lat, lng] as LatLngExpression
                          )}
                          pathOptions={{
                            color: "#94a3b8",
                            weight: 3,
                            opacity: 0.6,
                            dashArray: "6, 8",
                          }}
                        />
                      );
                    })}
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
              {/* Saved routes — driver-pinned favorites, always on top */}
              {!hasRoute && starred.length > 0 && (
                <div className="mb-3 pb-3 border-b border-border/50">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    Saved
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {starred.map((r, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-yellow-500/10 border border-yellow-500/20 max-w-full"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOrigin(r.origin);
                            setDestination(r.destination);
                            setSubmitted({
                              origin: r.origin,
                              destination: r.destination,
                            });
                          }}
                          className="text-[11px] pl-2 py-1 hover:text-foreground transition-colors truncate"
                          title={`${r.origin} → ${r.destination}`}
                        >
                          {r.origin.slice(0, 18)}
                          {r.origin.length > 18 ? "…" : ""} →{" "}
                          {r.destination.slice(0, 18)}
                          {r.destination.length > 18 ? "…" : ""}
                        </button>
                        <button
                          type="button"
                          onClick={() => unstarRoute(r.origin, r.destination)}
                          className="px-1.5 py-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove saved route"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Recent routes — one-tap re-check, no typing on mobile */}
              {!hasRoute && recent.length > 0 && (
                <div className="mb-3 pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Recent
                    </span>
                    <button
                      type="button"
                      onClick={clearRoutes}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setOrigin(r.origin);
                          setDestination(r.destination);
                          setSubmitted({
                            origin: r.origin,
                            destination: r.destination,
                          });
                        }}
                        className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-accent transition-colors truncate max-w-full"
                        title={`${r.origin} → ${r.destination}`}
                      >
                        {r.origin.slice(0, 18)}
                        {r.origin.length > 18 ? "…" : ""} →{" "}
                        {r.destination.slice(0, 18)}
                        {r.destination.length > 18 ? "…" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

                {/* Swap button — mobile-optimized touch target */}
                <button
                  type="button"
                  onClick={handleSwap}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  title="Swap origin and destination"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Swap origin & destination
                </button>

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

            {/* Floating hint */}
            <div className="hidden sm:flex absolute z-[400] bottom-12 left-4 items-center gap-1.5 rounded-md bg-background/80 backdrop-blur-sm border shadow px-2 py-1 text-[10px] text-muted-foreground">
              <MapPin className="w-3 h-3" />
              Click map to set location
            </div>

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
              {riskInfo && (
                <Badge
                  variant="outline"
                  className={
                    riskInfo.level === "low"
                      ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                      : riskInfo.level === "moderate"
                        ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                        : riskInfo.level === "high"
                          ? "border-orange-500/30 text-orange-600 bg-orange-500/10"
                          : "border-red-500/30 text-red-600 bg-red-500/10"
                  }
                >
                  {riskInfo.level === "low" ? (
                    <ShieldCheck className="w-3 h-3 mr-1" />
                  ) : riskInfo.level === "critical" ? (
                    <ShieldAlert className="w-3 h-3 mr-1" />
                  ) : (
                    <Shield className="w-3 h-3 mr-1" />
                  )}
                  {riskInfo.label}
                </Badge>
              )}
              {routeQuery.data!.cached && (
                <Badge variant="outline" className="text-muted-foreground">
                  cached
                </Badge>
              )}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleToggleStar}
                  title={
                    currentIsStarred
                      ? "Remove from saved routes"
                      : "Save this route"
                  }
                >
                  <Star
                    className={`w-4 h-4 ${currentIsStarred ? "fill-yellow-400 text-yellow-400" : ""}`}
                  />
                  {currentIsStarred ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleCopySummary}
                  title="Copy a plain-text trip summary (great for SMS)"
                >
                  <Copy className="w-4 h-4" />
                  Summary
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleShareRoute}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>

            {/* 0-100 risk meter — a number a driver can compare across
                routes, not just a color. Google shows a red line; we show
                *how much* risk, and why. */}
            {riskInfo && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      riskInfo.level === "low"
                        ? "bg-emerald-500"
                        : riskInfo.level === "moderate"
                          ? "bg-amber-500"
                          : riskInfo.level === "high"
                            ? "bg-orange-500"
                            : "bg-red-600"
                    }`}
                    style={{ width: `${Math.max(riskInfo.score, 2)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  Risk {riskInfo.score}/100
                </span>
              </div>
            )}

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
            <div className="pt-2 border-t space-y-1.5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {routeQuery.data!.explanation}
              </p>
              {aiConfidence !== "none" && (
                <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  AI route pick · {aiConfidence} confidence
                </p>
              )}
            </div>

            {/* Arrive-by planner — leave-time with an incident-sized buffer */}
            <div className="flex items-center gap-2 flex-wrap pt-4 border-t">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <label
                htmlFor="routepulse-arrive-by"
                className="text-xs font-medium text-muted-foreground"
              >
                Arrive by
              </label>
              <input
                id="routepulse-arrive-by"
                type="time"
                value={arriveBy}
                onChange={e => setArriveBy(e.target.value)}
                className="rounded-md border bg-background px-2 py-1 text-sm"
              />
              {leaveByInfo && (
                <span className="text-sm font-semibold">
                  Leave by {fmtTime(leaveByInfo.leave)}
                  {leaveByInfo.bufferMin > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      (+{leaveByInfo.bufferMin} min buffer for{" "}
                      {routeQuery.data!.route.incidents.length} incident
                      {routeQuery.data!.route.incidents.length === 1 ? "" : "s"})
                    </span>
                  )}
                </span>
              )}
              {!leaveByInfo && (
                <span className="text-xs text-muted-foreground">
                  and we'll tell you when to leave — buffer included
                </span>
              )}
            </div>

            {/* Route comparison — every scored option, tappable to preview
                its geometry on the map. */}
            {allRoutes.length > 1 && (
              <div className="pt-4 border-t space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                  <RouteIcon className="w-3.5 h-3.5" />
                  Compare routes
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {allRoutes.map((alt, i) => {
                    const isChosen = i === chosenIdx;
                    const isDisplayed = i === displayedIdx;
                    const delayMin =
                      (alt.delayEstimateMin as number | undefined) ?? 0;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewIdx(isChosen ? null : i)}
                        className={`shrink-0 min-w-[132px] rounded-lg border px-3 py-2 text-left transition-colors ${
                          isDisplayed
                            ? "border-blue-500/50 bg-blue-500/10"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          Route {i + 1}
                          {isChosen && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 border-primary/40 text-primary"
                            >
                              Recommended
                            </Badge>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {(alt.distance / 1609.34).toFixed(1)} mi ·{" "}
                          {Math.round(alt.duration / 60)} min
                        </span>
                        <span
                          className={`block text-[11px] mt-0.5 ${
                            alt.incidents.length > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {alt.incidents.length === 0
                            ? "No incidents"
                            : `${alt.incidents.length} incident${alt.incidents.length === 1 ? "" : "s"}`}
                          {delayMin > 0 && ` · est. +${delayMin} min`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {previewIdx !== null && (
                  <p className="text-[11px] text-muted-foreground">
                    Previewing Route {previewIdx + 1} on the map — tap
                    Recommended to switch back. Stats above are still for the
                    recommended route.
                  </p>
                )}
              </div>
            )}

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
          <div className="flex items-center justify-between gap-2 mb-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Active incidents (Oregon / SW Washington)
            </p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>
                Live
                {updatedAgoSec !== null &&
                  ` · updated ${updatedAgoSec < 5 ? "just now" : `${updatedAgoSec}s ago`}`}
              </span>
              <button
                type="button"
                onClick={() => incidentsQuery.refetch()}
                title="Refresh incidents now"
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
              >
                <RefreshCw
                  className={`w-3 h-3 ${incidentsQuery.isRefetching ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
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
            checks live incident feeds along your route, scores every option
            0-100 by incident severity, and uses AI to explain what's actually
            happening — not just a red line on a map.
          </p>
          <p>
            Set an arrive-by time and RoutePulse tells you when to leave,
            padding the estimate by the delay your route's incidents are
            expected to cost. Compare every route option side by side with
            estimated delay minutes, speak your addresses instead of typing,
            and copy a plain-text trip summary for dispatch — all without an
            account.
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
                q: "Can RoutePulse tell me when to leave?",
                a: "Yes. Set an arrive-by time on any scored route and you'll get a leave-by time that includes a buffer sized by the severity of incidents currently on your route — a crash or closure adds real minutes, not just a warning pin.",
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
