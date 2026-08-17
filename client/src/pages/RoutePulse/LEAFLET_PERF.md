# RoutePulse Leaflet performance notes

## Architecture
- `RouteMap.tsx` — `React.memo` map surface (sheet/form/GPS chrome cannot rebuild layers unless map props change)
- Shared canvas renderer for vectors; empty-state incidents/cameras as **CircleMarker** (not DivIcon)
- Cameras viewport-culled via `viewportBbox`
- `softInvalidateSize` → `{ animate: false, pan: false, debounceMoveend: true }`

## Measure on mid Android
1. Chrome → Site settings → clear cache for 1commerce.online
2. Open `/tools/route-pulse`, plan a PDX route
3. DevTools remote → Performance → record 5s of pan/zoom
4. Compare FPS route-on vs empty map; target smooth 50+ on mid device for route-only

## Do not
- fitBounds to statewide incidents
- invalidateSize without pan:false
- CSS animate-ping on many markers
