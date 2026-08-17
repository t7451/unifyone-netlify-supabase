# RoutePulse Leaflet performance notes

## Active strategies
- Single shared `L.canvas` renderer for all route/incident vectors
- `React.memo(RouteMap)` with shallow propsEqual — sheet/GPS must not rebuild layers
- Geometry slim: main route ≤48 pts mobile / 100 desktop; alts ≤36 mobile
- Mobile: no per-step congestion polylines; ≤1 alt line; ≤4 flow probes
- Mobile: hide zoom/scale; larger cluster radius; chunkedLoading; cap markers
- GPS UI throttle: 1.6s trip / 3s idle; min move 12–24 m
- Tile layers: `updateWhenIdle`, `keepBuffer` 1 on mobile
- `softInvalidateSize({ animate:false, pan:false, debounceMoveend:true })`

## Measure on mid Android
1. Chrome remote debug → Performance
2. Pan with route on vs off — target ≥30 FPS sustained
3. Toggle traffic overlay — note tile cost separately from vector cost
