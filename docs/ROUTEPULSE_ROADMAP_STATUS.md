# RoutePulse roadmap status

Updated: 2026-08-21

## Milestone 1 — Core web loop — **DONE**

Share URL, OG ETA title, max-3 alternatives, stop markers A/B/C, mobile peek,
handoff Google/Apple, cameras on demand, clustering.

## Milestone 2 — Reliability & offline-lite — **MOSTLY DONE**

| Item                              | Status      |
| --------------------------------- | ----------- |
| SW app shell                      | Done        |
| IDB last route + trip             | Done        |
| Tile warm (quota)                 | Done (lite) |
| Off-route → Recalculate           | Done        |
| Wake Lock                         | Done        |
| Nearby feed collapses after route | Done (v29)  |

## Milestone 3 — Regional accuracy — **IN PROGRESS**

| Item                             | Status                                              |
| -------------------------------- | --------------------------------------------------- |
| Local knowledge + density        | Done                                                |
| Denser TomTom flow + traffic ETA | Done (v28+)                                         |
| Dual OSRM env                    | Done (ops to host)                                  |
| Golden set 50 PDX                | Done + `scripts/eval-pdx-golden.mjs`                |
| TriMet landmarks near route      | Done (filtered ≤2.5 km)                             |
| Self-hosted OSRM VM              | **Ops decision** (cheap, optional until quota pain) |
| Valhalla eval                    | Deferred                                            |

## Milestone 4 — Monetization — **NOT STARTED**

Charge later for: multi-stop optimize, saved routes, fleet share, historical pack freshness, higher offline limits.
Keep basic A→B + incidents free.

## Next engineering priorities

1. ~~Reverse-geocode raw GPS origins for readable labels~~ — **Done.** The
   only remaining gap was `handleRecalculateFromHere` (off-route
   "Recalculate from here"), which set the origin field to raw
   `lat, lng` text; it now reverse-geocodes the GPS fix the same way
   `handleUseCurrentAsOrigin` and map-click already did, falling back to
   raw coordinates only if the reverse-geocode call fails. Also removed a
   dead, unused `MapClickHandler`/`reverseGeocode` duplicate in
   `index.tsx` left over from before the map click handler moved into
   `RouteMap.tsx`.
2. ~~Desktop map-first layout (less center-card chrome)~~ — **Done.** The
   full-bleed map already broke out to `w-screen` on desktop, so the
   chrome eating the fold was the marketing hero above it (label + h1 +
   gold rule + paragraph, ~200px). It now collapses to a slim title
   strip once `hasRoute`, so the map gets that space back once the tool
   is actually in use; the full hero still shows on first load.
3. ~~Golden live eval in CI (sampled, rate-limited)~~ — **Done.** New
   `.github/workflows/routepulse-golden-eval.yml`: structure check on
   every PR touching RoutePulse routing code, plus a sampled live check
   (`scripts/eval-pdx-golden.mjs --live`, 5 routes, 1.5s between calls)
   against production on a daily schedule and `workflow_dispatch`. The
   script now exits non-zero when fewer than half the sampled routes
   resolve, so CI actually gates on it instead of only logging.
4. Self-hosted OR/WA OSRM when public demo or TomTom quota pressures —
   ops decision, not implemented in this pass (requires provisioning a
   VM/hosting decision outside the repo).

## Known issue found this pass (not fixed — needs its own investigation)

`pnpm test` has 21 pre-existing failures across 3 files (863 passing),
reproducing identically before and after this pass's changes — not a
regression from anything above. Most are in
`routePulse.service.test.ts` and look like the LLM-arbitration gating
(`invokeLLM`) and the OSRM fallback-host call count drifted out of sync
with what the tests assert (e.g. a "never calls TomTom on NOT_FOUND"
test now sees 2 calls instead of 1; an "incidents RPC errors → skip LLM"
test now sees `invokeLLM` called once). This needs someone to look at
whether the service's gating logic changed intentionally and the tests
are stale, or the reverse. Also fixed in this pass, unrelated to the
above: 30 pre-existing `pnpm lint` errors (all dead code left over from
the RouteMap.tsx extraction — unused Leaflet imports/icons/components in
`index.tsx`, an unused import in `routePulse.service.ts`, an unused
helper in `mapHandoff.ts`, and a broken assertion in
`mapHandoff.test.ts`) that had `pnpm lint` — and therefore CI — failing
on this branch.
