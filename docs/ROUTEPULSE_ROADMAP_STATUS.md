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

## Milestone 5 — Deadline-aware multi-stop (VRPTW) — **v1 DONE**

Prompted by a real courier route (14+ stops, Wilsonville/Tigard/Lake
Oswego/Portland/Hillsboro/Beaverton, most with hard pickup-time windows
14:00-19:30). Audit found the existing multi-stop optimizer
(`optimizeStopsViaMatrix`/`optimizeStopsTomTom`, NN+2-opt) has **zero**
concept of time windows — it minimizes distance/time only, and the
`stops` schema was hard-capped at 8 (this route has 15). Fed as-is, it
would silently reorder past several real deadlines.

| Item                                                                                                    | Status                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stops can carry an optional `dueBy` ("HH:MM") deadline                                                  | Done — `stops: z.array(string \| {address, dueBy})`, max raised 8→15                                                                                                                                                                                                                        |
| Optional `departAt` ("HH:MM", default now, Portland-local)                                              | Done                                                                                                                                                                                                                                                                                        |
| `scheduleStopsWithDeadlines` — cheapest-feasible-insertion VRPTW-lite heuristic                         | Done (`routePulse.service.ts`) — builds the route stop by stop, inserting whichever remaining stop/position costs least extra travel time _without_ pushing an already-placed stop past its deadline; falls back to TomTom Matrix v2 travel times when available, haversine/25mph otherwise |
| Infeasibility reporting (not silent reordering past a deadline)                                         | Done — `stopSchedule.feasible` + per-stop `lateByMin`, surfaced in the UI as "N min late overall — not all deadlines are reachable"                                                                                                                                                         |
| Deadline scheduling takes priority over plain optimizeStops whenever any stop has a dueBy               | Done                                                                                                                                                                                                                                                                                        |
| Per-stop "Due by" + shared "Depart at" UI inputs, schedule results panel                                | Done (`client/src/pages/RoutePulse/index.tsx`)                                                                                                                                                                                                                                              |
| Unit tests against a scaled synthetic version of the real route (return-trip-through-Wilsonville shape) | Done — 6 new tests in `routePulse.service.test.ts`                                                                                                                                                                                                                                          |
| Deadlines carried through mid-trip "Recalculate from here"                                              | **Not done** — recalculate re-plans with addresses only, deadlines are dropped (v1 simplification)                                                                                                                                                                                          |
| Deadlines carried into the shareable URL                                                                | **Not done** — same simplification; share links reopen with addresses only                                                                                                                                                                                                                  |
| Timezone handling                                                                                       | Portland-local (`America/Los_Angeles`) hardcoded — fine for this tool's actual service area, would need generalizing for other regions                                                                                                                                                      |

## Milestone 6 — Import the whole route from a photo — **v1 DONE**

Typing a 14-stop courier sheet into the form by hand defeats the point of
a "fast" tool. New `routePulse.importStopsFromImage` mutation sends a
downscaled photo (client-side canvas resize, ≤1600px longest edge, JPEG
0.85) to Gemini 2.5 Flash (vision) with a structured-extraction prompt —
text-only fallback models are deliberately excluded since a model that
can't see the image would just hallucinate rows. Returns each row's
address, customer/business label, and `dueBy` (or null for "on call"/no
fixed time rows), capped at 15 and merged into the existing per-stop
due-by UI from Milestone 5.

| Item                                                                              | Status                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `importStopsFromImage` mutation (vision LLM, JSON-only response, capped 15 stops) | Done (`routePulse.service.ts` / `index.ts`)                                                                                                                                                                                                   |
| Dedicated rate limit (vision calls cost real money)                               | Done — `routeSheetImportLimiter`, 6/5min per IP                                                                                                                                                                                               |
| Client-side downscale before upload                                               | Done — `downscaleImageToDataUrl`; helps stay under the payload cap (not a guarantee — an unusually dense source image could still exceed it) and cuts LLM cost/latency                                                                        |
| "📷 Import from photo" buttons (empty state + already-open stops panel)           | Done                                                                                                                                                                                                                                          |
| Merge behavior                                                                    | Appends after any already-typed stops (blank placeholder rows dropped first) rather than always replacing                                                                                                                                     |
| Tests                                                                             | Done — 4 new tests: missing API key, a realistic multi-row response with on-call rows and a >15-row cap, unparseable model output, and an unparseable `dueBy` value getting dropped rather than passed through                                |
| Not done                                                                          | Geocoding/validating each extracted address happens the same way manual entry does (on submit) — the import step itself doesn't verify addresses resolve, so a misread address surfaces as a normal geocode failure later, not at import time |

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
above: 30 pre-existing `pnpm lint` errors caused by dead code left over
from the RouteMap.tsx extraction (unused Leaflet imports/icons/
components in `index.tsx`, an unused import in `routePulse.service.ts`,
an unused helper in `mapHandoff.ts`) that had `pnpm lint` — and
therefore CI — failing on this branch. Separately, fixed a pre-existing
broken assertion (an `||` between two `expect()` calls instead of a
single boolean assertion) in `mapHandoff.test.ts`.
