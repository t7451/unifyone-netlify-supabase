/**
 * Memoized Leaflet surface for RoutePulse.
 * Parent sheet/GPS/form state must NOT rebuild this tree unless map props change.
 */
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  Circle,
  CircleMarker,
  ScaleControl,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type LatLngExpression, type LatLngBoundsExpression } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { softInvalidateSize } from "./mapInvalidate";

export const DEFAULT_CENTER: LatLngExpression = [45.5152, -122.6784];
export const DEFAULT_ZOOM = 10;

export const BASEMAPS = {
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

export type BasemapKey = keyof typeof BASEMAPS;

export type ViewportBbox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

const ORIGIN_ICON = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const DEST_ICON = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const USER_LOCATION_ICON = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.25)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const headingConeIconCache = new Map<number, L.DivIcon>();
/**
 * Direction-of-travel cone behind the live location dot (Google Maps
 * style). The triangle's apex sits at the dot and the cone widens in the
 * heading direction; the whole div rotates around the apex. Cached per
 * rounded-degree so a steady heading doesn't churn new DivIcon instances
 * every GPS tick.
 */
function headingConeIcon(deg: number): L.DivIcon {
  const rounded = Math.round(deg);
  const hit = headingConeIconCache.get(rounded);
  if (hit) return hit;
  const icon = L.divIcon({
    className: "",
    html: `<div style="width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:36px solid rgba(37,99,235,0.30);transform:rotate(${rounded}deg);transform-origin:50% 100%"></div>`,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
  });
  if (headingConeIconCache.size >= 360) headingConeIconCache.clear();
  headingConeIconCache.set(rounded, icon);
  return icon;
}

const letterPinCache = new Map<string, L.DivIcon>();
function letterPinIcon(letter: string, color = "#8b5cf6") {
  const key = `${letter}|${color}`;
  const hit = letterPinCache.get(key);
  if (hit) return hit;
  const icon = L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font:700 11px/1 system-ui,sans-serif;color:white">${letter}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  letterPinCache.set(key, icon);
  return icon;
}

const INCIDENT_COLORS: Record<string, string> = {
  minor: "#eab308",
  moderate: "#f97316",
  major: "#dc2626",
  critical: "#991b1b",
};
const INCIDENT_RADIUS: Record<string, number> = {
  minor: 5,
  moderate: 6,
  major: 7,
  critical: 8,
};

function createRouteCanvasRenderer(): L.Canvas {
  const dpr =
    typeof window !== "undefined"
      ? Math.min(window.devicePixelRatio || 1, 2)
      : 1;
  const mobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 640px)").matches;
  return L.canvas({
    padding: mobile ? 0.35 : 0.5,
    // Higher tolerance = fewer path points painted → better pan FPS on phones
    tolerance: mobile ? 2.0 / dpr : 0.75 / dpr,
  });
}

function routePathDefaults(extra: L.PathOptions = {}): L.PathOptions {
  return {
    interactive: false,
    bubblingMouseEvents: false,
    // Leaflet simplifies geometry further at paint time; higher = cheaper pan
    smoothFactor: 2.25,
    noClip: false,
    ...extra,
  };
}

function MapCanvasPerf() {
  const map = useMap();
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => softInvalidateSize(map), 200);
    };
    map.on("resize", onResize);
    return () => {
      if (t) clearTimeout(t);
      map.off("resize", onResize);
    };
  }, [map]);
  return null;
}

