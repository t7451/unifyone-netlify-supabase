# RoutePulse type and map repair — October 23, 2026

Continues draft PR #458. The repository-wide `pnpm check` now passes with zero
errors; all 20 previously reported RoutePulse errors are resolved without
disabling strictness, suppressing diagnostics, or changing the global target.

## Repairs

- Use Leaflet's polyline options for route paths, including simplification and
  clipping settings. Preserve runtime map options.
- Remove a mobile-summary argument the helper never consumed; normalize null
  alternative verdicts to the helper's optional input.
- Carry the actual LineString geometry type through route scoring and document
  optional provider-reported traffic delay.
- Convert Set iteration to Array.from for the existing compiler configuration.
- Preserve the typed TomTom API-label union during cached-result refresh and
  provide complete, refreshed grounding counts, including old cache records
  without grounding metadata.
- Import the missing Gemini fallback model constant. A configured Gemini key
  previously caused an exception before invocation and silently selected the
  deterministic fallback instead.
- Remove a redundant fastest-preference comparison inside a branch already
  narrowed to other preferences.

## Basemap recovery

Browser inspection found CARTO's `API key required` tiles instead of streets.
RoutePulse now uses standard OpenStreetMap tiles when the optional public
`VITE_CARTO_BASEMAP_KEY` is absent. Configured builds retain CARTO Voyager and
Dark Matter. The fallback's dark filter applies only to the basemap layer.
Attribution remains visible; native zoom is capped at 19 and browser referrer
and caching behavior are preserved. No offline tile prefetch was added.

References: [CARTO key guidance](https://www.carto.com/basemaps/apikey/index.html)
and [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
OSM is a best-effort public tile service, not a guaranteed production SLA.

## Validation

- Full repository TypeScript check: zero errors. Production build and SEO gates
  pass; sitemap coverage remains 220/220 routes.
- Focused RoutePulse suites: 97 tests pass. New regressions cover configured
  Gemini scoring, live traffic refresh of old/new cache records, unique API
  labels, and both keyed and keyless basemap configuration.
- The existing RoutePulse service suite had 13 failing expectations on the
  unchanged commit. A temporary Vite transform loaded the exact HEAD service
  and test sources to reproduce them. Tests now account for balanced-mode
  wording and surface-road requests; tests asserting no AI use select fastest
  explicitly. Production preference/ranking policy was not changed.
- Full suite (`pnpm test --maxWorkers=2`): 896 passed, 7 skipped, 11 failed
  across 4 of 104 files. The failures reproduce with the unchanged baseline:
  `kaiAgent.test.ts` (missing model mock exports / old model expectation),
  `kaiModels.test.ts` (old free-provider expectation), `publicCrawl.test.ts`
  (Windows URL-to-path handling), and `resourceDownloads.test.ts` (obsolete
  assumption that Resources still advertises generated downloads).
- Browser smoke checks: RoutePulse renders at 320/1024 widths without horizontal
  overflow; stop/deadline controls and preference selection work. Both basemap
  styles load real streets, with OSM attribution and no CARTO watermark.
  Local screenshots: `.agent-output/routepulse-review/`.

The standalone Vite review does not serve backend APIs. Live routing, provider
credentials, geolocation, paid model calls, and production deployment were not
exercised. External calls in RoutePulse service tests are mocked. This repair
does not activate integrations or merge the draft PR.
