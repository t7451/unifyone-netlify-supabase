# RoutePulse M2 / M3 notes

## M2 — Reliability & offline-lite

| Capability | Implementation |
|---|---|
| App shell SW | `client/public/sw.js` (Phase 0) |
| Last route payload | IndexedDB via `routeOfflineStore.ts` (+ legacy localStorage) |
| Active trip snapshot | `saveActiveTrip` on Start trip |
| Tile cache (bbox) | `tileCache.ts` — max 400 entries, CARTO host allowlist, warm on trip start |
| Off-route | `distanceToPolylineM` + 2 strikes → **Recalculate from here** |
| Wake Lock | Trip mode (v26) |

Recalculate sets origin to current GPS and re-runs `getRoute` — no silent background OSRM polling.

## M3 — Regional accuracy

| Capability | Implementation |
|---|---|
| Local knowledge | `portlandLocalKnowledge.ts` (corridors + dated events) |
| Incident density | PostGIS `incident_density_near_route` |
| Self-hosted OSRM | `OSRM_URL` primary + `OSRM_FALLBACK_URL` secondary (429/5xx/network) |
| Golden set | `pdxGoldenRoutes.ts` — 50 PDX OD pairs with labels |
| TriMet context | `trimetContext.ts` + `listTransitLandmarks` — map pins, not routing |

### Self-hosted OSRM (recommended production)

1. Build an OSRM graph from Geofabrik `oregon-latest.osm.pbf` (+ washington if needed).
2. Run `osrm-routed` behind HTTPS.
3. Set Netlify env:
   - `OSRM_URL=https://your-osrm.example`
   - `OSRM_FALLBACK_URL=https://router.project-osrm.org` (optional)

### Golden-set eval (manual / CI later)

```ts
import { PDX_GOLDEN_ROUTES } from "./pdxGoldenRoutes";
// For each route: geocode → getRoute → assert label heuristics offline
```
