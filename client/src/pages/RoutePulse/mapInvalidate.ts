import type { Map as LeafletMap } from "leaflet";

/** Safe Leaflet size refresh — never pans the camera; coalesces moveend. */
export function softInvalidateSize(map: LeafletMap | null | undefined) {
  if (!map) return;
  try {
    map.invalidateSize({
      animate: false,
      pan: false,
      debounceMoveend: true,
    });
  } catch {
    /* map may be mid-teardown */
  }
}
