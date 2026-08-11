/// <reference types="leaflet.markercluster" />
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  Circle,
  ScaleControl,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type LatLngExpression, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
// v17: marker clustering for the pre-search "every active incident/camera"
// layer — see NOTE FOR KIMI near MapClusterGroup below for why this was
// needed (unclustered map with statewide feeds gets unusable fast).
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useTheme } from "@/contexts/ThemeContext";
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
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  Undo2,
  RotateCw,
  List,
  ChevronUp,
  Pencil,
  Radio,
  Play,
  Square,
  Timer,
  WifiOff,
  Lightbulb,
  Volume2,
  VolumeX,
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
 *
 * v6 (data streams + camera layer):
 *   - Live camera pins: every known ODOT traffic camera before a search,
 *     cameras along the recommended route after it, with live snapshots in
 *     the popups
 *   - Source chips (ODOT / 511 / NWS / WSDOT / News) on incident rows so
 *     the multi-agency aggregation is visible at a glance
 *   - Optional Cloudflare camera proxy (VITE_ROUTEPULSE_CAM_PROXY) so
 *     TripCheck stills load without exposing the subscription key
 *
 * v7 (realtime location + smoothness):
 *   - Live location tracking: one click starts watchPosition with an
 *     accuracy ring; the blue dot follows you in follow-me mode, any map
 *     drag detaches follow (Google Maps behavior), click again to
 *     re-center, click once more to stop
 *   - "Use current location as origin" — one-tap reverse-geocoded origin
 *     for the most common gig-driver flow (route from where I am now)
 *   - Scale bar, fly-to-bounds animations, finer zoom snapping
 *   - Auto-fit no longer yanks the map: once you've panned manually, the
 *     60s incident refresh leaves your viewport alone until the next search
 *
 * v8 (turn-by-turn + traffic-colored route + heading):
 *   - Turn-by-turn maneuver list (OSRM steps=true, server-extracted):
 *     per-step instructions with icons, distances, and tap-to-fly-to on
 *     the map — the last big Google Maps parity gap, closed
 *   - Congestion-colored route: the displayed route is drawn per step and
 *     colored by that step's implied speed vs the route average (blue /
 *     amber / red) — a free, keyless stand-in for Google's traffic line
 *   - Heading cone on the live location dot (device heading when the
 *     browser provides it, otherwise computed from successive fixes)
 *
 * v9 (mobile optimization suite):
 *   - Search card auto-collapses into a one-line chip once a route is on
 *     the map (tap to edit) — the map is the product on a phone
 *   - Mobile bottom bar with distance / time / risk + a turn-by-turn
 *     bottom sheet, so drivers never scroll off the map to read steps
 *   - Floating controls move to the thumb zone (bottom-right), bigger
 *     touch targets, safe-area aware; Leaflet +/- zoom hidden on touch
 *     (pinch is the norm); 70dvh map height tracks mobile browser chrome
 *   - 16px inputs on mobile (no iOS focus auto-zoom), bigger suggestion
 *     tap targets (AddressInput)
 *
 * v10b (AI grounding UI — TomTom Traffic + Waze, server shipped in v10):
 *   - TomTom/Waze source labels on incident rows
 *   - "Grounded with live TomTom + Waze data" chip when live third-party
 *     grounding fed the route pick
 *
 * v11 (trip mode + resilience):
 *   - Trip mode: "Start trip" turns the live location feed into
 *     navigation-lite — a top banner shows the next maneuver with live
 *     distance-to-turn and auto-advances as you drive (Google Maps
 *     guidance behavior without the SDK)
 *   - Live leave-by countdown chip ("Leave in 12 min") that ticks with
 *     the 10s clock and flags when it's time to go
 *   - Offline fallback: the last successful route result is kept in
 *     localStorage; if a lookup fails (dead zone), the last result's key
 *     stats stay visible instead of just an error
 *   - "/" keyboard shortcut focuses the origin field on desktop
 *
 * v12 (route-choice quality):
 *   - AI "avoid" verdicts on each non-recommended route in the comparison
 *     strip — not just what we picked, but why the others lose
 *   - Wait-or-go advisor: when the chosen route's severe incidents have an
 *     estimated clear time inside 90 minutes, a chip suggests waiting
 *     ("crash on I-5 clears by 3:20 PM, saves ~15 min")
 *   - Rush-hour weighting note on the risk meter when scores were computed
 *     under weekday peak conditions
 *
 * v13 (trip-mode awareness + departure outlook):
 *   - Voice prompts in trip mode: the next maneuver is spoken aloud when
 *     it becomes active (Web Speech API, mute toggle persisted)
 *   - Live speed + ETA in the trip banner, computed from your actual GPS
 *     speed (falls back to route average when stationary)
 *   - Proximity alerts: one-time warning when you come within ~500m of an
 *     incident on your route during trip mode
 *   - Departure outlook strip: projected delay leaving now vs +15/+30/+60
 *     min, best horizon highlighted (server-computed from incident clear
 *     estimates)
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
// v17: severity used to only change color, all four pins were the same
// 14px dot — on a busy map a critical closure looked exactly as loud as a
// minor hazard. Real map apps (Google/Waze included) size-code severity
// too; critical also gets a soft pulsing ring so it's findable at a
// glance even in a cluttered view, matching the same pulse language
// already used for the live user-location dot elsewhere on this map.
const INCIDENT_ICON_SIZE: Record<string, number> = {
  minor: 12,
  moderate: 15,
  major: 18,
  critical: 20,
};
const INCIDENT_ICONS: Record<string, L.DivIcon> = Object.fromEntries(
  Object.entries(INCIDENT_ICON_COLOR).map(([severity, color]) => {
    const size = INCIDENT_ICON_SIZE[severity] ?? 14;
    if (severity === "critical") {
      const ringSize = size + 12;
      return [
        severity,
        L.divIcon({
          className: "",
          html: `<div style="position:relative;width:${ringSize}px;height:${ringSize}px;display:flex;align-items:center;justify-content:center">
            <div class="animate-ping" style="position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:0.45"></div>
            <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.35)"></div>
          </div>`,
          iconSize: [ringSize, ringSize],
          iconAnchor: [ringSize / 2, ringSize / 2],
        }),
      ];
    }
    return [severity, pinIcon(color, size)];
  })
);

// v6: traffic camera layer.
// Optional Cloudflare camera proxy (workers/routepulse-cam-proxy) — when
// set, camera stills load through it so the ODOT TripCheck subscription key
// stays server-side. When unset we load the stills directly (works for the
// camera hosts that don't require the key header).
const CAM_PROXY: string =
  (import.meta.env.VITE_ROUTEPULSE_CAM_PROXY as string | undefined) ?? "";

function camImg(url: string | null | undefined): string | null {
  if (!url) return null;
  return CAM_PROXY ? `${CAM_PROXY}/img?u=${encodeURIComponent(url)}` : url;
}

const CAMERA_ICON = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#7c3aed;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1">📷</div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// v17: cluster bubble icons for the pre-search "every active incident/
// camera" layers (see MarkerClusterGroup usage below). Incident clusters
// take the color of the worst severity inside them, so a cluster hiding a
// critical incident still reads as urgent at a glance instead of looking
// like an ordinary gray blob.
const SEVERITY_RANK: Record<string, number> = {
  critical: 3,
  major: 2,
  moderate: 1,
  minor: 0,
};
function clusterBubble(count: number, color: string, size: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:${size > 40 ? 13 : 11}px;font-family:inherit">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
function incidentClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  let worst = "minor";
  for (const m of cluster.getAllChildMarkers()) {
    // markers were built with pinIcon()/INCIDENT_ICONS above, which don't
    // carry severity as marker data — options.icon identity is the
    // cheapest way back to it without threading extra state through
    // react-leaflet's Marker props.
    const icon = (m as L.Marker).options.icon;
    const entry = Object.entries(INCIDENT_ICONS).find(([, i]) => i === icon);
    const sev = entry?.[0] ?? "minor";
    if ((SEVERITY_RANK[sev] ?? 0) > (SEVERITY_RANK[worst] ?? 0)) worst = sev;
  }
  const size = count >= 25 ? 44 : count >= 10 ? 38 : 32;
  return clusterBubble(count, INCIDENT_ICON_COLOR[worst] ?? "#eab308", size);
}
function cameraClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count >= 25 ? 40 : count >= 10 ? 34 : 28;
  return clusterBubble(count, "#7c3aed", size);
}

// Human labels for the incident feed sources (migration 0053 widened the
// source set to include NWS + WSDOT).
const SOURCE_LABEL: Record<string, string> = {
  odot_tripcheck: "ODOT",
  road511: "511",
  nws: "NWS",
  wsdot: "WSDOT",
  news_ai: "News",
  user_report: "Report",
  tomtom: "TomTom",
  // v16: was "waze" — corrected to match what's actually being called
  // (OpenWebNinja's Google Maps Traffic Alerts product, not Waze; see the
  // NOTE FOR KIMI in server/routers/routePulse/externalGrounding.ts).
  // Keeping the old "waze" key mapped too in case a cached/offline
  // snapshot from before this fix still has it.
  gmaps_traffic: "Google Maps",
  waze: "Google Maps",
};

function sourceLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  return SOURCE_LABEL[source] ?? null;
}

// ---------------------------------------------------------------------------
// v14: mobile bottom-sheet intelligence summary
// ---------------------------------------------------------------------------

