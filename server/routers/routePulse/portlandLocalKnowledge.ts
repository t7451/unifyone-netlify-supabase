/**
 * Portland metro local-driver knowledge for RoutePulse (v24).
 *
 * Encodes what daily drivers know that pure ETA engines underweight:
 * national truck bottlenecks, High Crash Network arterials, train traps,
 * pavement hell, peak windows, westside/Sunset pain, Vancouver spillover,
 * and time-bounded construction (esp. I-5 SB Rose Quarter Sep 2026).
 *
 * Research synthesis (Aug 2026): ODOT mobility + ATRI 2026 top truck
 * bottlenecks (#27 I-5@I-84, #39 Interstate Bridge, #78 I-5@I-205 south);
 * I-5 Rose Quarter Phase 1A closure; PBOT High Crash Network; Munley "angriest
 * commute" poll; TripCheck/ODOT construction; WW Central Eastside trains;
 * Axios pavement survey; OR-217 / US-26 westside studies; Vancouver I-5
 * spillover guidance for the Sep closure.
 *
 * Expanded Aug 2026 (v25): Sellwood/St Johns/Tilikum/Burnside/Division/
 * Hawthorne/Foster/Sandy/Barbur/Macadam/MLK-Grand/Chávez/BH Hwy/Scholls/
 * Airport Way/Terwilliger/Kruse Way/Glisan/Halsey/Capitol — delivery-relevant
 * arterials and crossings Google underweights.
 */

export type LocalCorridor = {
  id: string;
  nameMatchers: RegExp[];
  bbox?: [number, number, number, number];
  stressPenalty: number;
  bottleneckPenalty: number;
  peakMultiplier: number;
  tip: string;
  tags: Array<
    | "freeway"
    | "bridge"
    | "arterial"
    | "train"
    | "pavement"
    | "crash"
    | "construction"
    | "westside"
    | "vancouver"
    | "south"
  >;
};

export type LocalEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  nameMatchers: RegExp[];
  bbox?: [number, number, number, number];
  stressPenalty: number;
  bottleneckPenalty: number;
  tip: string;
};