function MapClickHandler({
  onSetAddress,
}: {
  onSetAddress: (addr: string) => void;
}) {
  useMapEvents({
    click: async e => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent":
                "UnifyOne-RoutePulse/1.0 (+https://1commerce.online)",
            },
          }
        );
        if (!res.ok) {
          onSetAddress(
            `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`
          );
          return;
        }
        const body = (await res.json()) as { display_name?: string };
        onSetAddress(
          body.display_name ??
            `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`
        );
      } catch {
        onSetAddress(`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
      }
    },
  });
  return null;
}

function MapInteractionHandler({ onDrag }: { onDrag: () => void }) {
  useMapEvents({
    dragstart: () => onDrag(),
  });
  return null;
}

function MapViewportTracker({
  onChange,
  enabled = true,
}: {
  onChange: (bbox: ViewportBbox) => void;
  enabled?: boolean;
}) {
  const map = useMap();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRef = useRef<ViewportBbox | null>(null);

  const report = () => {
    if (!enabled) return;
    const b = map.getBounds().pad(0.2);
    const next: ViewportBbox = {
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    };
    const prev = lastRef.current;
    if (prev) {
      const dLat =
        Math.abs(prev.minLat - next.minLat) +
        Math.abs(prev.maxLat - next.maxLat);
      const dLng =
        Math.abs(prev.minLng - next.minLng) +
        Math.abs(prev.maxLng - next.maxLng);
      if (dLat + dLng < 0.02) return;
    }
    lastRef.current = next;
    onChange(next);
  };

  useEffect(() => {
    if (!enabled) return;
    report();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, enabled]);

  useMapEvents({
    moveend: () => {
      if (!enabled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      const mobile =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 640px)").matches;
      timerRef.current = setTimeout(report, mobile ? 1200 : 750);
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

function FitBounds({
  bounds,
  fitKey,
  skipAutoFit,
}: {
  bounds: LatLngBoundsExpression | null;
  fitKey: string | null;
  skipAutoFit: MutableRefObject<boolean>;
}) {
  const map = useMap();
  const fittedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bounds || !fitKey || skipAutoFit.current) return;
    if (fittedKeyRef.current === fitKey) return;
    fittedKeyRef.current = fitKey;
    const mobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    const pad: [number, number] = mobile ? [36, 36] : [48, 48];
    map.fitBounds(bounds, {
      padding: pad,
      maxZoom: mobile ? 13 : 14,
      animate: false,
    });
  }, [bounds, fitKey, map, skipAutoFit]);

  useEffect(() => {
    if (!fitKey) fittedKeyRef.current = null;
  }, [fitKey]);

  return null;
}

export type RouteMapIncident = {
  id: string;
  lat: number;
  lng: number;
  severity?: string;
  road_name?: string | null;
  description?: string | null;
  incident_type?: string | null;
};

export type RouteMapCamera = {
  id: string;
  lat: number;
  lng: number;
  name?: string | null;
  url?: string | null;
};

export type RouteMapProps = {
  mapRef: RefObject<L.Map | null>;
  basemap: BasemapKey;
  /** TomTom live traffic flow raster (proxied). */
  trafficOverlay?: boolean;
  hasRoute: boolean;
  hasActiveRoute: boolean;
  mapBounds: LatLngBoundsExpression | null;
  mapFitKey: string | null;
  userPannedRef: MutableRefObject<boolean>;
  onViewportChange: (bbox: ViewportBbox) => void;
  onDrag: () => void;
  onSetAddress: (addr: string) => void;
  userLocation: LatLngExpression | null;
  /** Device/GPS-bearing heading in degrees, or null when stationary/unknown. */
  heading: number | null;
  accuracy: number | null;
  displayedLine: LatLngExpression[] | null;
  segmentLines: Array<{ positions: LatLngExpression[]; color: string }>;
  flowPoints: Array<{
    lat: number;
    lng: number;
    ratio: number | null;
    closed: boolean;
    currentMph?: number | null;
    freeflowMph?: number | null;
  }>;
  altLines: Array<{ key: string; positions: LatLngExpression[] }>;
  origin?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  stops: Array<{ lat: number; lng: number }>;
  routeIncidents: RouteMapIncident[];
  emptyIncidents: RouteMapIncident[];
  routeCameras: RouteMapCamera[];
  emptyCameras: RouteMapCamera[];
  camerasOn: boolean;
  transit: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
    kind: string;
  }>;
  routeCanvasRenderer?: L.Canvas;
};

function RouteMapInner(props: RouteMapProps) {
  const renderer = useMemo(
    () => props.routeCanvasRenderer ?? createRouteCanvasRenderer(),
    [props.routeCanvasRenderer]
  );

  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 640px)").matches;

  return (
    <MapContainer
      ref={props.mapRef as any}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      scrollWheelZoom={!isMobile}
      doubleClickZoom={!isMobile}
      zoomSnap={isMobile ? 0.25 : 0.5}
      zoomDelta={isMobile ? 0.5 : 0.5}
      wheelPxPerZoomLevel={100}
      preferCanvas
      renderer={renderer}
      fadeAnimation={false}
      markerZoomAnimation={false}
      zoomAnimation={!isMobile}
      inertia
      inertiaDeceleration={isMobile ? 2500 : 3000}
      bounceAtZoomLimits={false}
      style={{
        height: "100%",
        width: "100%",
        touchAction: "manipulation",
        contain: "strict",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <TileLayer
        key={props.basemap}
        attribution={BASEMAPS[props.basemap].attribution}
        url={BASEMAPS[props.basemap].url}
        updateWhenZooming={false}
        updateWhenIdle
        keepBuffer={isMobile ? 1 : 2}
      />
      {props.trafficOverlay && (
        <TileLayer
          key="tomtom-flow"
          url="/api/tomtom-traffic-tile/flow/{z}/{x}/{y}"
          attribution='&copy; <a href="https://www.tomtom.com/">TomTom</a> traffic'
          opacity={0.72}
          maxZoom={22}
          updateWhenZooming={false}
          updateWhenIdle
          keepBuffer={isMobile ? 1 : 2}
          zIndex={350}
        />
      )}
      <MapCanvasPerf />
      {/* Zoom/scale are desktop chrome — pinch + sheet own phones */}
      {!isMobile && <ZoomControl position="topright" />}
      {!isMobile && (
        <ScaleControl position="topright" metric={false} imperial />
      )}
      <FitBounds
        bounds={props.mapBounds}
        fitKey={props.mapFitKey}
        skipAutoFit={props.userPannedRef}
      />
      <MapViewportTracker
        onChange={props.onViewportChange}
        enabled={!props.hasActiveRoute}
      />
      <MapInteractionHandler
        onDrag={() => {
          props.onDrag();
          props.userPannedRef.current = true;
        }}
      />
      <MapClickHandler onSetAddress={props.onSetAddress} />

      {props.userLocation && (
        <>
          {props.accuracy !== null &&
            props.accuracy < (isMobile ? 80 : 500) && (
              <Circle
                center={props.userLocation}
                radius={props.accuracy}
                pathOptions={routePathDefaults({
                  renderer,
                  color: "#2563eb",
                  weight: 1,
                  opacity: 0.45,
                  fillColor: "#2563eb",
                  fillOpacity: 0.06,
                  smoothFactor: 3,
                })}
              />
            )}
          {props.heading != null && (
            <Marker
              position={props.userLocation}
              icon={headingConeIcon(props.heading)}
              interactive={false}
            />
          )}
          <Marker position={props.userLocation} icon={USER_LOCATION_ICON} />
        </>
      )}

      {props.hasRoute && props.origin && props.destination && (
        <>
          <Marker
            position={[props.origin.lat, props.origin.lng]}
            icon={ORIGIN_ICON}
          />
          <Marker
            position={[props.destination.lat, props.destination.lng]}
            icon={DEST_ICON}
          />
          {props.stops.map((s, i) => (
            <Marker
              key={`stop-${i}`}
              position={[s.lat, s.lng]}
              icon={letterPinIcon(
                String.fromCharCode(65 + (i % 26)),
                "#8b5cf6"
              )}
            />
          ))}
          {!isMobile &&
            props.transit.map(lm => (
              <Marker
                key={lm.id}
                position={[lm.lat, lm.lng]}
                icon={letterPinIcon(
                  lm.kind === "max" ? "M" : lm.kind === "streetcar" ? "S" : "T",
                  "#0d9488"
                )}
                title={lm.name}
              >
                <Popup>
                  <span className="text-xs font-medium">{lm.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    TriMet {lm.kind.replace("_", " ")}
                  </span>
                </Popup>
              </Marker>
            ))}
          {props.displayedLine &&
            (props.segmentLines.length > 0 ? (
              <>
                <Polyline
                  positions={props.displayedLine}
                  pathOptions={routePathDefaults({
                    renderer,
                    color: "#1e3a8a",
                    weight: 7,
                    opacity: 0.25,
                    smoothFactor: 2,
                  })}
                />
                {props.segmentLines.map((seg, i) => (
                  <Polyline
                    key={`seg-${i}`}
                    positions={seg.positions}
                    pathOptions={routePathDefaults({
                      renderer,
                      color: seg.color,
                      weight: 6,
                      opacity: 0.95,
                      lineCap: "round",
                      lineJoin: "round",
                      smoothFactor: 1.75,
                    })}
                  />
                ))}
                {!isMobile &&
                  props.flowPoints.map((p, i) => {
                    const ratio = p.ratio ?? (p.closed ? 0 : 1);
                    const fill =
                      p.closed || ratio < 0.45
                        ? "#ef4444"
                        : ratio < 0.75
                          ? "#f59e0b"
                          : "#22c55e";
                    return (
                      <CircleMarker
                        key={`flow-${i}`}
                        center={[p.lat, p.lng]}
                        radius={5}
                        pathOptions={routePathDefaults({
                          renderer,
                          color: "#0f172a",
                          weight: 1,
                          fillColor: fill,
                          fillOpacity: 0.95,
                          interactive: true,
                        })}
                      >
                        <Popup>
                          <span className="text-xs font-medium">
                            Live traffic probe
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {p.closed
                              ? "Road closed (TomTom)"
                              : `${Math.round(ratio * 100)}% of free-flow`}
                          </span>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
              </>
            ) : (
              <Polyline
                positions={props.displayedLine}
                pathOptions={routePathDefaults({
                  renderer,
                  color: "#3b82f6",
                  weight: isMobile ? 5 : 6,
                  opacity: 0.92,
                  lineCap: "round",
                  lineJoin: "round",
                  smoothFactor: isMobile ? 3 : 2.25,
                })}
              />
            ))}
          {(isMobile ? props.altLines.slice(0, 1) : props.altLines).map(alt => (
            <Polyline
              key={alt.key}
              positions={alt.positions}
              pathOptions={routePathDefaults({
                renderer,
                color: "#94a3b8",
                weight: isMobile ? 2 : 3,
                opacity: isMobile ? 0.4 : 0.55,
                dashArray: isMobile ? undefined : "6, 8",
                smoothFactor: 3,
              })}
            />
          ))}
          {(isMobile
            ? props.routeIncidents.slice(0, 24)
            : props.routeIncidents
          ).map(inc => (
            <CircleMarker
              key={inc.id}
              center={[inc.lat, inc.lng]}
              radius={
                isMobile
                  ? Math.max(
                      4,
                      (INCIDENT_RADIUS[inc.severity ?? "minor"] ?? 5) - 1
                    )
                  : (INCIDENT_RADIUS[inc.severity ?? "minor"] ?? 5)
              }
              pathOptions={routePathDefaults({
                renderer,
                color: "#fff",
                weight: 1,
                fillColor:
                  INCIDENT_COLORS[inc.severity ?? "minor"] ?? "#eab308",
                fillOpacity: 0.95,
                interactive: true,
              })}
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
            </CircleMarker>
          ))}
          {props.camerasOn &&
            (isMobile
              ? props.routeCameras.slice(0, 12)
              : props.routeCameras
            ).map(cam => (
              <CircleMarker
                key={cam.id}
                center={[cam.lat, cam.lng]}
                radius={isMobile ? 3 : 4}
                pathOptions={routePathDefaults({
                  renderer,
                  color: "#a855f7",
                  weight: 1,
                  fillColor: "#a855f7",
                  fillOpacity: 0.85,
                  interactive: true,
                })}
              >
                <Popup>
                  <span className="text-xs font-medium">
                    {cam.name ?? "Camera"}
                  </span>
                </Popup>
              </CircleMarker>
            ))}
        </>
      )}

      {!props.hasRoute && (
        <MarkerClusterGroup
          chunkedLoading
          chunkInterval={isMobile ? 120 : 50}
          chunkDelay={isMobile ? 40 : 20}
          maxClusterRadius={isMobile ? 90 : 60}
          disableClusteringAtZoom={isMobile ? 14 : 16}
          spiderfyOnMaxZoom={false}
          animate={false}
          removeOutsideVisibleBounds
        >
          {(isMobile
            ? props.emptyIncidents.slice(0, 40)
            : props.emptyIncidents
          ).map(inc => (
            <CircleMarker
              key={inc.id}
              center={[inc.lat, inc.lng]}
              radius={INCIDENT_RADIUS[inc.severity ?? "minor"] ?? 5}
              pathOptions={routePathDefaults({
                renderer,
                color: "#fff",
                weight: 1,
                fillColor:
                  INCIDENT_COLORS[inc.severity ?? "minor"] ?? "#eab308",
                fillOpacity: 0.9,
                interactive: true,
              })}
            >
              <Popup>
                <div className="text-sm space-y-0.5">
                  {inc.road_name && (
                    <p className="font-medium">{inc.road_name}</p>
                  )}
                  <p>{inc.description ?? inc.incident_type}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MarkerClusterGroup>
      )}

      {!props.hasRoute && props.camerasOn && props.emptyCameras.length > 0 && (
        <MarkerClusterGroup
          chunkedLoading
          animate={false}
          maxClusterRadius={isMobile ? 80 : 50}
          removeOutsideVisibleBounds
        >
          {(isMobile
            ? props.emptyCameras.slice(0, 20)
            : props.emptyCameras
          ).map(cam => (
            <CircleMarker
              key={cam.id}
              center={[cam.lat, cam.lng]}
              radius={4}
              pathOptions={routePathDefaults({
                renderer,
                color: "#a855f7",
                weight: 1,
                fillColor: "#a855f7",
                fillOpacity: 0.8,
                interactive: true,
              })}
            >
              <Popup>
                <span className="text-xs">{cam.name ?? "Camera"}</span>
              </Popup>
            </CircleMarker>
          ))}
        </MarkerClusterGroup>
      )}
    </MapContainer>
  );
}

function propsEqual(a: RouteMapProps, b: RouteMapProps): boolean {
  return (
    a.basemap === b.basemap &&
    a.trafficOverlay === b.trafficOverlay &&
    a.hasRoute === b.hasRoute &&
    a.hasActiveRoute === b.hasActiveRoute &&
    a.mapFitKey === b.mapFitKey &&
    a.camerasOn === b.camerasOn &&
    a.userLocation === b.userLocation &&
    a.heading === b.heading &&
    a.accuracy === b.accuracy &&
    a.displayedLine === b.displayedLine &&
    a.segmentLines === b.segmentLines &&
    a.flowPoints === b.flowPoints &&
    a.altLines === b.altLines &&
    a.origin === b.origin &&
    a.destination === b.destination &&
    a.stops === b.stops &&
    a.routeIncidents === b.routeIncidents &&
    a.emptyIncidents === b.emptyIncidents &&
    a.routeCameras === b.routeCameras &&
    a.emptyCameras === b.emptyCameras &&
    a.transit === b.transit &&
    a.mapBounds === b.mapBounds
  );
}

export const RouteMap = memo(RouteMapInner, propsEqual);
