# RoutePulse roadmap status

Updated: 2026-08-16

## Milestone 1 — Core web loop — **DONE**
Share URL, OG ETA title, max-3 alternatives, stop markers A/B/C, mobile peek,
handoff Google/Apple, cameras on demand, clustering.

## Milestone 2 — Reliability & offline-lite — **MOSTLY DONE**
| Item | Status |
|---|---|
| SW app shell | Done |
| IDB last route + trip | Done |
| Tile warm (quota) | Done (lite) |
| Off-route → Recalculate | Done |
| Wake Lock | Done |
| Nearby feed collapses after route | Done (v29) |

## Milestone 3 — Regional accuracy — **IN PROGRESS**
| Item | Status |
|---|---|
| Local knowledge + density | Done |
| Denser TomTom flow + traffic ETA | Done (v28+) |
| Dual OSRM env | Done (ops to host) |
| Golden set 50 PDX | Done + `scripts/eval-pdx-golden.mjs` |
| TriMet landmarks near route | Done (filtered ≤2.5 km) |
| Self-hosted OSRM VM | **Ops decision** (cheap, optional until quota pain) |
| Valhalla eval | Deferred |

## Milestone 4 — Monetization — **NOT STARTED**
Charge later for: multi-stop optimize, saved routes, fleet share, historical pack freshness, higher offline limits.
Keep basic A→B + incidents free.

## Next engineering priorities
1. Reverse-geocode raw GPS origins for readable labels
2. Desktop map-first layout (less center-card chrome)
3. Golden live eval in CI (sampled, rate-limited)
4. Self-hosted OR/WA OSRM when public demo or TomTom quota pressures