export const PORTLAND_CORRIDORS: LocalCorridor[] = [
  // ── National / regional freeway chokepoints ──────────────────────────────
  {
    id: "i5-rose-quarter",
    nameMatchers: [/\bi[\s-]?5\b/i, /rose\s*quarter/i, /moda\s*center/i, /weidler/i],
    bbox: [-122.695, 45.515, -122.655, 45.545],
    stressPenalty: 18,
    bottleneckPenalty: 22,
    peakMultiplier: 1.65,
    tip: "I-5 Rose Quarter (at I-84) is Oregon's #1 bottleneck and ATRI #27 national truck choke — merge chaos even without a crash. Oregon's angriest commute stretch in 2026 polls.",
    tags: ["freeway", "crash"],
  },
  {
    id: "i5-interstate-bridge",
    nameMatchers: [/interstate\s*bridge/i, /columbia\s*river/i],
    bbox: [-122.69, 45.58, -122.65, 45.66],
    stressPenalty: 16,
    bottleneckPenalty: 20,
    peakMultiplier: 1.55,
    tip: "I-5 Interstate Bridge ranks ATRI #39 nationally — lifts and peak backups spill into Vancouver and Portland. Any Rose Quarter mess multiplies this.",
    tags: ["freeway", "bridge", "vancouver"],
  },
  {
    id: "i5-i205-south",
    nameMatchers: [/\bi[\s-]?205\b/i, /tualatin/i, /wilsonville/i],
    bbox: [-122.8, 45.28, -122.7, 45.42],
    stressPenalty: 12,
    bottleneckPenalty: 14,
    peakMultiplier: 1.4,
    tip: "I-5 at I-205 south (Tualatin/Wilsonville) is ATRI #78 national truck bottleneck — afternoon southbound is the usual failure mode.",
    tags: ["freeway", "south"],
  },
  {
    id: "i84-banfield",
    nameMatchers: [/\bi[\s-]?84\b/i, /banfield/i],
    bbox: [-122.68, 45.51, -122.48, 45.55],
    stressPenalty: 14,
    bottleneckPenalty: 16,
    peakMultiplier: 1.5,
    tip: "I-84 Banfield (Lloyd to I-205) is Oregon's #2 angriest commute — eastbound AM / westbound PM classic fails; Gateway interchanges are the pinch.",
    tags: ["freeway"],
  },
  {
    id: "i405-core",
    nameMatchers: [/\bi[\s-]?405\b/i, /fremont\s*bridge/i],
    bbox: [-122.7, 45.5, -122.67, 45.54],
    stressPenalty: 13,
    bottleneckPenalty: 14,
    peakMultiplier: 1.45,
    tip: "I-405 through the core is chronically constrained — Fremont Bridge and downtown ramps back up from small incidents.",
    tags: ["freeway", "bridge"],
  },
  {
    id: "us26-sunset-vista",
    nameMatchers: [
      /\bus[\s-]?26\b/i,
      /sunset\s*highway/i,
      /vista\s*ridge/i,
      /zebra\s*tunnel/i,
      /sylvan/i,
    ],
    bbox: [-122.78, 45.5, -122.68, 45.53],
    stressPenalty: 17,
    bottleneckPenalty: 18,
    peakMultiplier: 1.55,
    tip: "US-26 Sunset into Vista Ridge tunnels is the region's busiest westside corridor and Oregon's #3 angriest commute — tunnel incidents freeze the whole westside.",
    tags: ["freeway", "westside"],
  },
  {
    id: "or217",
    nameMatchers: [/\b217\b/i, /beaverton.?tigard/i],
    bbox: [-122.82, 45.4, -122.75, 45.52],
    stressPenalty: 12,
    bottleneckPenalty: 13,
    peakMultiplier: 1.4,
    tip: "OR-217 has 10 interchanges in ~7 miles (some of the shortest merge spacing in the region) and ~120k vehicles/day — Canyon/Allen interchanges are chronic.",
    tags: ["freeway", "westside"],
  },
  {
    id: "ross-island-bridge",
    nameMatchers: [/ross\s*island/i],
    bbox: [-122.675, 45.495, -122.655, 45.51],
    stressPenalty: 12,
    bottleneckPenalty: 12,
    peakMultiplier: 1.4,
    tip: "Ross Island Bridge is a single-point failure — closure dumps onto already-stressed SE/SW arterials and Macadam.",
    tags: ["bridge"],
  },
  {
    id: "marquam-bridge",
    nameMatchers: [/marquam/i],
    bbox: [-122.68, 45.5, -122.665, 45.515],
    stressPenalty: 11,
    bottleneckPenalty: 12,
    peakMultiplier: 1.4,
    tip: "Marquam (I-5) is the main river crossing bottleneck during both peaks — any incident ripples region-wide.",
    tags: ["bridge", "freeway"],
  },

  // ── Local traps Google underweights ─────────────────────────────────────
  {
    id: "central-eastside-trains",
    nameMatchers: [
      /se\s*(8th|11th|12th)/i,
      /water\s*ave/i,
      /omsi/i,
      /rail\s*heritage/i,
    ],
    bbox: [-122.67, 45.5, -122.65, 45.52],
    stressPenalty: 22,
    bottleneckPenalty: 16,
    peakMultiplier: 1.15,
    tip: "Central Eastside UP trains at 8th/11th/12th: ~135 trains/day, gates down ~6 hrs/day average. 40–90 min waits happen with almost no map warning — locals hard-avoid when a long consist is moving.",
    tags: ["train", "arterial"],
  },

  // ── High Crash Network / stress arterials ────────────────────────────────
  {
    id: "powell",
    nameMatchers: [/powell/i],
    stressPenalty: 10,
    bottleneckPenalty: 8,
    peakMultiplier: 1.35,
    tip: "Powell is a state highway wearing a city-street costume — High Crash Network, poor pavement east, and a delivery-driver favorite to skip when parallel options exist.",
    tags: ["arterial", "crash", "pavement"],
  },
  {
    id: "82nd",
    nameMatchers: [/\b82nd\b/i, /\b82\s*nd\b/i],
    stressPenalty: 11,
    bottleneckPenalty: 9,
    peakMultiplier: 1.3,
    tip: "82nd Avenue: High Crash Network, wide/fast, nasty at Powell, Glisan, Halsey. Eastside delivery workhorse that burns time and nerves.",
    tags: ["arterial", "crash"],
  },
  {
    id: "122nd",
    nameMatchers: [/\b122nd\b/i, /\b122\s*nd\b/i],
    stressPenalty: 10,
    bottleneckPenalty: 8,
    peakMultiplier: 1.3,
    tip: "122nd is East Portland's de facto freeway — long blocks, high speeds, top crash intersections at Division, Halsey, Stark.",
    tags: ["arterial", "crash"],
  },
  {
    id: "division",
    nameMatchers: [/division/i],
    stressPenalty: 8,
    bottleneckPenalty: 7,
    peakMultiplier: 1.25,
    tip: "Division: retail/transit congestion; pavement ~39th–55th is a frequent suspension-killer for delivery vans.",
    tags: ["arterial", "pavement", "crash"],
  },
  {
    id: "burnside",
    nameMatchers: [/burnside/i],
    stressPenalty: 9,
    bottleneckPenalty: 7,
    peakMultiplier: 1.3,
    tip: "Burnside is High Crash end-to-end — not a calm shortcut. Westside pavement work and eastside volume stack stress.",
    tags: ["arterial", "crash", "pavement"],
  },
  {
    id: "foster",
    nameMatchers: [/foster/i],
    stressPenalty: 9,
    bottleneckPenalty: 8,
    peakMultiplier: 1.3,
    tip: "Foster + I-205 ramp ranks among the city's worst crash intersections — merge geometry punishes rushed runs.",
    tags: ["arterial", "crash"],
  },
  {
    id: "holgate",
    nameMatchers: [/holgate/i],
    stressPenalty: 7,
    bottleneckPenalty: 6,
    peakMultiplier: 1.2,
    tip: "Holgate: bumpy, crash-listed, and a common 'avoid if you can' for eastside drivers who know better.",
    tags: ["arterial", "pavement", "crash"],
  },
  {
    id: "mlk-grand",
    nameMatchers: [/martin\s*luther\s*king/i, /\bmlk\b/i, /\bgrand\s*ave/i],
    stressPenalty: 8,
    bottleneckPenalty: 7,
    peakMultiplier: 1.35,
    tip: "MLK/Grand couplet is the inner-eastside workhorse — signal density, curb competition, steady congestion.",
    tags: ["arterial"],
  },
  {
    id: "sandy",
    nameMatchers: [/sandy\s*blvd/i, /sandy\s*boulevard/i],
    stressPenalty: 8,
    bottleneckPenalty: 6,
    peakMultiplier: 1.25,
    tip: "Sandy Blvd is High Crash Network — diagonal geometry creates constant conflict points.",
    tags: ["arterial", "crash"],
  },
  {
    id: "barbur",
    nameMatchers: [/barbur/i],
    stressPenalty: 8,
    bottleneckPenalty: 7,
    peakMultiplier: 1.3,
    tip: "Barbur is the SW pressure valve when I-5 is angry — and a High Crash corridor itself.",
    tags: ["arterial", "crash", "south"],
  },
  {
    id: "hawthorne",
    nameMatchers: [/hawthorne/i],
    stressPenalty: 6,
    bottleneckPenalty: 5,
    peakMultiplier: 1.2,
    tip: "Hawthorne is slower and more pedestrian-heavy than the map implies — painful as a through route in peaks.",
    tags: ["arterial", "crash"],
  },
  {
    id: "mcloughlin-99e",
    nameMatchers: [/mcloughlin/i, /\b99e\b/i, /or[\s-]?99e/i],
    stressPenalty: 9,
    bottleneckPenalty: 8,
    peakMultiplier: 1.3,
    tip: "OR 99E McLoughlin is a top Safety Priority corridor (frequent rear-end/angle/ped crashes) and the main south-metro surface alternative when I-5 is wrecked.",
    tags: ["arterial", "crash", "south"],
  },
  {
    id: "nw23rd",
    nameMatchers: [/nw\s*23/i, /23rd\s*ave/i],
    bbox: [-122.705, 45.52, -122.69, 45.545],
    stressPenalty: 6,
    bottleneckPenalty: 4,
    peakMultiplier: 1.15,
    tip: "NW 23rd: pavement hell + shopper traffic — locals do not use it as a through street.",
    tags: ["arterial", "pavement"],
  },
  {
    id: "tv-highway",
    nameMatchers: [/tualatin\s*valley/i, /\btv\s*hwy/i, /\bor[\s-]?8\b/i],
    stressPenalty: 7,
    bottleneckPenalty: 6,
    peakMultiplier: 1.25,
    tip: "TV Highway (OR-8) is the westside surface grind between Beaverton and Hillsboro — slow, signal-dense, used when 26/217 are parking lots.",
    tags: ["arterial", "westside"],
  },

  // ── Vancouver spillover ──────────────────────────────────────────────────
  {
    id: "vancouver-i5-ramps",
    nameMatchers: [/mill\s*plain/i, /fourth\s*plain/i, /\bsr[\s-]?500\b/i, /\bsr[\s-]?14\b/i],
    bbox: [-122.7, 45.6, -122.55, 45.68],
    stressPenalty: 10,
    bottleneckPenalty: 10,
    peakMultiplier: 1.4,
    tip: "Vancouver I-5 ramps (Mill Plain, Fourth Plain, SR-500, SR-14) are the first to gridlock when Portland I-5 backs across the bridge — City of Vancouver flags these for the Sep 2026 Rose Quarter closure.",
    tags: ["vancouver", "freeway"],
  },

  {
    id: "sellwood-bridge",
    nameMatchers: [/sellwood/i],
    bbox: [-122.675, 45.46, -122.655, 45.475],
    stressPenalty: 9,
    bottleneckPenalty: 10,
    peakMultiplier: 1.35,
    tip: "Sellwood Bridge is the south-crossing relief valve — when Ross Island or Marquam hiccups, this corridor fills with diverted traffic and Tacoma/17th backs up.",
    tags: ["bridge"],
  },
  {
    id: "st-johns-bridge",
    nameMatchers: [/st\.?\s*johns?\s*bridge/i, /cathedral\s*park/i],
    bbox: [-122.79, 45.58, -122.76, 45.595],
    stressPenalty: 8,
    bottleneckPenalty: 9,
    peakMultiplier: 1.25,
    tip: "St. Johns Bridge: narrow lanes, wind, and the only Willamette crossing north of Fremont — school/shift peaks stack up fast with nowhere to divert.",
    tags: ["bridge"],
  },
  {
    id: "tilikum-crossing",
    nameMatchers: [/tilikum/i, /tilikum\s*crossing/i],
    bbox: [-122.67, 45.5, -122.655, 45.51],
    stressPenalty: 4,
    bottleneckPenalty: 6,
    peakMultiplier: 1.1,
    tip: "Tilikum is transit/bike/ped only — useful as a landmark for OMSI/South Waterfront, not a car detour. Car drivers stuck aiming here need Ross Island or Hawthorne instead.",
    tags: ["bridge"],
  },
  {
    id: "burnside",
    nameMatchers: [/burnside/i],
    stressPenalty: 10,
    bottleneckPenalty: 9,
    peakMultiplier: 1.4,
    tip: "Burnside is a High Crash Network spine — bridge lifts, MAX conflicts near downtown, and SE/NE signal timing that feels hostile to through traffic at peaks.",
    tags: ["arterial", "bridge", "crash"],
  },
  {
    id: "division",
    nameMatchers: [/\bdivision\b/i],
    stressPenalty: 9,
    bottleneckPenalty: 8,
    peakMultiplier: 1.35,
    tip: "Division (esp. 11th–82nd): dense retail, frequent buses, left-turn friction. Delivery drivers often parallel on Clinton/Powell depending on time of day.",
    tags: ["arterial"],
  },
  {
    id: "hawthorne",
    nameMatchers: [/hawthorne/i],
    stressPenalty: 9,
    bottleneckPenalty: 9,
    peakMultiplier: 1.4,
    tip: "Hawthorne Bridge + SE Hawthorne: bridge is a peak bottleneck; the street is bike/bus heavy with slow retail blocks — fine off-peak, painful 4–7pm.",
    tags: ["bridge", "arterial"],
  },
  {
    id: "foster",
    nameMatchers: [/\bfoster\b/i],
    stressPenalty: 8,
    bottleneckPenalty: 7,
    peakMultiplier: 1.3,
    tip: "Foster Rd is the SE diagonal workhorse — faster than Division for some OD pairs but crash-prone and signal-dense through the 80s–122nd stretch.",
    tags: ["arterial", "crash"],
  },
  {
    id: "sandy",
    nameMatchers: [/\bsandy\s*(blvd|boulevard)?\b/i],
    stressPenalty: 9,
    bottleneckPenalty: 8,
    peakMultiplier: 1.3,
    tip: "Sandy Blvd: diagonal NE arterial with angled intersections that surprise out-of-town drivers; peaks back up at 39th, 60s, and toward the airport approaches.",
    tags: ["arterial"],
  },
  {
    id: "barbur",
    nameMatchers: [/barbur/i],
    stressPenalty: 10,
    bottleneckPenalty: 9,
    peakMultiplier: 1.35,
    tip: "Barbur Blvd is the SW parallel to I-5 — absorbs freeway spillover, steep grades, and High Crash segments. When I-5 SB is dead, Barbur dies with it.",
    tags: ["arterial", "crash", "south"],
  },
  {
    id: "macadam",
    nameMatchers: [/macadam/i, /\bor43\b/i],
    stressPenalty: 9,
    bottleneckPenalty: 10,
    peakMultiplier: 1.4,
    tip: "Macadam (OR-43) is the only continuous south waterfront arterial — Johns Landing peaks and any Ross Island incident create multi-mile queues with few escape routes.",
    tags: ["arterial", "south"],
  },
  {
    id: "mlk-grand",
    nameMatchers: [
      /\bmlk\b/i,
      /martin\s*luther\s*king/i,
      /\bgrand\s*ave/i,
    ],
    stressPenalty: 9,
    bottleneckPenalty: 8,
    peakMultiplier: 1.3,
    tip: "MLK/Grand couplet: primary NE/SE freight + bus spine. Couplet confusion for visitors; signal progression favors the couplet over cross streets at peaks.",
    tags: ["arterial"],
  },
  {
    id: "cesar-chavez",
    nameMatchers: [/c[eé]sar\s*ch[aá]vez/i, /\b39th\s*ave\b/i],
    stressPenalty: 8,
    bottleneckPenalty: 7,
    peakMultiplier: 1.25,
    tip: "César Chávez (39th): busy neighborhood arterial — school peaks and left turns into retail slow deliveries more than pure distance suggests.",
    tags: ["arterial"],
  },
  {
    id: "beaverton-hillsdale",
    nameMatchers: [/beaverton.?hillsdale/i, /\bbh\s*hwy\b/i],
    stressPenalty: 10,
    bottleneckPenalty: 9,
    peakMultiplier: 1.35,
    tip: "Beaverton-Hillsdale Hwy: westside surface alternative to US-26 — fills when Sunset/Vista Ridge fails; multi-lane but crashy and stop-dense through Multnomah Village approaches.",
    tags: ["arterial", "westside", "crash"],
  },
  {
    id: "scholls-ferry",
    nameMatchers: [/scholls\s*ferry/i],
    stressPenalty: 8,
    bottleneckPenalty: 8,
    peakMultiplier: 1.3,
    tip: "Scholls Ferry: Beaverton/Tigard connector that absorbs 217 and US-26 overflow — afternoon westbound can rival freeway delay for short hops.",
    tags: ["arterial", "westside"],
  },
  {
    id: "airport-way",
    nameMatchers: [/airport\s*way/i, /\bpdx\b/i, /columbia\s*blvd/i],
    bbox: [-122.7, 45.55, -122.55, 45.6],
    stressPenalty: 11,
    bottleneckPenalty: 12,
    peakMultiplier: 1.45,
    tip: "Airport Way / Columbia Blvd industrial: trucks, shift changes, and event-day PDX surges. GPS often underestimates light cycles and truck acceleration on grades.",
    tags: ["arterial"],
  },
  {
    id: "terwilliger",
    nameMatchers: [/terwilliger/i],
    stressPenalty: 7,
    bottleneckPenalty: 6,
    peakMultiplier: 1.2,
    tip: "Terwilliger curves and limited sight distance — locals treat it as a calm cut-through until wet leaves or darkness; not a speed corridor.",
    tags: ["arterial", "south"],
  },
  {
    id: "kruse-way",
    nameMatchers: [/kruse\s*way/i],
    stressPenalty: 9,
    bottleneckPenalty: 10,
    peakMultiplier: 1.4,
    tip: "Kruse Way office park peaks (Lake Oswego): signal trains create 15–20 min local delays that national ETAs miss until you're already in the queue.",
    tags: ["arterial", "south"],
  },
  {
    id: "glisan",
    nameMatchers: [/\bglisan\b/i],
    stressPenalty: 8,
    bottleneckPenalty: 7,
    peakMultiplier: 1.25,
    tip: "Glisan: eastside arterial with awkward 82nd/122nd intersections — often better than Halsey for through trips but still High Crash near major crosses.",
    tags: ["arterial", "crash"],
  },
  {
    id: "halsey",
    nameMatchers: [/\bhalsey\b/i],
    stressPenalty: 8,
    bottleneckPenalty: 7,
    peakMultiplier: 1.25,
    tip: "Halsey: parallel to I-84 for NE surface routing — useful when Banfield is stopped, but retail friction and signals erase gains on short hops.",
    tags: ["arterial"],
  },
  {
    id: "capitol-hwy",
    nameMatchers: [/capitol\s*hwy/i, /capitol\s*highway/i],
    stressPenalty: 7,
    bottleneckPenalty: 6,
    peakMultiplier: 1.2,
    tip: "Capitol Hwy (SW): hills, narrow stretches, and school traffic — a local quiet alternative to Barbur that is slower than maps imply in wet weather.",
    tags: ["arterial", "south"],
  },


  {
    id: "i205-gateway-east",
    nameMatchers: [/\bi[\s-]?205\b/i, /gateway/i, /glisan/i],
    bbox: [-122.58, 45.48, -122.5, 45.56],
    stressPenalty: 11,
    bottleneckPenalty: 12,
    peakMultiplier: 1.4,
    tip: "I-205 through Gateway/Glisan is the eastside relief valve when I-5 fails — afternoon NB and morning SB both stack at interchanges; local exits (Stark, Washington, Glisan) back up onto the mainline.",
    tags: ["freeway"],
  },
  {
    id: "sr14-vancouver",
    nameMatchers: [/\bsr[\s-]?14\b/i, /state\s*route\s*14/i, /camas/i],
    bbox: [-122.68, 45.58, -122.4, 45.62],
    stressPenalty: 10,
    bottleneckPenalty: 11,
    peakMultiplier: 1.35,
    tip: "SR-14 (WA) absorbs I-5 bridge spillover — when the Interstate Bridge hiccups, Camas/Washougal-bound traffic turns this into a parking lot east of I-205.",
    tags: ["freeway", "vancouver"],
  },
  {
    id: "i5-vancouver-mill-plain",
    nameMatchers: [/mill\s*plain/i, /vancouver/i, /fourth\s*plain/i],
    bbox: [-122.7, 45.62, -122.55, 45.68],
    stressPenalty: 11,
    bottleneckPenalty: 12,
    peakMultiplier: 1.4,
    tip: "Vancouver I-5 at Mill Plain/Fourth Plain: WA-side twin of Rose Quarter pain — peak merges and signal spillback onto the freeway that Oregon-centric ETAs underweight.",
    tags: ["freeway", "vancouver"],
  },
  {
    id: "morrison-bridge",
    nameMatchers: [/morrison\s*bridge/i],
    bbox: [-122.68, 45.515, -122.665, 45.525],
    stressPenalty: 9,
    bottleneckPenalty: 10,
    peakMultiplier: 1.35,
    tip: "Morrison Bridge is a peak downtown-to-eastside chokepoint — lifts plus left-exit geometry create stop-and-go that doesn't show as a formal incident.",
    tags: ["bridge"],
  },
  {
    id: "fremont-bridge",
    nameMatchers: [/fremont\s*bridge/i],
    bbox: [-122.69, 45.54, -122.67, 45.55],
    stressPenalty: 10,
    bottleneckPenalty: 11,
    peakMultiplier: 1.35,
    tip: "Fremont Bridge (I-405): steep grades, weather slowdowns, and the primary north Willamette car crossing west of I-5 — incidents here re-route half the westside.",
    tags: ["bridge", "freeway"],
  },
];

