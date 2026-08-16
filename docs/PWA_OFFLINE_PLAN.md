# PWA + Offline Plan (UnifyOne / RoutePulse)

Status: **Phase 0 live** (shell SW + registration). Phase 1–3 planned.

## Goals

1. Instant return visits on mobile (cached app shell).
2. RoutePulse usable on weak signal: last route, steps, polyline offline.
3. Optional map-tile offline for **active route bbox only** (quota-safe).
4. Never break deploys with stale hashed assets or sticky old HTML.

## Current state (Phase 0)

| Piece | Location | Behavior |
|---|---|---|
| Service worker | `client/public/sw.js` | Network-first HTML; cache-first content-hashed assets; **never** intercepts `/api/*` |
| Registration | `client/src/lib/pwa.ts` | Prod-only; auto-reload on controller change; update on focus |
| Manifest | `client/public/manifest.webmanifest` | Installable icons / standalone |
| Build stamp | Vite `closeBundle` replaces `__SW_BUILD__` | Each deploy invalidates SW cache name |

## Constraints (why this is careful)

- **iOS Safari**: limited background GPS; manual “Add to Home Screen”; no reliable `beforeinstallprompt`.
- **Memory**: caching all OSM tiles for PDX will crash tabs — bbox-only + hard quota.
- **CSP / Netlify**: SW must stay same-origin; no intercept of Netlify Functions.
- **Stale HTML**: navigations stay network-first so deploys are visible immediately.
- **Auth / API**: never cache `/api/*` responses in the SW (privacy + correctness).

## Phase 1 — Offline-lite RoutePulse (**shipped v28**)

1. On successful `getRoute`, client writes to IndexedDB:
   - route summary, maneuvers, geometry, generated_at, share URL.
2. SW message channel: `CACHE_ROUTE` from page → SW stores opaque Response optional.
3. Offline UI: if `navigator.onLine === false` and IDB hit → show last route + “offline copy” badge (already partially in localStorage; migrate to IDB).
4. Do **not** cache geocode/API in SW.

## Phase 2 — Tile offline for active trip

1. When trip mode starts, page computes bbox around polyline (+padding).
2. Page requests tiles for zoom 12–15 only (configurable).
3. SW or page Cache API stores under `tiles-v1` with **max entries** (e.g. 400) + LRU eviction.
4. Tile host allowlist: only configured OSM/CDN hosts (CORS).
5. Trip end / 24h → delete tile cache group.

## Phase 3 — Install UX + reliability

1. Android: capture `beforeinstallprompt`; soft “Install app” chip on RoutePulse.
2. iOS: one-time coach mark for Share → Add to Home Screen.
3. Wake Lock (already in RoutePulse trip mode) + optional silent keep-alive only while trip active.
4. Metrics: SW controlled?, offline open count, tile cache size.

## Netlify Blobs relationship

| Concern | Blobs | Client SW / IDB |
|---|---|---|
| Shared route result across users/instances | **Yes** (`app-cache` / `rp-routes`) | No |
| Public images / uploads | **Yes** (`uploads` + `/blobs/*`) | Optional cache |
| Last route for *this* driver offline | No | **Yes** |
| Map tiles | No (too large / wrong layer) | **Yes** (bounded) |

Blobs accelerate **server** cold starts and multi-instance cache hits.  
SW/IDB accelerate **device** offline and repeat visits.

## Rollout checklist

- [ ] Phase 1 IDB route snapshot + offline banner QA on iPhone Safari
- [ ] Phase 2 tile allowlist + quota enforced
- [ ] Lighthouse PWA audit on production
- [ ] Confirm `/api/*` never appears in Cache Storage
- [ ] Deploy with SW_BUILD change verified (new SW activates)

## Non-goals (near term)

- Full offline city map packs
- Background sync of all incidents
- Push notifications for traffic (separate project)