const SEVERITY_ORDER = ["critical", "major", "moderate", "minor"] as const;

/**
 * NOTE FOR KIMI: this is the single source of truth for the one-line
 * "glanceable" summary shown at the top of the mobile bottom sheet (v14)
 * AND anywhere else on mobile that needs a plain-English gist of a route's
 * risk instead of a table. Keep this pure (no hooks, no DOM) so it stays
 * trivially testable — it's called from a useMemo in the component, not
 * itself a hook. If you add a new incident field that should influence the
 * sentence (e.g. an ETA-to-clear time from a future TomTom/Waze field),
 * extend the params object rather than reaching for component state here.
 */
function getMobileSummary(params: {
  incidents: Array<{
    severity: "minor" | "moderate" | "major" | "critical";
    road_name?: string | null;
  }>;
  leaveNowDelayMin?: number | null;
}): string {
  const { incidents, leaveNowDelayMin } = params;
  const delay =
    typeof leaveNowDelayMin === "number" && leaveNowDelayMin > 0
      ? leaveNowDelayMin
      : null;

  if (incidents.length === 0) {
    return delay
      ? `Route is clear, but expect about ${delay} min of general slowdown.`
      : "Route is clear — no active incidents.";
  }

  const worst = incidents.reduce((w, i) =>
    SEVERITY_ORDER.indexOf(i.severity) < SEVERITY_ORDER.indexOf(w.severity)
      ? i
      : w
  );
  const near = worst.road_name ? ` near ${worst.road_name}` : "";
  const delayText = delay ? `, ~${delay} min delay expected` : "";
  const noun = incidents.length === 1 ? "incident" : "incidents";
  return `${incidents.length} ${noun} detected${near}${delayText}.`;
}

// ---------------------------------------------------------------------------
// v8: turn-by-turn + congestion-colored route + heading cone
// ---------------------------------------------------------------------------

/** One driving step, as extracted server-side from OSRM `steps=true`. */
type ManeuverStep = {
  instruction: string;
  type: string;
  modifier: string | null;
  roadName: string | null;
  distanceM: number;
  durationS: number;
  location: [number, number];
  coordinates: [number, number][];
};

/** Icon for a maneuver — modifier checked before the generic type so
 *  "slight left" doesn't collapse into "left". */
function ManeuverGlyph({
  type,
  modifier,
}: {
  type: string;
  modifier: string | null;
}) {
  const cls = "w-4 h-4 shrink-0";
  if (type === "depart") return <Navigation className={cls} />;
  if (type === "arrive") return <MapPin className={cls} />;
  if (type.includes("roundabout") || type.includes("rotary")) {
    return <RotateCw className={cls} />;
  }
  const mod = modifier ?? "";
  if (mod.includes("uturn")) return <Undo2 className={cls} />;
  if (mod.includes("slight left")) return <ArrowUpLeft className={cls} />;
  if (mod.includes("slight right")) return <ArrowUpRight className={cls} />;
  if (mod.includes("left")) return <CornerUpLeft className={cls} />;
  if (mod.includes("right")) return <CornerUpRight className={cls} />;
  return <ArrowUp className={cls} />;
}

// Congestion colors: a step's implied speed (distance/duration) vs the
// route average. Blue = moving at/above average (the route's normal color,
// so ordinary segments don't change meaning), amber = slowed, red = crawl.
const CONGESTION_SLOW = "#f59e0b";

// v16: prefer the server's live-traffic-corrected duration (liveDurationS)
// for every driver-facing time display — that's the actual "are we better
// than Google Maps" number, since it's `duration` scaled by TomTom's
// measured current/free-flow ratio, not the static OSRM graph estimate.
// Falls back to raw `duration` for any cached/offline snapshot from
// before this field existed.
function displayDurationS(route: {
  duration: number;
  liveDurationS?: number;
}): number {
  return typeof route.liveDurationS === "number"
    ? route.liveDurationS
    : route.duration;
}
const CONGESTION_CRAWL = "#dc2626";
const ROUTE_BLUE = "#3b82f6";

/** Great-circle distance in meters between two lat/lng fixes. */
function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Compass bearing (0-360, 0 = north) from fix a to fix b. */
function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Direction-of-travel cone behind the blue dot (Google Maps style). The
 * triangle's apex sits at the dot and the cone widens in the heading
 * direction; the whole div rotates around the apex.
 */
function headingConeIcon(deg: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:36px solid rgba(37,99,235,0.30);transform:rotate(${deg}deg);transform-origin:50% 100%"></div>`,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
  });
}

/** Shared Nominatim reverse-geocoder — map clicks and the "use current
 *  location" button both resolve coordinates to an address through this. */
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
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
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

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
      const addr = await reverseGeocode(lat, lng);
      if (addr) {
        onSetAddress(addr);
        toast.success("Location set from map click");
      }
    },
  });
  return null;
}

/**
 * Any user-initiated drag: detaches follow-me mode (Google Maps behavior —
 * tracking continues, the locate button then offers one-tap re-center) and
 * suspends auto-fit so the periodic incident refresh can't yank the map
 * away from wherever the user is looking.
 */
function MapInteractionHandler({ onDrag }: { onDrag: () => void }) {
  useMapEvents({
    dragstart: () => onDrag(),
  });
  return null;
}

type ViewportBbox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

/**
 * v17: reports the current map viewport bounds (padded) so the always-on
 * incident/camera layer can be geofenced instead of pulling the whole
 * state — see server/routers/routePulse/index.ts's listIncidents/
 * listCameras bbox param. Debounced 500ms on moveend so a fast pan/zoom
 * sequence doesn't fire a query per frame, and padded 25% on every side
 * so incidents just outside the visible edge are already loaded before
 * they'd otherwise pop in in mid-pan.
 */