/** Time-bounded events Google may lag on. */
export const PORTLAND_EVENTS: LocalEvent[] = [
  {
    id: "i5-sb-rose-quarter-2026-09",
    title: "I-5 southbound Rose Quarter full closure",
    startDate: "2026-09-11",
    endDate: "2026-10-20",
    nameMatchers: [
      /\bi[\s-]?5\b/i,
      /rose\s*quarter/i,
      /moda\s*center/i,
      /\bi[\s-]?84\b/i,
      /\bi[\s-]?405\b/i,
      /interstate\s*bridge/i,
    ],
    bbox: [-122.72, 45.5, -122.64, 45.65],
    stressPenalty: 42,
    bottleneckPenalty: 48,
    tip: "CRITICAL Sep 11–~mid-Oct 2026: All I-5 SB through-lanes I-405→I-84 closed 24/7 (Rose Quarter Phase 1A). Expect 2–3× travel times, detours via I-405 & I-205, overflow onto city streets, and backups into Vancouver. Prefer I-205 for regional southbound when possible.",
  },
  {
    id: "summer-bridge-lifts-peak",
    title: "Peak recreational bridge lift season",
    startDate: "2026-05-15",
    endDate: "2026-09-30",
    nameMatchers: [
      /broadway\s*bridge/i,
      /burnside/i,
      /morrison/i,
      /hawthorne/i,
      /steel\s*bridge/i,
    ],
    bbox: [-122.69, 45.5, -122.66, 45.54],
    stressPenalty: 10,
    bottleneckPenalty: 12,
    tip: "Summer river traffic means more bridge lifts on Broadway/Burnside/Morrison/Hawthorne/Steel — a 10–20 min surprise stop that pure ETAs rarely bake in. Cross early or use Marquam/Fremont when on a tight delivery window.",
  },
  {
    id: "holiday-retail-se-arterials",
    title: "Holiday retail congestion on SE arterials",
    startDate: "2026-11-20",
    endDate: "2026-12-31",
    nameMatchers: [/powell/i, /division/i, /82nd/i, /122nd/i, /foster/i],
    stressPenalty: 12,
    bottleneckPenalty: 11,
    tip: "Late Nov–Dec: SE retail corridors (Powell, Division, 82nd, 122nd, Foster) add 15–40% dwell at signals from shopper traffic — parallel locals often beat the “fastest” arterial.",
  },
  {
    id: "pdx-holiday-airport-surge",
    title: "PDX holiday airport surge",
    startDate: "2026-11-20",
    endDate: "2027-01-05",
    nameMatchers: [/airport\s*way/i, /columbia\s*blvd/i, /\bpdx\b/i, /i[\s-]?205/i],
    bbox: [-122.7, 45.55, -122.52, 45.6],
    stressPenalty: 14,
    bottleneckPenalty: 16,
    tip: "Holiday PDX peaks: Airport Way and I-205 approaches stack beyond typical TomTom snapshots — leave extra buffer for curb/shuttle conflicts, not just mainline speed.",
  },
];

