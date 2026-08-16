/**
 * M3: Golden set of Portland-metro OD pairs for regression / eval.
 * Labels guide expected routing behavior (not hard assertions in CI yet).
 * Use with self-hosted OSRM or public demo for offline scoring checks.
 */

export type GoldenLabel =
  | "may_use_i5"
  | "may_use_i84"
  | "may_use_i205"
  | "may_use_i205_i5"
  | "avoid_rose_quarter_peak"
  | "avoid_interstate_bridge_peak"
  | "avoid_us26_peak"
  | "avoid_or99w_peak"
  | "prefer_surface"
  | "prefer_surface_or_99e"
  | "cross_metro"
  | "cross_river"
  | "local_arterial"
  | "local_hwy_30";

export type GoldenRoute = {
  id: string;
  origin: string;
  destination: string;
  label: GoldenLabel;
  note: string;
};

export const PDX_GOLDEN_ROUTES: GoldenRoute[] = [
  { id: "pdx-01", origin: 'Pioneer Courthouse Square, Portland, OR', destination: 'Portland International Airport, Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'Airport via I-5/I-84 common' },
  { id: "pdx-02", origin: 'OMSI, Portland, OR', destination: 'Pearl District, Portland, OR', label: 'avoid_rose_quarter_peak' as GoldenLabel, note: 'Cross river; Rose Quarter pain at peak' },
  { id: "pdx-03", origin: "Powell's City of Books, Portland, OR", destination: 'Multnomah Falls, OR', label: 'may_use_i84' as GoldenLabel, note: 'Gorge via I-84' },
  { id: "pdx-04", origin: 'Beaverton Transit Center, Beaverton, OR', destination: 'Pioneer Courthouse Square, Portland, OR', label: 'avoid_us26_peak' as GoldenLabel, note: 'Sunset Highway peak' },
  { id: "pdx-05", origin: 'Clackamas Town Center, Clackamas, OR', destination: 'Downtown Portland, OR', label: 'may_use_i205' as GoldenLabel, note: 'I-205 to downtown' },
  { id: "pdx-06", origin: 'Vancouver, WA', destination: 'Pioneer Courthouse Square, Portland, OR', label: 'avoid_interstate_bridge_peak' as GoldenLabel, note: 'I-5 bridge peak' },
  { id: "pdx-07", origin: 'SE Hawthorne Blvd, Portland, OR', destination: 'NW 23rd Ave, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'Inner east-west surface' },
  { id: "pdx-08", origin: 'St Johns, Portland, OR', destination: 'Sellwood, Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'North-south spine' },
  { id: "pdx-09", origin: 'Gresham, OR', destination: 'Hillsboro, OR', label: 'cross_metro' as GoldenLabel, note: 'Full metro east-west' },
  { id: "pdx-10", origin: 'Tigard, OR', destination: 'Gateway Transit Center, Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'South to east via freeways' },
  { id: "pdx-11", origin: 'Alberta Arts District, Portland, OR', destination: 'Division St, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'NE-SE surface' },
  { id: "pdx-12", origin: 'Lloyd Center, Portland, OR', destination: 'South Waterfront, Portland, OR', label: 'avoid_rose_quarter_peak' as GoldenLabel, note: 'Lloyd to SoWa' },
  { id: "pdx-13", origin: 'Parkrose, Portland, OR', destination: 'Downtown Portland, OR', label: 'may_use_i84' as GoldenLabel, note: 'East county inbound' },
  { id: "pdx-14", origin: 'Lake Oswego, OR', destination: 'Pearl District, Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'South metro inbound' },
  { id: "pdx-15", origin: 'Milwaukie, OR', destination: 'NW Portland, OR', label: 'prefer_surface_or_99e' as GoldenLabel, note: 'Inner SE' },
  { id: "pdx-16", origin: 'Happy Valley, OR', destination: 'Portland State University, Portland, OR', label: 'may_use_i205' as GoldenLabel, note: 'SE county' },
  { id: "pdx-17", origin: 'Forest Grove, OR', destination: 'Downtown Portland, OR', label: 'avoid_us26_peak' as GoldenLabel, note: 'West valley' },
  { id: "pdx-18", origin: 'Oregon City, OR', destination: 'Portland Airport, Portland, OR', label: 'may_use_i205' as GoldenLabel, note: 'South to airport' },
  { id: "pdx-19", origin: 'Troutdale, OR', destination: 'Beaverton, OR', label: 'cross_metro' as GoldenLabel, note: 'East to west' },
  { id: "pdx-20", origin: 'Kenton, Portland, OR', destination: 'Woodstock, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'N-SE' },
  { id: "pdx-21", origin: 'University of Portland, Portland, OR', destination: 'Reed College, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'Campus to campus' },
  { id: "pdx-22", origin: 'Washington Square, Tigard, OR', destination: 'Pioneer Place, Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'Mall to downtown' },
  { id: "pdx-23", origin: 'Cascade Station, Portland, OR', destination: 'Moda Center, Portland, OR', label: 'avoid_rose_quarter_peak' as GoldenLabel, note: 'Airport area to Rose Quarter' },
  { id: "pdx-24", origin: 'SE 82nd Ave, Portland, OR', destination: 'NW Lovejoy St, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: '82nd to Pearl' },
  { id: "pdx-25", origin: 'Barbur Blvd, Portland, OR', destination: 'NE Broadway, Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'SW to NE' },
  { id: "pdx-26", origin: 'Hillsdale, Portland, OR', destination: 'Mississippi Ave, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'SW hills to N' },
  { id: "pdx-27", origin: 'Eastmoreland, Portland, OR', destination: 'Linnton, Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'SE to NW industrial' },
  { id: "pdx-28", origin: 'Fairview, OR', destination: 'Tualatin, OR', label: 'cross_metro' as GoldenLabel, note: 'East to south' },
  { id: "pdx-29", origin: 'Sherwood, OR', destination: 'Gresham, OR', label: 'cross_metro' as GoldenLabel, note: 'SW to east' },
  { id: "pdx-30", origin: 'Wilsonville, OR', destination: 'Downtown Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'Far south inbound' },
  { id: "pdx-31", origin: 'Canby, OR', destination: 'Clackamas Town Center, Clackamas, OR', label: 'local_arterial' as GoldenLabel, note: 'South county' },
  { id: "pdx-32", origin: 'Newberg, OR', destination: 'Beaverton, OR', label: 'avoid_or99w_peak' as GoldenLabel, note: '99W corridor' },
  { id: "pdx-33", origin: 'Camas, WA', destination: 'Downtown Portland, OR', label: 'may_use_i205' as GoldenLabel, note: 'WA via I-205' },
  { id: "pdx-34", origin: 'Battle Ground, WA', destination: 'Lloyd Center, Portland, OR', label: 'avoid_interstate_bridge_peak' as GoldenLabel, note: 'Clark County' },
  { id: "pdx-35", origin: 'Sauvie Island, OR', destination: 'Downtown Portland, OR', label: 'local_hwy_30' as GoldenLabel, note: 'NW island' },
  { id: "pdx-36", origin: 'Mt Tabor, Portland, OR', destination: 'Council Crest, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'Hill to hill' },
  { id: "pdx-37", origin: 'Hollywood District, Portland, OR', destination: 'Multnomah Village, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'NE to SW' },
  { id: "pdx-38", origin: 'Jade District, Portland, OR', destination: 'Pearl District, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'SE 82nd culture to Pearl' },
  { id: "pdx-39", origin: 'Montavilla, Portland, OR', destination: 'Goose Hollow, Portland, OR', label: 'may_use_i84' as GoldenLabel, note: 'East to west downtown' },
  { id: "pdx-40", origin: 'Lents, Portland, OR', destination: 'Pearl District, Portland, OR', label: 'may_use_i205_i5' as GoldenLabel, note: 'Outer SE inbound' },
  { id: "pdx-41", origin: 'Cully, Portland, OR', destination: 'South Waterfront, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'NE to SoWa' },
  { id: "pdx-42", origin: 'Portsmouth, Portland, OR', destination: 'Brooklyn, Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'N to SE' },
  { id: "pdx-43", origin: 'Rose City Park, Portland, OR', destination: 'Hillsdale, Portland, OR', label: 'cross_river' as GoldenLabel, note: 'NE to SW' },
  { id: "pdx-44", origin: 'Overlook, Portland, OR', destination: 'Woodstock, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'N to SE' },
  { id: "pdx-45", origin: 'Arbor Lodge, Portland, OR', destination: 'Reed, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'N to SE' },
  { id: "pdx-46", origin: 'Boise, Portland, OR', destination: 'Sellwood, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'N Alberta area to Sellwood' },
  { id: "pdx-47", origin: 'Concordia, Portland, OR', destination: 'Johns Landing, Portland, OR', label: 'may_use_i5' as GoldenLabel, note: 'NE to SW waterfront' },
  { id: "pdx-48", origin: 'Grant Park, Portland, OR', destination: 'Collins View, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'NE to SW' },
  { id: "pdx-49", origin: 'Irvington, Portland, OR', destination: 'Collins Circle, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'Inner NE to SW' },
  { id: "pdx-50", origin: 'Alameda, Portland, OR', destination: 'Bridlemile, Portland, OR', label: 'prefer_surface' as GoldenLabel, note: 'NE to SW' },
];

export function goldenRoutesByLabel(label: GoldenLabel): GoldenRoute[] {
  return PDX_GOLDEN_ROUTES.filter(r => r.label === label);
}
