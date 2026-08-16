/**
 * M3: Lightweight TriMet context — key MAX / transit centers for map pins.
 * Not a full GTFS router; gives drivers visual transit landmarks near routes.
 */

export type TrimetLandmark = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "max" | "transit_center" | "streetcar";
};

/** Curated landmarks (static — no live GTFS dependency). */
export const TRIMET_LANDMARKS: TrimetLandmark[] = [
  { id: "tc-pioneer", name: "Pioneer Square", lat: 45.5186, lng: -122.6786, kind: "max" },
  { id: "tc-rose-quarter", name: "Rose Quarter TC", lat: 45.5315, lng: -122.6668, kind: "transit_center" },
  { id: "tc-gateway", name: "Gateway TC", lat: 45.5257, lng: -122.5637, kind: "transit_center" },
  { id: "tc-beaverton", name: "Beaverton TC", lat: 45.4909, lng: -122.8015, kind: "transit_center" },
  { id: "tc-hillsboro", name: "Hillsboro Central", lat: 45.5226, lng: -122.9898, kind: "max" },
  { id: "tc-clackamas", name: "Clackamas Town Center", lat: 45.4357, lng: -122.5734, kind: "transit_center" },
  { id: "tc-parkrose", name: "Parkrose/Sumner TC", lat: 45.5574, lng: -122.567, kind: "transit_center" },
  { id: "tc-hollywood", name: "Expo Center", lat: 45.6043, lng: -122.686, kind: "max" },
  { id: "max-hollywood-center", name: "Delta Park/Vanport", lat: 45.595, lng: -122.6785, kind: "max" },
  { id: "max-hollywood-jackson", name: "North Lombard TC", lat: 45.577, lng: -122.685, kind: "transit_center" },
  { id: "max-hollywood-killingsworth", name: "N Killingsworth St", lat: 45.5627, lng: -122.685, kind: "max" },
  { id: "max-goose", name: "Goose Hollow/SW Jefferson", lat: 45.519, lng: -122.6927, kind: "max" },
  { id: "max-providence", name: "Providence Park", lat: 45.5215, lng: -122.6917, kind: "max" },
  { id: "max-library", name: "Library/SW 9th Ave", lat: 45.5193, lng: -122.6835, kind: "max" },
  { id: "max-oak", name: "Oak St/SW 1st Ave", lat: 45.5202, lng: -122.6715, kind: "max" },
  { id: "max-skidmore", name: "Skidmore Fountain", lat: 45.5224, lng: -122.6712, kind: "max" },
  { id: "max-oldtown", name: "Old Town/Chinatown", lat: 45.5252, lng: -122.6715, kind: "max" },
  { id: "max-union", name: "Union Station/NW 5th", lat: 45.529, lng: -122.6765, kind: "max" },
  { id: "max-hollywood-interstate", name: "Albina/Mississippi", lat: 45.546, lng: -122.6755, kind: "max" },
  { id: "max-hollywood-prescott", name: "Overlook Park", lat: 45.5525, lng: -122.68, kind: "max" },
  { id: "max-hollywood-rosa", name: "Rosa Parks", lat: 45.5675, lng: -122.685, kind: "max" },
  { id: "max-hollywood-kenton", name: "Kenton/N Denver", lat: 45.5825, lng: -122.6865, kind: "max" },
  { id: "max-airport", name: "Portland Airport", lat: 45.5875, lng: -122.593, kind: "max" },
  { id: "max-cascades", name: "Mt Hood Ave", lat: 45.572, lng: -122.578, kind: "max" },
  { id: "max-cascades2", name: "Cascades", lat: 45.568, lng: -122.57, kind: "max" },
  { id: "max-hollywood-hollywood", name: "Hollywood/NE 42nd", lat: 45.5348, lng: -122.6205, kind: "max" },
  { id: "max-60th", name: "NE 60th Ave", lat: 45.5345, lng: -122.602, kind: "max" },
  { id: "max-82nd", name: "NE 82nd Ave", lat: 45.5342, lng: -122.5785, kind: "max" },
  { id: "max-181st", name: "E 181st Ave", lat: 45.522, lng: -122.48, kind: "max" },
  { id: "max-rockwood", name: "Rockwood/E 188th", lat: 45.5175, lng: -122.473, kind: "max" },
  { id: "max-gresham", name: "Gresham Central TC", lat: 45.5005, lng: -122.428, kind: "transit_center" },
  { id: "max-cleveland", name: "Cleveland Ave", lat: 45.501, lng: -122.418, kind: "max" },
  { id: "max-sunset", name: "Sunset TC", lat: 45.51, lng: -122.782, kind: "transit_center" },
  { id: "max-beaverton-creek", name: "Beaverton Creek", lat: 45.493, lng: -122.812, kind: "max" },
  { id: "max-merlo", name: "Merlo Rd/SW 158th", lat: 45.51, lng: -122.84, kind: "max" },
  { id: "max-elmonica", name: "Elmonica/SW 170th", lat: 45.51, lng: -122.85, kind: "max" },
  { id: "max-quatama", name: "Quatama/NW 205th", lat: 45.52, lng: -122.875, kind: "max" },
  { id: "max-orchards", name: "Orenco/NW 231st", lat: 45.53, lng: -122.915, kind: "max" },
  { id: "max-hawthorn", name: "Hawthorne/SE 11th", lat: 45.5122, lng: -122.6545, kind: "streetcar" },
  { id: "sc-southwater", name: "South Waterfront", lat: 45.4965, lng: -122.671, kind: "streetcar" },
  { id: "sc-psu", name: "PSU Urban Center", lat: 45.5115, lng: -122.6835, kind: "streetcar" },
];

export function landmarksNear(
  lat: number,
  lng: number,
  radiusKm = 8
): TrimetLandmark[] {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  return TRIMET_LANDMARKS.filter(s => {
    const dLat = toR(s.lat - lat);
    const dLng = toR(s.lng - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toR(lat)) * Math.cos(toR(s.lat)) * Math.sin(dLng / 2) ** 2;
    const d = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    return d <= radiusKm;
  });
}