export type LocalKnowledgeHit = {
  id: string;
  tip: string;
  stressPenalty: number;
  bottleneckPenalty: number;
  tags: string[];
  source: "corridor" | "event";
};

function inBbox(lng: number, lat: number, bbox: [number, number, number, number]) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

function roadTextFromRoute(route: {
  maneuvers?: Array<{ roadName?: string | null }>;
  incidents?: Array<{ road_name?: string | null }>;
}): string {
  const parts: string[] = [];
  for (const m of route.maneuvers ?? []) if (m.roadName) parts.push(m.roadName);
  for (const i of route.incidents ?? []) if (i.road_name) parts.push(i.road_name);
  return parts.join(" | ");
}

function sampleCoords(geometry?: { coordinates?: [number, number][] }) {
  const coords = geometry?.coordinates ?? [];
  if (coords.length === 0) return [] as Array<[number, number]>;
  if (coords.length <= 8) return coords;
  const step = Math.max(1, Math.floor(coords.length / 7));
  const samples: Array<[number, number]> = [];
  for (let i = 0; i < coords.length; i += step) samples.push(coords[i]!);
  samples.push(coords[coords.length - 1]!);
  return samples;
}

function matchesCorridor(
  corridor: LocalCorridor,
  roadText: string,
  samples: Array<[number, number]>
): boolean {
  const nameHit = corridor.nameMatchers.some(re => re.test(roadText));
  if (!corridor.bbox) return nameHit;
  const geoHit = samples.some(([lng, lat]) => inBbox(lng, lat, corridor.bbox!));
  if (nameHit) return true;
  return geoHit && (corridor.tags.includes("freeway") || corridor.tags.includes("bridge"));
}