function MapViewportTracker({
  onChange,
}: {
  onChange: (bbox: ViewportBbox) => void;
}) {
  const map = useMap();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const report = () => {
    const b = map.getBounds().pad(0.25);
    onChange({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    });
  };

  useEffect(() => {
    // Initial viewport on mount — don't wait for the first pan/zoom.
    report();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useMapEvents({
    moveend: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(report, 500);
    },
  });

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return null;
}

/** Flies to the given bounds whenever they change — unless the user has
 *  taken manual control of the viewport (skipAutoFit), in which case the
 *  map stays put until the next search resets the flag. */
function FitBounds({
  bounds,
  skipAutoFit,
}: {
  bounds: LatLngBoundsExpression | null;
  skipAutoFit: React.MutableRefObject<boolean>;
}) {
  const map = useMap();
  useEffect(() => {
    if (bounds && !skipAutoFit.current) {
      map.flyToBounds(bounds, {
        padding: [48, 48],
        maxZoom: 15,
        duration: 0.8,
      });
    }
  }, [bounds, map, skipAutoFit]);
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
  // v17: was hardcoded to "light" regardless of the app's own theme — a
  // real inconsistency on a site whose default theme is dark (see
  // ThemeProvider defaultTheme="dark" in app/providers.tsx). Now the map
  // opens matching whatever theme the rest of the app is already in;
  // the floating toggle still overrides it independently per-map after
  // that, same as before.
  const { theme: appTheme } = useTheme();
  const [basemap, setBasemap] = useState<keyof typeof BASEMAPS>(appTheme);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  // v7: live tracking state. tracking = watchPosition active; follow = map
  // re-centers on each fix (detaches on user drag); accuracy in meters.
  const [tracking, setTracking] = useState(false);
  const [follow, setFollow] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  // v8: direction of travel for the heading cone (null when stationary).
  const [heading, setHeading] = useState<number | null>(null);
  // v4: arrive-by planner + alternative-route preview on the map.
  const [arriveBy, setArriveBy] = useState("");
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  // v8: turn-by-turn list collapsed by default (long routes = long lists).
  const [showSteps, setShowSteps] = useState(false);
  // v9: mobile chrome state. searchCollapsed = the floating search card
  // folds into a one-line chip once a route is displayed.
  const [searchCollapsed, setSearchCollapsed] = useState(false);
  // v14: replaces the old open/closed steps-only sheet with a persistent
  // peek/expanded bottom sheet (glanceable summary + cards always visible
  // at "peek"; turn-by-turn revealed on expand). See the sheet render block
  // below for the drag/tap interaction — NOTE FOR KIMI is there too.
  const [sheetExpanded, setSheetExpanded] = useState(false);
  // Ticker so the "updated Xs ago" live indicator stays honest.
  const [nowTick, setNowTick] = useState(0);
  // v10: location onboarding prompt. Shown once per browser (persisted) so
  // first-time drivers get a clear, tappable CTA to enable location instead
  // of having to notice the small floating locate button. Suppressed once
  // we already have a fix, once the user dismisses it, or once we know
  // permission was already denied (nagging a "denied" user is just noise).
  const [locationPromptDismissed, setLocationPromptDismissed] = useState(
    () => localStorage.getItem("routepulse:location-prompt-dismissed") === "1"
  );
  const [geoPermission, setGeoPermission] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");
  // v11: trip mode. tripActive = the guidance banner is live; nextStepIdx =
  // which maneuver we're driving toward (auto-advances as fixes come in).
  const [tripActive, setTripActive] = useState(false);
  const [nextStepIdx, setNextStepIdx] = useState(0);
  // v11: last successful route result, kept so a failed lookup (dead zone)
  // can still show the driver their most recent trip's key stats.
  const [lastResult, setLastResult] = useState<{
    originName: string;
    destinationName: string;
    distanceM: number;
    durationS: number;
    explanation: string;
    savedAt: number;
  } | null>(() => {
    try {
      const raw = localStorage.getItem("routepulse:last-result");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  // v13: trip-mode awareness. voiceMuted persists across sessions (some
  // drivers never want voice); speedMps is the live GPS speed for the ETA;
  // alertedRef remembers which on-route incidents already fired their
  // one-time proximity warning this trip.
  const [voiceMuted, setVoiceMuted] = useState(
    () => localStorage.getItem("routepulse:voice-muted") === "1"
  );
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const alertedRef = useRef<Set<string>>(new Set());

  // v17: real browser connectivity — deliberately distinct from the
  // existing error-triggered "Offline — showing your last checked route"
  // card above (routeQuery.isError && lastResult). That card only appears
  // *after* a route request has already failed, which on a fresh page
  // load or mid-trip in a dead zone can lag well behind when the
  // connection actually dropped (incidents/cameras only refetch every
  // 60-120s, so a dropped connection might not surface as a query error
  // for up to two minutes). This tracks navigator.onLine directly via the
  // browser's own online/offline events, so "you're disconnected, what
  // you're seeing may not be current" shows up the moment it's true, not
  // whenever the next stale fetch happens to fail.
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

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
        window.history.replaceState({}, "", window.location.pathname);
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
  // AI-recommended route — and re-arms auto-fit for the new bounds.
  useEffect(() => {
    setPreviewIdx(null);
    setShowSteps(false);
    setSheetExpanded(false);
    userPannedRef.current = false;
  }, [submitted]);

  // 10s ticker for the "updated Xs ago" freshness label.
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(t => t + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const mapRef = useRef<L.Map | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  // v7 refs: the geolocation watch handle, mirrors of state needed inside
  // the watch callback (which closes over stale values otherwise), and the
  // "user took manual control of the viewport" flag.
  const watchIdRef = useRef<number | null>(null);
  const gotFixRef = useRef(false);
  const followRef = useRef(false);
  const hasRouteRef = useRef(false);
  const userPannedRef = useRef(false);
  // v8: last fix, for deriving heading when the browser doesn't provide one.
  const lastFixRef = useRef<{ lat: number; lng: number } | null>(null);

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
  // v17: geofenced viewport bounds for the always-on incident/camera
  // layer (see MapViewportTracker) — undefined until the map has mounted
  // and reported its first bounds, in which case the query still runs
  // with no bbox (full statewide feed) so there's never a blank map
  // waiting on a viewport that hasn't been measured yet.
  const [viewportBbox, setViewportBbox] = useState<ViewportBbox | undefined>(
    undefined
  );
  const incidentsQuery = trpc.routePulse.listIncidents.useQuery(viewportBbox, {
    refetchInterval: 60_000,
  });
  // v6: traffic cameras for the always-on map layer, refreshed on roughly
  // the same cadence the ingester polls ODOT's camera list.
  const camerasQuery = trpc.routePulse.listCameras.useQuery(viewportBbox, {
    refetchInterval: 120_000,
  });
  const { recent, starred, addRoute, clearRoutes, starRoute, unstarRoute } =
    useRecentRoutes();

  // v18: purely a rotation-animation trigger for the swap button icon —
  // see handleSwap below. Count instead of a boolean so each tap adds
  // another half-turn rather than snapping back, which reads as "still
  // spinning" instead of "reset".
  const [swapCount, setSwapCount] = useState(0);
  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setSwapCount(c => c + 1);
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

  // v7: stops the watch and clears all location state.
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    gotFixRef.current = false;
    setTracking(false);
    setFollow(false);
    setUserLocation(null);
    setAccuracy(null);
    setHeading(null);
    setSpeedMps(null);
    lastFixRef.current = null;
    setLocating(false);
  };

  // v7: three-state locate button, Google Maps style:
  //   off            -> start live tracking + follow
  //   tracking+follow -> stop entirely
  //   tracking (user dragged away) -> re-center and resume follow
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocateError("Location isn't available in this browser.");
      return;
    }
    if (tracking) {
      if (follow) {
        stopTracking();
      } else {
        setFollow(true);
        if (userLocation) {
          mapRef.current?.flyTo(userLocation, 15, { duration: 0.6 });
        }
      }
      return;
    }
    setLocating(true);
    setLocateError(null);
    const id = navigator.geolocation.watchPosition(
      pos => {
        const point: LatLngExpression = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        gotFixRef.current = true;
        setUserLocation(point);
        setAccuracy(
          Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null
        );
        // v8 heading: prefer the browser's own heading (only meaningful
        // while actually moving); otherwise derive it from successive
        // fixes once we've moved far enough for the bearing to be stable.
        let hdg: number | null =
          pos.coords.heading !== null &&
          Number.isFinite(pos.coords.heading) &&
          (pos.coords.speed ?? 0) > 0.5
            ? pos.coords.heading
            : null;
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (
          hdg === null &&
          lastFixRef.current &&
          haversineM(lastFixRef.current, fix) > 8
        ) {
          hdg = bearingDeg(lastFixRef.current, fix);
        }
        setHeading(hdg);
        lastFixRef.current = fix;
        // v13: live speed for the trip-banner ETA. Negative/unavailable
        // (desktop browsers) reads as null and falls back to route average.
        setSpeedMps(
          pos.coords.speed !== null &&
            Number.isFinite(pos.coords.speed) &&
            pos.coords.speed >= 0
            ? pos.coords.speed
            : null
        );
        setTracking(true);
        setLocating(false);
        // Follow mode keeps the map on the user — but never yanks the view
        // away from a displayed route.
        if (followRef.current && !hasRouteRef.current) {
          mapRef.current?.panTo(point, { animate: true });
        }
      },
      err => {
        // Transient errors after a successful fix (GPS tunnel dropouts)
        // are ignored — the last-known dot stays. Only fail hard if we
        // never got a fix at all.
        if (gotFixRef.current) return;
        stopTracking();
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — enable it in your browser settings."
            : "Couldn't get your location — check permissions."
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    );
    watchIdRef.current = id;
    setFollow(true);
  };

  // v10: check geolocation permission state (where the browser supports the
  // Permissions API — Safari doesn't, and that's fine, it just falls back to
  // showing the prompt banner and asking normally on tap). If permission was
  // already granted in an earlier visit, locate silently on load — no need
  // to make a returning driver tap the button again every time. If denied,
  // suppress the prompt banner entirely rather than nagging.
  useEffect(() => {
    const nav = navigator as Navigator & {
      permissions?: {
        query: (opts: { name: "geolocation" }) => Promise<{
          state: "granted" | "denied" | "prompt";
          onchange: (() => void) | null;
        }>;
      };
    };
    if (!nav.permissions?.query) return;
    let cancelled = false;
    nav.permissions
      .query({ name: "geolocation" })
      .then(status => {
        if (cancelled) return;
        setGeoPermission(status.state);
        if (status.state === "granted") handleLocateMe();
        status.onchange = () => setGeoPermission(status.state);
      })
      .catch(() => {
        // Permissions API present but query unsupported/blocked — treat as
        // unknown and fall back to the tap-to-enable banner.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const dismissLocationPrompt = () => {
    setLocationPromptDismissed(true);
    try {
      localStorage.setItem("routepulse:location-prompt-dismissed", "1");
    } catch {
      // Storage disabled — the banner just reappears next visit, harmless.
    }
  };

  const handleEnableLocation = () => {
    dismissLocationPrompt();
    handleLocateMe();
  };

  // v7: one-tap "route from where I am now" — reverse-geocodes the live
  // fix into the origin field (falls back to raw coordinates, which
  // Nominatim also resolves).
  const handleUseCurrentAsOrigin = async () => {
    if (!userLocation) return;
    const [lat, lng] = userLocation as [number, number];
    const addr = await reverseGeocode(lat, lng);
    if (addr) {
      setOrigin(addr);
      toast.success("Origin set to your current location");
    } else {
      setOrigin(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      toast.success("Origin set to your current coordinates");
    }
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

  // v7: release the GPS watch when the page unmounts (battery + privacy).
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const routeLine: LatLngExpression[] | null = useMemo(() => {
    const geometry = routeQuery.data?.route.geometry as
      | { coordinates: [number, number][] }
      | undefined;
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

  // v8: the route object behind whatever is drawn solid right now (chosen
  // or previewed) — its OSRM steps drive both the congestion-colored
  // segments and the turn-by-turn list.
  const displayedRoute =
    displayedIdx !== null
      ? allRoutes[displayedIdx]
      : (routeQuery.data?.route ?? null);

  const displayedManeuvers = useMemo(
    () =>
      ((displayedRoute as { maneuvers?: ManeuverStep[] } | null | undefined)
        ?.maneuvers ?? []) as ManeuverStep[],
    [displayedRoute]
  );

  // v11: trip mode — auto-advance to the next maneuver as live fixes come
  // in. Fires on every userLocation change (the watch already runs); when
  // we're within ~45m of the upcoming maneuver's point we consider it done
  // and move to the next one. Ends itself at the final maneuver.
  useEffect(() => {
    if (!tripActive || !userLocation || displayedManeuvers.length === 0) return;
    const [lat, lng] = userLocation as [number, number];
    const step = displayedManeuvers[nextStepIdx];
    if (!step) {
      setTripActive(false);
      return;
    }
    const distM = haversineM(
      { lat, lng },
      { lat: step.location[1], lng: step.location[0] }
    );
    if (distM < 45) {
      if (nextStepIdx >= displayedManeuvers.length - 1) {
        setTripActive(false);
        toast.success("You've arrived");
      } else {
        setNextStepIdx(i => i + 1);
      }
    }
  }, [userLocation, tripActive, nextStepIdx, displayedManeuvers]);

  // A new route resets trip mode — steps from the old route would steer
  // the driver wrong otherwise.
  useEffect(() => {
    setTripActive(false);
    setNextStepIdx(0);
  }, [submitted]);

  const startTrip = () => {
    if (!tracking) {
      toast.error("Enable location first — trip mode follows your position");
      return;
    }
    setNextStepIdx(0);
    setTripActive(true);
    toast.success("Trip started — follow the banner");
  };

  const nextStep: ManeuverStep | null =
    tripActive && displayedManeuvers.length > 0
      ? (displayedManeuvers[
          Math.min(nextStepIdx, displayedManeuvers.length - 1)
        ] ?? null)
      : null;

  const nextStepDistM =
    tripActive && nextStep && userLocation
      ? haversineM(
          {
            lat: (userLocation as [number, number])[0],
            lng: (userLocation as [number, number])[1],
          },
          { lat: nextStep.location[1], lng: nextStep.location[0] }
        )
      : null;

  // v11: persist the last successful route result for the offline fallback.
  useEffect(() => {
    const d = routeQuery.data;
    if (!d) return;
    const snapshot = {
      originName: d.origin.displayName,
      destinationName: d.destination.displayName,
      distanceM: d.route.distance,
      durationS: d.route.duration,
      explanation: d.explanation,
      savedAt: Date.now(),
    };
    setLastResult(snapshot);
    try {
      localStorage.setItem("routepulse:last-result", JSON.stringify(snapshot));
    } catch {
      // Storage full/disabled — the offline card just won't appear.
    }
  }, [routeQuery.data]);

  // v11: "/" focuses the origin field (desktop power users), matching the
  // shortcut convention in Google Maps / GitHub / most search UIs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      e.preventDefault();
      setSearchCollapsed(false);
      document.getElementById("routepulse-origin")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // v13: voice prompts — speak each maneuver when it becomes the active
  // one. Web Speech API is free and built into every modern browser; the
  // mute toggle persists. Cancel any queued speech when trip mode ends or
  // the page unmounts so a stale "turn left" doesn't play after arrival.
  useEffect(() => {
    if (!tripActive || voiceMuted || !nextStep) return;
    if (typeof window.speechSynthesis === "undefined") return;
    const utter = new SpeechSynthesisUtterance(
      nextStepDistM !== null && nextStepDistM >= 30
        ? `In ${
            nextStepDistM >= 160
              ? `${(nextStepDistM / 1609.34).toFixed(1)} miles`
              : `${Math.max(50, Math.round(nextStepDistM / 0.3048 / 10) * 10)} feet`
          }, ${nextStep.instruction}`
        : nextStep.instruction
    );
    utter.rate = 1.05;
    window.speechSynthesis.speak(utter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak on step change only
  }, [nextStepIdx, tripActive]);

  useEffect(() => {
    if (!tripActive && typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.cancel();
    }
  }, [tripActive]);

  const toggleVoiceMuted = () => {
    setVoiceMuted(m => {
      const next = !m;
      try {
        localStorage.setItem("routepulse:voice-muted", next ? "1" : "0");
      } catch {
        // Storage disabled — mute just won't persist.
      }
      if (next && typeof window.speechSynthesis !== "undefined") {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  // v17: haptic feedback on high-priority incidents — deferred back in the
  // v14 session ("Haptic feedback on high-priority incidents"). Only fires
  // for major/critical severity — a minor hazard buzzing your pocket
  // every time would train drivers to ignore the vibration entirely by
  // the second trip. Feature-detected (navigator.vibrate is iOS Safari's
  // permanent no-op — it silently does nothing there — and unsupported on
  // desktop entirely), so this never throws or needs its own toggle; it's
  // just silent where it isn't supported.
  const hapticBuzz = (
    severity: "minor" | "moderate" | "major" | "critical"
  ) => {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    try {
      // Critical gets a distinct double-pulse so it doesn't feel like the
      // same buzz as "moderate congestion ahead" — matches the same
      // escalation already used visually (bigger pin + pulsing ring, see
      // INCIDENT_ICON_SIZE/critical pulse ring above).
      const pattern = severity === "critical" ? [120, 80, 120] : [90];
      navigator.vibrate(pattern);
    } catch {
      // Some browsers throw if vibrate is called outside a user gesture
      // context rather than just returning false — either way, a missed
      // buzz is not worth surfacing to the driver.
    }
  };

  // v13: proximity incident alerts during trip mode — one toast per
  // incident when you come within ~500m of it. Uses a ref set so a GPS
  // jitter across the threshold doesn't re-fire.
  useEffect(() => {
    if (!tripActive || !userLocation || !displayedRoute) return;
    const [lat, lng] = userLocation as [number, number];
    for (const inc of displayedRoute.incidents) {
      if (alertedRef.current.has(inc.id)) continue;
      if (!Number.isFinite(inc.lat) || !Number.isFinite(inc.lng)) continue;
      const dist = haversineM({ lat, lng }, { lat: inc.lat, lng: inc.lng });
      if (dist <= 500) {
        alertedRef.current.add(inc.id);
        if (inc.severity === "major" || inc.severity === "critical") {
          hapticBuzz(inc.severity);
        }
        toast.warning(
          `Ahead: ${inc.road_name ? `${inc.road_name} — ` : ""}${inc.description ?? inc.incident_type}`,
          { duration: 6000 }
        );
      }
    }
  }, [userLocation, tripActive, displayedRoute]);

  // Reset proximity memory on a new route or a new trip.
  useEffect(() => {
    alertedRef.current.clear();
  }, [submitted, tripActive]);

  // v13: trip ETA — remaining maneuver distance divided by live speed
  // (route average as fallback while stationary or on desktops that don't
  // report GPS speed).
  const tripEta = useMemo(() => {
    if (!tripActive || displayedManeuvers.length === 0) return null;
    const remainingM = displayedManeuvers
      .slice(nextStepIdx)
      .reduce((sum, m) => sum + (m.distanceM || 0), 0);
    const routeAvg =
      displayedRoute && displayedRoute.duration > 0
        ? displayedRoute.distance / displayedRoute.duration
        : 8.9; // ~20 mph sanity floor
    const speed = speedMps !== null && speedMps > 1.5 ? speedMps : routeAvg;
    const etaSec = remainingM / speed;
    return {
      minutesLeft: Math.max(1, Math.round(etaSec / 60)),
      arriveAt: new Date(Date.now() + etaSec * 1000),
    };
  }, [tripActive, displayedManeuvers, nextStepIdx, displayedRoute, speedMps]);

  // v15: TomTom flow samples for the displayed route, when the backend
  // measured any (see FlowGrounding.points in externalGrounding.ts). Each
  // point is a real currentSpeed/freeFlowSpeed reading at a spot along the
  // route — a much stronger signal than the maneuver-duration heuristic
  // below, but coarse (only ~5 points per route) so it's used to *color*
  // the fine-grained heuristic segments, not replace their geometry.
  const flowPoints = useMemo(() => {
    const flow = (
      displayedRoute as
        | {
            flow?: {
              points?: {
                lat: number;
                lng: number;
                ratio: number | null;
                closed: boolean;
              }[];
            } | null;
          }
        | null
        | undefined
    )?.flow;
    return (flow?.points ?? []).filter(p => p.ratio !== null || p.closed);
  }, [displayedRoute]);

  const ratioToColor = (ratio: number) =>
    ratio < 0.45
      ? CONGESTION_CRAWL
      : ratio < 0.75
        ? CONGESTION_SLOW
        : ROUTE_BLUE;

  // Rough degrees-squared threshold for "this flow sample actually
  // describes this stretch of road" — about 800m at mid latitudes.
  // Beyond that, a nearest sample is more likely a different road nearby
  // than this one, so we fall back to the heuristic instead of mislabeling.
  const FLOW_SNAP_DEG2 = 0.00006;

  // Congestion-colored per-step segments. Each step's implied speed is
  // compared to the route average; only drawn when the step geometry
  // actually covers the route (2+ drawable steps), otherwise the plain
  // single-color line is used. When a TomTom flow sample lands close to a
  // step's midpoint, its measured ratio overrides the duration heuristic
  // for that step's color — real data wins when we have it.
  const segmentLines = useMemo(() => {
    if (!displayedRoute || displayedManeuvers.length === 0) return [];
    const avg = displayedRoute.distance / Math.max(1, displayedRoute.duration);
    const segs: { positions: LatLngExpression[]; color: string }[] = [];
    for (const m of displayedManeuvers) {
      if (!m.coordinates || m.coordinates.length < 2) continue;
      const speed = m.durationS > 0 ? m.distanceM / m.durationS : avg;
      const heuristicRatio = avg > 0 ? speed / avg : 1;

      let color = ratioToColor(heuristicRatio);
      if (flowPoints.length > 0) {
        const mid = m.coordinates[Math.floor(m.coordinates.length / 2)]!;
        const [midLng, midLat] = mid;
        let nearest: (typeof flowPoints)[number] | null = null;
        let nearestD2 = Infinity;
        for (const p of flowPoints) {
          const d2 = (p.lat - midLat) ** 2 + (p.lng - midLng) ** 2;
          if (d2 < nearestD2) {
            nearestD2 = d2;
            nearest = p;
          }
        }
        if (nearest && nearestD2 <= FLOW_SNAP_DEG2) {
          color = nearest.closed
            ? CONGESTION_CRAWL
            : ratioToColor(nearest.ratio ?? heuristicRatio);
        }
      }

      segs.push({
        positions: m.coordinates.map(
          ([lng, lat]) => [lat, lng] as LatLngExpression
        ),
        color,
      });
    }
    return segs.length >= 2 ? segs : [];
  }, [displayedRoute, displayedManeuvers, flowPoints]);

  // Active incidents with valid coordinates — used both as the always-on
  // map layer (before any route search) and the list card below the map.
  const activeIncidents = useMemo(
    () =>
      (incidentsQuery.data ?? []).filter(
        (i: any) => Number.isFinite(i.lat) && Number.isFinite(i.lng)
      ),
    [incidentsQuery.data]
  );

  // v6: cameras along the recommended route (the server attaches them to
  // getRoute; pre-v6 cached responses lack the field — degrade to none).
  const routeCameras = useMemo(
    () =>
      ((routeQuery.data?.cameras as any[] | undefined) ?? []).filter(
        c => Number.isFinite(c?.lat) && Number.isFinite(c?.lng)
      ),
    [routeQuery.data]
  );

  // All known cameras for the pre-search live layer.
  const activeCameras = useMemo(
    () =>
      ((camerasQuery.data as any[] | undefined) ?? []).filter(
        c => Number.isFinite(c?.lat) && Number.isFinite(c?.lng)
      ),
    [camerasQuery.data]
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
  const aiConfidence = ((routeQuery.data?.confidence as string | undefined) ??
    "none") as "high" | "medium" | "low" | "none";

  // v12: per-route AI verdicts (aligned by route index; null for chosen),
  // wait-or-go advice, and the time context the server scored under.
  const routeVerdicts =
    (routeQuery.data?.verdicts as (string | null)[] | undefined) ?? null;
  const waitAdvice =
    (routeQuery.data?.waitAdvice as
      | {
          clearByIso: string;
          waitMin: number;
          delayAvoidedMin: number;
          roadName: string | null;
        }
      | null
      | undefined) ?? null;
  const timeContext =
    (routeQuery.data?.timeContext as string | undefined) ?? "offpeak";
  // v13: departure-horizon outlook (leave now vs +15/+30/+60).
  const departureOutlook =
    (routeQuery.data?.departureOutlook as
      | {
          horizonsMin: number[];
          delayMin: number[];
          bestHorizonMin: number;
          savesMin: number;
        }
      | null
      | undefined) ?? null;

  // v14: one-sentence mobile summary — recomputed whenever the incident
  // list or the leave-now delay estimate changes. Uses departureOutlook's
  // "now" horizon (index 0) as the delay figure since that's already the
  // server's best estimate for leaving immediately; falls back to no
  // delay figure (just incident count/severity) if departureOutlook isn't
  // present (pre-v13 cached responses).
  const mobileSummary = useMemo(() => {
    if (!routeQuery.data) return "";
    return getMobileSummary({
      incidents: routeQuery.data.route.incidents,
      leaveNowDelayMin: departureOutlook?.delayMin?.[0] ?? null,
    });
  }, [routeQuery.data, departureOutlook]);

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
      (routeQuery.data.route.incidentDelayMin as number | undefined) ??
      localBuffer;
    const driveMin = displayDurationS(routeQuery.data.route) / 60;
    const leave = new Date(arrive.getTime() - (driveMin + bufferMin) * 60_000);
    return { leave, bufferMin };
  }, [routeQuery.data, arriveBy]);

  const currentIsStarred =
    !!submitted &&
    starred.some(
      s =>
        s.origin === submitted.origin && s.destination === submitted.destination
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
    const mins = Math.round(displayDurationS(d.route) / 60);
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
      ? Math.max(
          0,
          Math.round((Date.now() - incidentsQuery.dataUpdatedAt) / 1000)
        )
      : null;

  // v7: keep the follow/hasRoute refs honest for the watch callback.
  useEffect(() => {
    followRef.current = follow;
  }, [follow]);
  useEffect(() => {
    hasRouteRef.current = hasRoute;
  }, [hasRoute]);

  // v9: once a route is on the map, fold the search card into a chip so
  // the map (and the route on it) gets the screen back. Editing the
  // fields re-expands it; a fresh search re-collapses.
  useEffect(() => {
    if (hasRoute) setSearchCollapsed(true);
  }, [hasRoute]);

  // Shared camera marker + popup for both the pre-search live layer and the
  // on-route layer. Camera stills 404 / go stale often, so broken images
  // hide themselves rather than showing a broken-image tile.
  const cameraMarker = (cam: any) => (
    <Marker
      key={`cam-${cam.id}`}
      position={[cam.lat, cam.lng]}
      icon={CAMERA_ICON}
    >
      <Popup>
        <div className="text-sm space-y-1.5 max-w-[240px]">
          {cam.description && (
            <p className="font-medium leading-snug">{cam.description}</p>
          )}
          {camImg(cam.image_url ?? cam.thumbnail_url) && (
            <img
              src={camImg(cam.image_url ?? cam.thumbnail_url)!}
              alt={cam.description ?? "Traffic camera snapshot"}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="rounded-md w-full h-auto"
              onError={e => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            ODOT TripCheck · live snapshot
          </p>
        </div>
      </Popup>
    </Marker>
  );

  // v9: one steps list, two homes — the desktop result-card panel and the
  // mobile bottom sheet. Tapping a step flies the map to the maneuver (and
  // closes the sheet if we're on a phone).
  const stepsList = (
    <ol className="divide-y divide-border/60">
      {displayedManeuvers.map((m, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => {
              setSheetExpanded(false);
              if (m.location[0] !== 0 || m.location[1] !== 0) {
                mapRef.current?.flyTo([m.location[1], m.location[0]], 16, {
                  duration: 0.6,
                });
              }
            }}
            title="Show this maneuver on the map"
            className="flex w-full items-center gap-3 py-2.5 sm:py-2 px-1 text-left hover:bg-muted/60 rounded transition-colors"
          >
            <span className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <ManeuverGlyph type={m.type} modifier={m.modifier} />
            </span>
            <span className="flex-1 text-sm">{m.instruction}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {m.distanceM >= 160
                ? `${(m.distanceM / 1609.34).toFixed(1)} mi`
                : `${Math.max(50, Math.round(m.distanceM / 0.3048 / 10) * 10)} ft`}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );

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
        {/* sr-only live region — announces route results/errors to screen
            reader users, who otherwise get no signal that a search finished
            (the visual result cards below aren't announced on their own).
            NOTE for Kimi: if you add new terminal states to routeQuery
            (e.g. a new error branch), extend the text below rather than
            leaving screen reader users only the visual card. */}
        <div className="sr-only" role="status" aria-live="polite">
          {routeQuery.isFetching
            ? "Finding route…"
            : hasRoute
              ? `Route found: ${Math.round(displayDurationS(routeQuery.data!.route) / 60)} minutes, ${routeQuery.data!.route.incidents.length} incident${routeQuery.data!.route.incidents.length === 1 ? "" : "s"} on the way.`
              : routeQuery.isError
                ? "Couldn't find a route. See the error message below the search form."
                : ""}
        </div>

        {/* v17: live connectivity banner — see the isOnline effect above
            for why this is deliberately separate from the existing
            error-triggered "Offline — showing your last checked route"
            card further down (that one only appears after a route
            request has already failed; this one reflects the browser's
            actual online/offline state the moment it changes). Shown at
            the top of the page, not just inside the mobile sheet, since a
            driver checking a route before setting off deserves the same
            "heads up, this might not be current" signal as one already
            mid-trip. */}
        {!isOnline && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              No connection — anything shown right now is cached and may not
              reflect current conditions.
            </span>
          </div>
        )}

        <header className="mb-8">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Free Tool · Route Intelligence
          </p>
          <h1
            style={{ fontFamily: '"Cinzel", serif' }}
            className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4 flex items-center gap-3"
          >
            <Navigation className="w-8 h-8 shrink-0 text-primary" />
            RoutePulse
          </h1>
          {/* Illuminated rule — the same gold-on-stone language used
              elsewhere on the site (see --gold-illuminate in index.css),
              previously absent here so RoutePulse's header read as a
              generic bolded h1 rather than matching the rest of the
              site's identity. */}
          <div
            className="h-px w-24 mb-4"
            style={{
              background:
                "linear-gradient(90deg, var(--gold-illuminate), transparent)",
            }}
          />
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
            className="relative h-[70dvh] max-h-[640px] min-h-[420px] w-full bg-muted"
          >
            <MapContainer
              ref={mapRef}
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              zoomControl={false}
              scrollWheelZoom
              zoomSnap={0.5}
              zoomDelta={0.5}
              wheelPxPerZoomLevel={100}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                key={basemap}
                attribution={BASEMAPS[basemap].attribution}
                url={BASEMAPS[basemap].url}
              />
              {/* NOTE FOR KIMI: these were both "bottomright", which put
                  Leaflet's native control container (z-index 1000 by
                  default) directly on top of the v14 mobile bottom sheet
                  (z-[450], anchored bottom of this same map wrapper) — the
                  "2000 ft" scale box floating oddly over the sheet on
                  mobile was this collision, not a sheet bug. Moved both to
                  topright, which is empty on every viewport size and is
                  the standard placement mobile map apps use to stay clear
                  of a bottom sheet/nav bar. Don't move these back to a
                  bottom* position without also either raising the sheet's
                  z-index above Leaflet's control container or hiding the
                  controls on mobile. */}
              <ZoomControl position="topright" />
              <ScaleControl position="topright" metric={false} imperial />
              <FitBounds bounds={mapBounds} skipAutoFit={userPannedRef} />
              <MapViewportTracker onChange={setViewportBbox} />
              <MapInteractionHandler
                onDrag={() => {
                  setFollow(false);
                  userPannedRef.current = true;
                }}
              />
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
                <>
                  {accuracy !== null && accuracy < 500 && (
                    <Circle
                      center={userLocation}
                      radius={accuracy}
                      pathOptions={{
                        color: "#2563eb",
                        weight: 1,
                        opacity: 0.5,
                        fillColor: "#2563eb",
                        fillOpacity: 0.08,
                      }}
                    />
                  )}
                  {/* v8: heading cone under the dot (dot draws on top) */}
                  {heading !== null && (
                    <Marker
                      position={userLocation}
                      icon={headingConeIcon(heading)}
                      interactive={false}
                    />
                  )}
                  <Marker position={userLocation} icon={USER_LOCATION_ICON} />
                </>
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
                  {displayedLine &&
                    (segmentLines.length > 0 ? (
                      <>
                        {/* Casing under the per-step segments so the split
                            line still reads as one continuous route */}
                        <Polyline
                          positions={displayedLine}
                          pathOptions={{
                            color: "#1e3a8a",
                            weight: 7,
                            opacity: 0.25,
                          }}
                        />
                        {segmentLines.map((seg, i) => (
                          <Polyline
                            key={`seg-${i}`}
                            positions={seg.positions}
                            pathOptions={{
                              color: seg.color,
                              weight: 5,
                              opacity: 0.95,
                            }}
                          />
                        ))}
                      </>
                    ) : (
                      <Polyline
                        positions={displayedLine}
                        pathOptions={{
                          color: "#3b82f6",
                          weight: 5,
                          opacity: 0.9,
                        }}
                      />
                    ))}
                  {/* Alternative routes — lighter, dashed lines. The route
                      currently displayed solid is skipped so the chosen
                      route isn't double-drawn. */}
                  {allRoutes.map((alt, idx) => {
                    if (idx === displayedIdx) return null;
                    const coords = (
                      alt.geometry as {
                        coordinates: [number, number][];
                      }
                    )?.coordinates;
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
                  {/* Traffic cameras along the recommended route (v6) */}
                  {routeCameras.map(cameraMarker)}
                </>
              ) : (
                // No route searched yet — show every active incident and
                // traffic camera so the map is never just an empty base
                // layer.
                //
                // NOTE FOR KIMI (v17): this used to render every incident
                // and camera as an individual unclustered Marker. Fine at
                // the handful-of-incidents scale this was built and tested
                // at, but the incident feed spans ODOT TripCheck + 511 +
                // NWS + WSDOT statewide — a busy weather day easily puts
                // 50-200+ pins in view at once, at which point the map
                // becomes an unreadable pile of overlapping dots rather
                // than useful signal. Wrapped both layers in
                // MarkerClusterGroup (react-leaflet-cluster) so nearby
                // markers collapse into a count bubble until zoomed in
                // enough to separate them — standard behavior for any
                // real-world incident map at this density. Route-scoped
                // incidents/cameras (the `hasRoute` branch above) are NOT
                // clustered on purpose — that set is already small
                // (bounded to what's actually near one route) and
                // clustering it would hide exactly the incidents a driver
                // is trying to see.
                <>
                  <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={60}
                    spiderfyOnMaxZoom
                    iconCreateFunction={incidentClusterIcon}
                  >
                    {activeIncidents.map((inc: any) => (
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
                  </MarkerClusterGroup>
                  <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={50}
                    spiderfyOnMaxZoom
                    iconCreateFunction={cameraClusterIcon}
                  >
                    {activeCameras.map(cameraMarker)}
                  </MarkerClusterGroup>
                </>
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

            {/* v11 trip mode banner — navigation-lite guidance driven by
                the live location feed. Shows the next maneuver with live
                distance-to-turn; auto-advances as fixes arrive. */}
            {tripActive && nextStep && (
              <div className="absolute z-[450] top-3 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] rounded-xl bg-background/95 backdrop-blur-md border shadow-xl px-4 py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ManeuverGlyph
                    type={nextStep.type}
                    modifier={nextStep.modifier}
                  />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">
                    {nextStep.instruction}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {nextStepDistM !== null &&
                      (nextStepDistM >= 160
                        ? `in ${(nextStepDistM / 1609.34).toFixed(1)} mi`
                        : `in ${Math.max(50, Math.round(nextStepDistM / 0.3048 / 10) * 10)} ft`)}
                    {" · "}step {nextStepIdx + 1} of {displayedManeuvers.length}
                    {/* v13: live speed + ETA from actual GPS speed */}
                    {speedMps !== null && speedMps > 1.5 && (
                      <>
                        {" · "}
                        {Math.round(speedMps * 2.23694)} mph
                      </>
                    )}
                    {tripEta && (
                      <>
                        {" · "}ETA {fmtTime(tripEta.arriveAt)} (
                        {tripEta.minutesLeft} min)
                      </>
                    )}
                  </p>
                </div>
                {/* v13: voice prompt mute toggle */}
                <button
                  type="button"
                  onClick={toggleVoiceMuted}
                  title={
                    voiceMuted ? "Unmute voice prompts" : "Mute voice prompts"
                  }
                  className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                >
                  {voiceMuted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTripActive(false)}
                  title="End trip"
                  className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Floating glass search card — Google-Maps-style search-over-map
                instead of a form stacked above the map. v9: once a route is
                displayed it folds into a one-line chip (tap to edit) so the
                map gets the screen back; on phones it also caps at 62dvh
                with internal scroll so it can never cover the whole map. */}
            <Card
              className={`absolute z-[400] top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-auto sm:w-[380px] bg-background/90 backdrop-blur-md shadow-xl border ${
                searchCollapsed && hasRoute
                  ? "p-2.5 sm:p-3"
                  : "p-4 sm:p-5 max-h-[62dvh] overflow-y-auto sm:max-h-none sm:overflow-visible"
              }`}
            >
              {searchCollapsed && hasRoute ? (
                <button
                  type="button"
                  onClick={() => setSearchCollapsed(false)}
                  title="Edit this search"
                  className="flex w-full items-center gap-2 text-left"
                >
                  <RouteIcon className="w-4 h-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate text-sm">
                    {origin} <span className="text-muted-foreground">→</span>{" "}
                    {destination}
                  </span>
                  <Pencil className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                </button>
              ) : (
                <>
                  {hasRoute && (
                    <button
                      type="button"
                      onClick={() => setSearchCollapsed(true)}
                      title="Collapse search"
                      aria-label="Collapse search"
                      className="absolute top-2 right-2 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  )}
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
                              onClick={() =>
                                unstarRoute(r.origin, r.destination)
                              }
                              className="px-1.5 py-1 text-muted-foreground hover:text-destructive transition-colors"
                              title="Remove saved route"
                              aria-label={`Remove saved route ${r.origin} to ${r.destination}`}
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
                  {/* v10: location onboarding CTA — one tap triggers the native
                  permission prompt via handleLocateMe(). Only shown before
                  a first route search, before we have a fix, and while the
                  driver hasn't dismissed it or already denied permission. */}
                  {!hasRoute &&
                    !userLocation &&
                    !locationPromptDismissed &&
                    geoPermission !== "denied" && (
                      <div className="mb-3 flex items-start gap-2.5 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
                        <LocateFixed className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">
                            Enable location for one-tap routes
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Find your position automatically and set it as your
                            origin instantly.
                          </p>
                          <button
                            type="button"
                            onClick={handleEnableLocation}
                            className="mt-1.5 text-xs font-medium text-primary hover:underline"
                          >
                            Enable location
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={dismissLocationPrompt}
                          title="Dismiss"
                          aria-label="Dismiss location prompt"
                          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
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

                    {/* v7: one-tap "route from where I am" once we have a fix */}
                    {userLocation && (
                      <button
                        type="button"
                        onClick={handleUseCurrentAsOrigin}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline py-0.5"
                        title="Reverse-geocode your live position into the origin field"
                      >
                        <LocateFixed className="w-3.5 h-3.5" />
                        Use current location as origin
                      </button>
                    )}

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
                      <motion.span
                        animate={{ rotate: swapCount * 180 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="inline-flex"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </motion.span>
                      Swap origin & destination
                    </button>

                    {formError && (
                      <p className="text-xs text-destructive">{formError}</p>
                    )}

                    <Button
                      type="submit"
                      size="sm"
                      className="gap-2 w-full group"
                    >
                      {routeQuery.isFetching && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Find route
                      {!routeQuery.isFetching && (
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </Button>
                  </form>
                </>
              )}
            </Card>

            {/* Floating controls — locate me, basemap toggle, fullscreen.
                v9: on phones these live in the bottom-right thumb zone with
                bigger touch targets; on desktop they stay top-right. */}
            <div className="absolute z-[400] bottom-28 right-3 sm:bottom-auto sm:top-4 sm:right-4 flex flex-col gap-2 pb-safe">
              <button
                type="button"
                onClick={handleLocateMe}
                title={
                  locating
                    ? "Locating…"
                    : tracking
                      ? follow
                        ? "Following you — click to stop"
                        : "Click to re-center on you"
                      : "Find my location"
                }
                aria-label={
                  locating
                    ? "Locating…"
                    : tracking
                      ? follow
                        ? "Following you — click to stop"
                        : "Click to re-center on you"
                      : "Find my location"
                }
                className={`w-11 h-11 sm:w-9 sm:h-9 rounded-md backdrop-blur-md border shadow-lg flex items-center justify-center transition-colors ${
                  tracking && follow
                    ? "bg-blue-500/90 text-white border-blue-400"
                    : "bg-background/90 hover:bg-background"
                }`}
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
                aria-label="Toggle map style"
                className="w-11 h-11 sm:w-9 sm:h-9 rounded-md bg-background/90 backdrop-blur-md border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                aria-label={
                  isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
                className="w-11 h-11 sm:w-9 sm:h-9 rounded-md bg-background/90 backdrop-blur-md border shadow-lg flex items-center justify-center hover:bg-background transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            </div>

            {locateError && (
              <div className="absolute z-[400] bottom-[13.5rem] right-3 max-w-[220px] rounded-md bg-background/95 border shadow-lg px-3 py-2 text-xs text-destructive sm:bottom-auto sm:top-32 sm:right-4">
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
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white shadow"
                  style={{ background: "#7c3aed" }}
                />
                <span className="text-muted-foreground">📷 camera</span>
              </span>
              {hasRoute && segmentLines.length > 0 && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-1 rounded-full"
                      style={{ background: CONGESTION_SLOW }}
                    />
                    <span className="text-muted-foreground">slow</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-1 rounded-full"
                      style={{ background: CONGESTION_CRAWL }}
                    />
                    <span className="text-muted-foreground">crawling</span>
                  </span>
                </>
              )}
            </div>

            {/* v14: persistent mobile intelligence bottom sheet.
                Replaces the old two-piece "thin bar + separate full-screen
                steps modal" (v9) with one sheet that's always up on phones:
                "peek" (~34vh) shows the one-line AI summary + horizontal
                glanceable incident cards without covering the map; drag
                the handle up (or tap it / the summary row) to expand to
                ~70vh and reveal turn-by-turn.
                NOTE FOR KIMI: drag is intentionally only on the small
                handle bar, not the whole sheet — dragging the sheet body
                itself would fight the horizontal scroll on the incident
                card row and the map's own touch handling underneath.
                sm and up keep the existing result card below the map
                instead (untouched — see the Card block further down). */}
            {hasRoute && (
              <motion.div
                className="sm:hidden absolute inset-x-0 bottom-0 z-[450] rounded-t-2xl bg-background/95 backdrop-blur-md border-t shadow-2xl flex flex-col overflow-hidden pb-safe"
                initial={false}
                animate={{ height: sheetExpanded ? "70vh" : "34vh" }}
                transition={{ type: "spring", stiffness: 340, damping: 32 }}
              >
                {/* Drag handle — swipe up/down or tap to expand/collapse. */}
                <motion.div
                  className="flex justify-center pt-2 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.35}
                  dragSnapToOrigin
                  onDragEnd={(_e, info) => {
                    if (info.offset.y < -18) setSheetExpanded(true);
                    else if (info.offset.y > 18) setSheetExpanded(false);
                  }}
                  onClick={() => setSheetExpanded(v => !v)}
                  role="button"
                  aria-label={
                    sheetExpanded
                      ? "Collapse route sheet"
                      : "Expand route sheet"
                  }
                  aria-expanded={sheetExpanded}
                >
                  <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
                </motion.div>

                {/* Always-visible glanceable header — vitals + one-sentence
                    AI summary (getMobileSummary), tap to expand too. */}
                <button
                  type="button"
                  className="w-full text-left px-4 pb-2 shrink-0"
                  onClick={() => setSheetExpanded(v => !v)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight flex items-center gap-1.5">
                      {(routeQuery.data!.route.distance / 1609.34).toFixed(1)}{" "}
                      mi ·{" "}
                      {Math.round(
                        displayDurationS(routeQuery.data!.route) / 60
                      )}{" "}
                      min
                      {/* v17: same connectivity signal as the top-of-page
                          banner, condensed to an icon — this is the spot
                          a driver's eyes are actually on mid-trip, so it
                          needs to be visible here too, not just above the
                          fold on a screen they've scrolled past. */}
                      {!isOnline && (
                        <WifiOff className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                    </p>
                    {riskInfo && (
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] px-1.5 py-0 ${
                          riskInfo.level === "low"
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                            : riskInfo.level === "moderate"
                              ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                              : riskInfo.level === "high"
                                ? "border-orange-500/30 text-orange-600 bg-orange-500/10"
                                : "border-red-500/30 text-red-600 bg-red-500/10"
                        }`}
                      >
                        {riskInfo.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">
                    {mobileSummary}
                  </p>
                </button>

                {/* Glanceable, horizontal-scroll incident cards — visible
                    at peek height too, so the "3 hazards, 2 min delay"
                    gist never requires expanding the sheet. */}
                {routeQuery.data!.route.incidents.length > 0 && (
                  <div
                    className="flex gap-2 overflow-x-auto px-4 pb-3 shrink-0 [-webkit-overflow-scrolling:touch]"
                    role="list"
                    aria-label="Incidents on this route"
                  >
                    {routeQuery.data!.route.incidents.slice(0, 10).map(inc => (
                      <div
                        key={inc.id}
                        role="listitem"
                        className="shrink-0 w-[168px] rounded-lg border bg-card px-3 py-2"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide rounded border px-1 py-px ${SEVERITY_BADGE[inc.severity] ?? ""}`}
                          >
                            {inc.severity}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-snug line-clamp-2">
                          {inc.road_name && (
                            <span className="font-semibold">
                              {inc.road_name}:{" "}
                            </span>
                          )}
                          {inc.description ?? inc.incident_type}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action row — Steps / trip mode, always reachable
                    without expanding (44px touch targets per spec). */}
                <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
                  {displayedManeuvers.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0 h-11 sm:h-9"
                      onClick={() => setSheetExpanded(true)}
                    >
                      <List className="w-4 h-4" />
                      Steps
                    </Button>
                  )}
                  {displayedManeuvers.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant={tripActive ? "default" : "outline"}
                      className="gap-1.5 shrink-0 h-11 sm:h-9"
                      onClick={() =>
                        tripActive ? setTripActive(false) : startTrip()
                      }
                      title={
                        tracking
                          ? "Start guided trip mode"
                          : "Enable location first, then start trip mode"
                      }
                    >
                      {tripActive ? (
                        <Square className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {tripActive ? "End" : "Go"}
                    </Button>
                  )}
                </div>

                {/* Expanded-only content: full turn-by-turn list. Rendered
                    only when expanded (not just visually hidden) so the
                    peek state stays cheap to paint on every incident
                    refresh. */}
                <AnimatePresence>
                  {sheetExpanded && (
                    <motion.div
                      key="expanded-steps"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 overflow-y-auto px-2 py-1 border-t"
                    >
                      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide px-2 py-2 flex items-center gap-1.5">
                        <List className="w-3.5 h-3.5" />
                        Turn-by-turn · {displayedManeuvers.length} steps
                      </p>
                      {displayedManeuvers.length > 0 ? (
                        stepsList
                      ) : (
                        <p className="text-sm text-muted-foreground px-4 py-6 text-center">
                          No turn-by-turn available for this route.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>

        {/* Result card — v18: fades/slides in on arrival instead of
            snapping into existence, and re-triggers per search (key'd on
            the submitted origin/destination) so picking a new route feels
            like a fresh result landing, not a silent content swap. */}
        {hasRoute && (
          <motion.div
            key={`${submitted?.origin}|${submitted?.destination}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Card className="p-6 sm:p-8 mb-8 space-y-4">
              {/* NOTE FOR KIMI: this distance/duration + risk badge line is a
                byte-for-byte duplicate of the v14 mobile sheet's peek
                header (search getMobileSummary / mobileSummary above) — on
                phones the sheet already sits right on top of the map, so
                this card repeated the exact same "3.5 mi · 10 min · Low
                Risk" line again immediately below it, which is the
                "duplicate summary" clutter reported on mobile. Hidden below
                sm; still shown on desktop, which has no persistent sheet
                and needs this header. If you add new info to this line,
                add it to the sheet's peek header too so they don't drift
                apart again. */}
              <div className="hidden sm:flex items-baseline justify-between flex-wrap gap-2">
                <p className="text-2xl font-semibold">
                  {(routeQuery.data!.route.distance / 1609.34).toFixed(1)} mi ·{" "}
                  {Math.round(displayDurationS(routeQuery.data!.route) / 60)}{" "}
                  min
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
                  {/* v11: trip mode toggle (desktop) */}
                  {displayedManeuvers.length > 0 && (
                    <Button
                      variant={tripActive ? "default" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() =>
                        tripActive ? setTripActive(false) : startTrip()
                      }
                      title={
                        tracking
                          ? "Start guided trip mode"
                          : "Enable location first, then start trip mode"
                      }
                    >
                      {tripActive ? (
                        <Square className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {tripActive ? "End trip" : "Start trip"}
                    </Button>
                  )}
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
                    {/* v12: scores computed under weekday peak conditions get
                      congestion weighted 25% heavier server-side — say so. */}
                    {timeContext === "peak" && (
                      <span className="block text-[10px] font-normal text-amber-600 dark:text-amber-400">
                        rush-hour weighting
                      </span>
                    )}
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
                {/* v10b: visible when live TomTom/live-alerts grounding fed
                  this result — the receipts behind the "better than
                  Google" claim. v16: label corrected from "Waze" to
                  "Google Maps" — see SOURCE_LABEL note above; the
                  grounding.wazeAlerts field name is unchanged server-side
                  (it's a count of alerts from whichever provider fed the
                  fetchWazeAlerts() call, currently Google Maps Traffic
                  Alerts) but this label must say what's actually powering
                  it. */}
                {(routeQuery.data!.grounding as
                  | {
                      tomtomIncidents: number;
                      wazeAlerts: number;
                      flowSamples: number;
                    }
                  | null
                  | undefined) && (
                  <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Radio className="w-3 h-3" />
                    Grounded with live TomTom + Google Maps data
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
                        {routeQuery.data!.route.incidents.length === 1
                          ? ""
                          : "s"}
                        )
                      </span>
                    )}
                  </span>
                )}
                {/* v11: live countdown to the computed leave-by time. nowTick
                  re-renders every 10s so this stays honest without its own
                  timer. */}
                {leaveByInfo &&
                  (() => {
                    const leaveInMin = Math.round(
                      (leaveByInfo.leave.getTime() - Date.now()) / 60_000
                    );
                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          leaveInMin <= 0
                            ? "bg-red-500/15 text-red-600 dark:text-red-400"
                            : leaveInMin <= 10
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        <Timer className="w-3 h-3" />
                        {leaveInMin <= 0
                          ? "Time to leave now"
                          : `Leave in ${leaveInMin} min`}
                      </span>
                    );
                  })()}
                {!leaveByInfo && (
                  <span className="text-xs text-muted-foreground">
                    and we'll tell you when to leave — buffer included
                  </span>
                )}
                {/* v12: wait-or-go — the chosen route's severe incidents have
                  a known clear time inside 90 minutes, so waiting actually
                  beats leaving now. */}
                {waitAdvice && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] text-blue-700 dark:text-blue-300">
                    <Lightbulb className="w-3 h-3 shrink-0" />
                    Wait ~{waitAdvice.waitMin} min —{" "}
                    {waitAdvice.roadName ? `${waitAdvice.roadName} ` : ""}
                    est. clear by {fmtTime(new Date(waitAdvice.clearByIso))},
                    saving ~{waitAdvice.delayAvoidedMin} min
                  </span>
                )}
              </div>

              {/* v13: departure outlook — projected incident delay at each
                leave-time horizon, cheapest one highlighted. */}
              {departureOutlook && (
                <div className="flex items-center gap-2 flex-wrap pt-3 border-t">
                  <span className="text-xs font-medium text-muted-foreground">
                    Delay if you leave:
                  </span>
                  {departureOutlook.horizonsMin.map((h, i) => {
                    const isBest = h === departureOutlook.bestHorizonMin;
                    return (
                      <span
                        key={h}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                          isBest
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted/60 border-border text-muted-foreground"
                        }`}
                      >
                        {h === 0 ? "now" : `+${h} min`} ·{" "}
                        {departureOutlook.delayMin[i] ?? 0} min
                        {isBest && " ✓"}
                      </span>
                    );
                  })}
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    leaving in {departureOutlook.bestHorizonMin} min saves ~
                    {departureOutlook.savesMin} min
                  </span>
                </div>
              )}

              {/* v8: turn-by-turn steps for the displayed route — tap a step
                to fly the map to where that maneuver happens. */}
              {displayedManeuvers.length > 0 && (
                <div className="pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowSteps(s => !s)}
                    className="flex w-full items-center justify-between text-xs font-semibold uppercase text-muted-foreground tracking-wide"
                  >
                    <span className="flex items-center gap-1.5">
                      <List className="w-3.5 h-3.5" />
                      Turn-by-turn · {displayedManeuvers.length} steps
                    </span>
                    <span className="normal-case font-normal">
                      {showSteps ? "Hide" : "Show"}
                    </span>
                  </button>
                  {showSteps && (
                    <div className="mt-2 max-h-64 overflow-y-auto pr-1">
                      {stepsList}
                    </div>
                  )}
                </div>
              )}

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
                        (alt.incidentDelayMin as number | undefined) ?? 0;
                      return (
                        <motion.button
                          key={i}
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setPreviewIdx(isChosen ? null : i)}
                          className={`shrink-0 min-w-[132px] rounded-lg border px-3 py-2 text-left transition-colors ${
                            isDisplayed
                              ? "border-primary/50 bg-primary/10"
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
                            {Math.round(displayDurationS(alt) / 60)} min
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
                          {/* v12: the AI's reason this route loses — the
                            "why not" behind the recommendation. */}
                          {!isChosen && routeVerdicts?.[i] && (
                            <span className="block text-[10px] text-muted-foreground mt-1 italic leading-snug">
                              {routeVerdicts[i]}
                            </span>
                          )}
                        </motion.button>
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
                      {sourceLabel(inc.source) && (
                        <span className="shrink-0 self-start rounded border border-border px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                          {sourceLabel(inc.source)}
                        </span>
                      )}
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
          </motion.div>
        )}

        {routeQuery.isError && !resultsAreStale && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card
              className="p-6 mb-8 border-destructive/30 bg-destructive/5"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {/* NOTE for Kimi: branch on error.data.code (tRPC's standard
                  error shape — see server/_core/trpc.ts errorFormatter),
                  not string-matching on .message. NOT_FOUND covers both bad
                  addresses and "no route between these points"; BAD_GATEWAY
                  means an upstream (Nominatim/OSRM/TomTom) is down or timed
                  out, not a bad address — don't tell the driver to "double
                  check" an address when the real issue is our side. If you
                  add more service.ts error paths, prefer throwing a
                  TRPCError with a specific code over a generic message so
                  this switch stays accurate instead of falling through to
                  the vague default. */}
                  {(() => {
                    const code = (
                      routeQuery.error as unknown as {
                        data?: { code?: string };
                      }
                    )?.data?.code;
                    if (code === "TOO_MANY_REQUESTS") {
                      return routeQuery.error!.message;
                    }
                    if (code === "BAD_GATEWAY") {
                      return "Routing is temporarily unavailable — try again in a moment.";
                    }
                    if (code === "NOT_FOUND" && routeQuery.error?.message) {
                      return routeQuery.error.message;
                    }
                    return "Couldn't find a route between those addresses. Double-check them and try again.";
                  })()}
                </span>
              </p>
              {/* v11: dead-zone resilience — if we can't reach the server but
                have a previous result on this device, keep the driver
                moving with their last trip's key stats. */}
              {lastResult && (
                <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-xs font-medium flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <WifiOff className="w-3.5 h-3.5" />
                    Offline — showing your last checked route
                  </p>
                  <p className="text-sm mt-1">
                    {lastResult.originName.split(",")[0]} →{" "}
                    {lastResult.destinationName.split(",")[0]} ·{" "}
                    {(lastResult.distanceM / 1609.34).toFixed(1)} mi · ~
                    {Math.round(lastResult.durationS / 60)} min
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {lastResult.explanation}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Saved{" "}
                    {Math.max(
                      1,
                      Math.round((Date.now() - lastResult.savedAt) / 60_000)
                    )}{" "}
                    min ago — conditions may have changed.
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Active incidents feed (list form, for accessibility / no-JS-map
            fallback — the map above already shows these live).
            NOTE FOR KIMI: this is the *regional* feed (all incidents in the
            metro area), not filtered to the current route — it's a
            different data source than route.incidents used everywhere
            above (mobileSummary, the sheet, "Incidents on this route").
            Users read "Route is clear" up top and then see this list full
            of incidents right below it and think the two contradict each
            other; they don't, they're answering different questions. Label
            says so explicitly now — don't quietly rename this back to
            "Active incidents" without the qualifier. */}
        <Card className="p-6 sm:p-8 mb-10">
          <div className="flex items-center justify-between gap-2 mb-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Nearby incidents, Oregon / SW Washington (not filtered to your
              route)
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
                aria-label="Refresh incidents now"
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
                  {sourceLabel(inc.source as string) && (
                    <span className="shrink-0 self-start rounded border border-border px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      {sourceLabel(inc.source as string)}
                    </span>
                  )}
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
            happening — not just a red line on a map. Those feeds now span ODOT
            TripCheck, 511, National Weather Service weather alerts, and WSDOT
            highway alerts — and traffic-camera pins show real snapshots of the
            road along your route, not just dots. Every pick is grounded with
            live TomTom Traffic flow speeds and Google Maps traffic alerts, so
            the AI reasons over measured current conditions, not just reported
            ones.
          </p>
          <p>
            Set an arrive-by time and RoutePulse tells you when to leave,
            padding the estimate by the delay your route's incidents are
            expected to cost. Compare every route option side by side with
            estimated delay minutes, follow the route step by step with
            turn-by-turn directions, see which stretches are running slow, speak
            your addresses instead of typing, and copy a plain-text trip summary
            for dispatch — all without an account.
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