export function isPortlandMetro(lat: number, lng: number): boolean {
  return lat >= 45.25 && lat <= 45.72 && lng >= -123.05 && lng <= -122.25;
}

export function activeEventsOn(date = new Date()): LocalEvent[] {
  const iso = date.toISOString().slice(0, 10);
  return PORTLAND_EVENTS.filter(e => iso >= e.startDate && iso <= e.endDate);
}

export function matchLocalKnowledge(
  route: {
    geometry?: { coordinates?: [number, number][] };
    maneuvers?: Array<{ roadName?: string | null }>;
    incidents?: Array<{ road_name?: string | null }>;
  },
  timeContext: string = "offpeak",
  now = new Date()
): LocalKnowledgeHit[] {
  const roadText = roadTextFromRoute(route);
  const samples = sampleCoords(route.geometry);
  const hits: LocalKnowledgeHit[] = [];
  const peak = timeContext === "peak";

  for (const c of PORTLAND_CORRIDORS) {
    if (!matchesCorridor(c, roadText, samples)) continue;
    const mult = peak ? c.peakMultiplier : 1;
    hits.push({
      id: c.id,
      tip: c.tip,
      stressPenalty: Math.round(c.stressPenalty * mult),
      bottleneckPenalty: Math.round(c.bottleneckPenalty * mult),
      tags: c.tags,
      source: "corridor",
    });
  }

  for (const e of activeEventsOn(now)) {
    const nameHit = e.nameMatchers.some(re => re.test(roadText));
    const geoHit = e.bbox
      ? samples.some(([lng, lat]) => inBbox(lng, lat, e.bbox!))
      : false;
    if (!nameHit && !geoHit) continue;
    hits.push({
      id: e.id,
      tip: e.tip,
      stressPenalty: e.stressPenalty,
      bottleneckPenalty: e.bottleneckPenalty,
      tags: ["construction"],
      source: "event",
    });
  }

  const byId = new Map<string, LocalKnowledgeHit>();
  for (const h of hits) {
    const prev = byId.get(h.id);
    if (
      !prev ||
      h.stressPenalty + h.bottleneckPenalty >
        prev.stressPenalty + prev.bottleneckPenalty
    ) {
      byId.set(h.id, h);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      b.stressPenalty + b.bottleneckPenalty - (a.stressPenalty + a.bottleneckPenalty)
  );
}

/** Cap so local prior never fully overrides live incidents. */
export function localKnowledgePenalties(hits: LocalKnowledgeHit[]) {
  let stress = 0;
  let bottleneck = 0;
  for (const h of hits) {
    stress += h.stressPenalty;
    bottleneck += h.bottleneckPenalty;
  }
  return { stress: Math.min(38, stress), bottleneck: Math.min(45, bottleneck) };
}

export function formatLocalKnowledgeForPrompt(hits: LocalKnowledgeHit[]): string {
  if (hits.length === 0) return "";
  const lines = hits.slice(0, 7).map(h => `- [${h.id}] ${h.tip}`);
  return (
    "Portland-metro local-driver knowledge (use like someone who drives these streets daily — pure ETA engines underweight several of these):\n" +
    lines.join("\n")
  );
}

export function localKnowledgeSummary(hits: LocalKnowledgeHit[]): string | null {
  if (hits.length === 0) return null;
  const top = hits[0]!;
  if (hits.length === 1) return top.tip;
  return `${top.tip} Also in play: ${hits
    .slice(1, 3)
    .map(h => h.id)
    .join(", ")}.`;
}
