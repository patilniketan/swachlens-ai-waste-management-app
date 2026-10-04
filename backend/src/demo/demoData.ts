// ============================================================
// DEMO DATA (SIMULATED)
// ============================================================
//
// Single source of truth for the demo:
//  - prisma/seed.ts turns DEMO_INCIDENTS into seeded complaints
//  - services/ai.cache.ts serves these stored features when
//    AI_MODE=cached and a known description or seed image is submitted
//
// Everything here is simulated. Locations are approximate points in
// Lajpat Nagar, South Delhi; weights and AI features are hand-written
// demo values, not measurements or real model output. Priority is never
// stored here: it is computed from these features by priority.service.ts.
// ============================================================

import type { ComplaintFeatures } from "../types/ai.js";

// Image-level features of each placeholder image in uploads/seed.
export type DemoProfile = Omit<
  ComplaintFeatures,
  "blockedRoad" | "nearSensitiveSite" | "summary"
> & { image: string };

export const SEED_IMAGE_SUBDIR = "seed";

export const DEMO_PROFILES = {
  mixed_household: {
    image: "mixed-garbage.png",
    wasteType: "Mixed household waste",
    wasteCategories: ["mixed municipal waste", "plastic bags", "organic waste"],
    relativeVolume: "Large",
    condition: "Mixed",
    hazardousDetected: false,
    hazardousTypes: [],
    accessibility: "Easy",
    suggestedEquipment: ["manual labor", "garbage truck"],
    confidence: 0.86,
  },
  plastic: {
    image: "plastic-waste.png",
    wasteType: "Plastic waste",
    wasteCategories: ["plastic bottles", "plastic bags"],
    relativeVolume: "Medium",
    condition: "Mixed",
    hazardousDetected: false,
    hazardousTypes: [],
    accessibility: "Easy",
    suggestedEquipment: ["manual labor", "garbage bags"],
    confidence: 0.9,
  },
  construction: {
    image: "construction-debris.png",
    wasteType: "Construction debris",
    wasteCategories: ["construction debris", "bricks", "sand"],
    relativeVolume: "Massive",
    condition: "Compacted",
    hazardousDetected: false,
    hazardousTypes: [],
    accessibility: "Difficult",
    suggestedEquipment: ["JCB", "dumper truck", "protective equipment"],
    confidence: 0.82,
  },
  medical: {
    image: "medical-waste.png",
    wasteType: "Biomedical waste",
    wasteCategories: ["medical waste", "syringes", "plastic bags"],
    relativeVolume: "Medium",
    condition: "Contaminated",
    hazardousDetected: true,
    hazardousTypes: ["syringes", "used bandages"],
    accessibility: "Easy",
    suggestedEquipment: ["protective equipment", "sealed biohazard bags"],
    confidence: 0.79,
  },
  ewaste: {
    image: "e-waste.png",
    wasteType: "E-waste",
    wasteCategories: ["e-waste", "electronic components"],
    relativeVolume: "Small",
    condition: "Mixed",
    hazardousDetected: true,
    hazardousTypes: ["batteries"],
    accessibility: "Easy",
    suggestedEquipment: ["manual labor", "protective equipment"],
    confidence: 0.84,
  },
  organic_market: {
    image: "organic-market.png",
    wasteType: "Organic market waste",
    wasteCategories: ["organic waste", "vegetable waste"],
    relativeVolume: "Large",
    condition: "Contaminated",
    hazardousDetected: false,
    hazardousTypes: [],
    accessibility: "Easy",
    suggestedEquipment: ["manual labor", "garbage truck"],
    confidence: 0.88,
  },
  drain: {
    image: "drain-plastic.png",
    wasteType: "Plastic and silt in storm drain",
    wasteCategories: ["plastic bags", "silt", "mixed municipal waste"],
    relativeVolume: "Massive",
    condition: "Contaminated",
    hazardousDetected: false,
    hazardousTypes: [],
    accessibility: "Difficult",
    suggestedEquipment: [
      "desilting equipment",
      "protective equipment",
      "pickup truck",
    ],
    confidence: 0.8,
  },
  burning: {
    image: "burning-garbage.png",
    wasteType: "Burning garbage",
    wasteCategories: ["mixed municipal waste", "ash"],
    relativeVolume: "Large",
    condition: "Contaminated",
    hazardousDetected: true,
    hazardousTypes: ["smoke", "burning plastic"],
    accessibility: "Moderate",
    suggestedEquipment: ["water tanker", "manual labor", "protective equipment"],
    confidence: 0.81,
  },
  garden: {
    image: "garden-waste.png",
    wasteType: "Garden waste",
    wasteCategories: ["leaves", "branches"],
    relativeVolume: "Medium",
    condition: "Clean",
    hazardousDetected: false,
    hazardousTypes: [],
    accessibility: "Easy",
    suggestedEquipment: ["handcart", "manual labor"],
    confidence: 0.9,
  },
  cardboard: {
    image: "cardboard.png",
    wasteType: "Cardboard and paper",
    wasteCategories: ["cardboard", "paper"],
    relativeVolume: "Medium",
    condition: "Clean",
    hazardousDetected: false,
    hazardousTypes: [],
    accessibility: "Easy",
    suggestedEquipment: ["handcart"],
    confidence: 0.91,
  },
  glass: {
    image: "glass-bottles.png",
    wasteType: "Broken glass",
    wasteCategories: ["glass", "broken glass"],
    relativeVolume: "Small",
    condition: "Mixed",
    hazardousDetected: true,
    hazardousTypes: ["sharp objects"],
    accessibility: "Easy",
    suggestedEquipment: ["protective equipment", "garbage bags"],
    confidence: 0.83,
  },
  litter: {
    image: "litter.png",
    wasteType: "Scattered litter",
    wasteCategories: ["plastic wrappers", "paper"],
    relativeVolume: "Small",
    condition: "Mixed",
    hazardousDetected: false,
    hazardousTypes: [],
    accessibility: "Easy",
    suggestedEquipment: ["manual labor", "broom"],
    confidence: 0.87,
  },
} satisfies Record<string, DemoProfile>;

export type DemoProfileKey = keyof typeof DEMO_PROFILES;

export const AFTER_IMAGES = [
  "after-clean-1.png",
  "after-clean-2.png",
  "after-clean-3.png",
] as const;

// Approximate cluster centres in Lajpat Nagar, South Delhi. They are
// 600m+ apart so each forms its own 500m hotspot.
export const DEMO_CLUSTERS = {
  central_market: { latitude: 28.5687, longitude: 77.2393 },
  amar_colony: { latitude: 28.5617, longitude: 77.2441 },
  moolchand: { latitude: 28.5646, longitude: 77.2335 },
  lajpat_iv: { latitude: 28.565, longitude: 77.249 },
  ring_road: { latitude: 28.5737, longitude: 77.242 },
} as const;

export type DemoClusterKey = keyof typeof DEMO_CLUSTERS;

export const DEMO_WARD = "Lajpat Nagar, South Delhi";

export interface DemoIncident {
  id: string;
  profile: DemoProfileKey;
  cluster: DemoClusterKey;
  // Metres east/north of the cluster centre.
  offset: [east: number, north: number];
  landmark: string;
  // Scene facts a reviewer (or the live model) would read from the report.
  blockedRoad?: boolean;
  // School, hospital/clinic or market nearby.
  nearSensitiveSite?: boolean;
  status: "Pending" | "Assigned" | "InProgress" | "Resolved";
  // reports[0] is the master complaint; the rest are seeded as linked
  // near-duplicates from other citizens.
  reports: string[];
  // Not seeded. Cached so that submitting one of these live is analysed
  // instantly and recognised as the same incident.
  liveDemoReports?: string[];
  // false = only exists in the cache (for a "new report" demo moment).
  seeded?: boolean;
  resolution?: {
    verifiedWeightKg: number;
    afterImage: (typeof AFTER_IMAGES)[number];
  };
}

export const DEMO_INCIDENTS: DemoIncident[] = [
  // ---------------- Central Market ----------------
  {
    id: "cm-bins",
    profile: "mixed_household",
    cluster: "central_market",
    offset: [-40, 30],
    landmark: "Back lane of Central Market, Lajpat Nagar II",
    nearSensitiveSite: true,
    status: "Pending",
    reports: [
      "The community dustbins behind Central Market are overflowing and garbage is spilling onto the road. Stray dogs are tearing the bags open.",
      "Overflowing garbage bins near the back lane of Lajpat Nagar Central Market. Waste is all over the road and it smells terrible.",
      "Garbage has not been picked up from the Central Market bins for days, the whole lane is covered in waste.",
    ],
    liveDemoReports: [
      "Bins behind Central Market overflowing again, garbage spread across the lane and dogs everywhere.",
    ],
  },
  {
    id: "cm-mandi",
    profile: "organic_market",
    cluster: "central_market",
    offset: [60, -50],
    landmark: "Sabzi mandi lane, Central Market",
    nearSensitiveSite: true,
    status: "Pending",
    reports: [
      "Rotting vegetable waste dumped at the end of the sabzi mandi lane in Central Market. Flies everywhere and a very bad smell.",
      "Vegetable vendors have dumped rotten produce near the Central Market sabzi lane, it is attracting flies and cows.",
      "Huge heap of rotting fruit and vegetable waste near the market's vegetable section. Smell is unbearable.",
    ],
  },
  {
    id: "cm-cartons",
    profile: "cardboard",
    cluster: "central_market",
    offset: [110, 70],
    landmark: "Footpath outside textile showrooms, Central Market",
    nearSensitiveSite: true,
    status: "Resolved",
    reports: [
      "Shops in Central Market have left piles of cardboard boxes on the footpath outside the textile showrooms.",
      "Cardboard cartons stacked on the Central Market footpath, pedestrians have to walk on the road.",
    ],
    resolution: { verifiedWeightKg: 46, afterImage: "after-clean-1.png" },
  },
  {
    id: "cm-parking",
    profile: "mixed_household",
    cluster: "central_market",
    offset: [-120, -60],
    landmark: "Parking entrance, Central Market",
    nearSensitiveSite: true,
    status: "Resolved",
    reports: [
      "Garbage pile next to the parking entrance of Central Market has been there for a week.",
    ],
    resolution: { verifiedWeightKg: 64, afterImage: "after-clean-2.png" },
  },
  {
    id: "cm-ewaste",
    profile: "ewaste",
    cluster: "central_market",
    offset: [20, 120],
    landmark: "Electronics repair shops, Central Market",
    status: "Resolved",
    reports: [
      "Someone has dumped old computer monitors, keyboards and batteries next to the electronics repair shops in Central Market.",
    ],
    resolution: { verifiedWeightKg: 12, afterImage: "after-clean-3.png" },
  },
  {
    id: "cm-service-lane",
    profile: "plastic",
    cluster: "central_market",
    offset: [-90, 90],
    landmark: "Service lane, Central Market",
    nearSensitiveSite: true,
    status: "InProgress",
    reports: [
      "Plastic bottles and polythene bags thrown all along the Central Market service lane after the weekend rush.",
    ],
  },
  {
    id: "cm-fountain",
    profile: "litter",
    cluster: "central_market",
    offset: [130, -20],
    landmark: "Bench area near the fountain, Central Market",
    nearSensitiveSite: true,
    status: "Pending",
    reports: [
      "Food wrappers and paper cups littered around the bench area near the Central Market fountain.",
    ],
  },
  {
    id: "cm-park",
    profile: "garden",
    cluster: "central_market",
    offset: [-30, -130],
    landmark: "Corner of Central Market park",
    nearSensitiveSite: true,
    status: "Pending",
    reports: [
      "Tree trimmings and dry leaves left in a heap on the corner of the Central Market park.",
    ],
  },
  {
    // Cache-only: a fresh CRITICAL report for the live demo.
    id: "cm-rubble-live",
    profile: "construction",
    cluster: "central_market",
    offset: [-140, 10],
    landmark: "Parking gate, Central Market",
    blockedRoad: true,
    nearSensitiveSite: true,
    status: "Pending",
    seeded: false,
    reports: [
      "Huge pile of construction rubble dumped overnight in front of the Central Market parking gate, cars cannot get in or out.",
    ],
  },

  // ---------------- Amar Colony ----------------
  {
    id: "ac-gate-plastic",
    profile: "plastic",
    cluster: "amar_colony",
    offset: [-30, 40],
    landmark: "Amar Colony market gate",
    nearSensitiveSite: true,
    status: "Pending",
    reports: [
      "Plastic bags and bottles piled up near the Amar Colony market gate, it is getting bigger every day.",
      "Heap of plastic waste at the Amar Colony market entrance, bags blowing onto the road.",
    ],
    liveDemoReports: [
      "Plastic waste pile near the Amar Colony market gate is still there, even bigger today.",
    ],
  },
  {
    id: "ac-food-plot",
    profile: "organic_market",
    cluster: "amar_colony",
    offset: [70, -60],
    landmark: "Open plot behind Amar Colony market",
    nearSensitiveSite: true,
    status: "Assigned",
    reports: [
      "Food stalls in Amar Colony are dumping leftover food and vegetable peels in the open plot behind the market.",
      "Open plot behind Amar Colony market full of rotting food waste from the stalls, rats are everywhere.",
    ],
  },
  {
    id: "ac-clinic-medical",
    profile: "medical",
    cluster: "amar_colony",
    offset: [-100, -40],
    landmark: "Outside a clinic, Amar Colony",
    nearSensitiveSite: true,
    status: "Assigned",
    reports: [
      "Used syringes, blood-stained cotton and medicine strips dumped in a bag outside a clinic in Amar Colony. Children play nearby, this is dangerous.",
    ],
  },
  {
    id: "ac-furniture",
    profile: "cardboard",
    cluster: "amar_colony",
    offset: [120, 50],
    landmark: "Furniture shops, Amar Colony main road",
    status: "Resolved",
    reports: [
      "Cardboard and packing material from the furniture shops left outside on the Amar Colony main road.",
    ],
    resolution: { verifiedWeightKg: 38, afterImage: "after-clean-1.png" },
  },
  {
    id: "ac-block-if",
    profile: "mixed_household",
    cluster: "amar_colony",
    offset: [10, -140],
    landmark: "Corner of Block I-F, Amar Colony",
    status: "Resolved",
    reports: [
      "Garbage dumped at the corner of Amar Colony block I-F, no one has collected it.",
    ],
    resolution: { verifiedWeightKg: 75, afterImage: "after-clean-2.png" },
  },
  {
    id: "ac-bus-stop",
    profile: "litter",
    cluster: "amar_colony",
    offset: [-130, 90],
    landmark: "Amar Colony bus stop",
    status: "Pending",
    reports: [
      "Lots of chips packets and plastic cups scattered near the Amar Colony bus stop.",
    ],
  },
  {
    id: "ac-glass",
    profile: "glass",
    cluster: "amar_colony",
    offset: [60, 120],
    landmark: "Pavement outside the liquor shop, Amar Colony",
    status: "Pending",
    reports: [
      "Broken glass bottles left on the pavement outside the Amar Colony liquor shop, people could get hurt.",
    ],
  },

  // ---------------- Moolchand ----------------
  {
    id: "mc-debris",
    profile: "construction",
    cluster: "moolchand",
    offset: [30, 20],
    landmark: "Moolchand flyover service lane",
    blockedRoad: true,
    status: "InProgress",
    reports: [
      "Construction debris dumped on the Moolchand flyover service lane is blocking half the road. Cars and autos are swerving into traffic, accident risk.",
    ],
  },
  {
    id: "mc-pillar",
    profile: "mixed_household",
    cluster: "moolchand",
    offset: [-60, -40],
    landmark: "Under Moolchand flyover, near the bus stop",
    status: "Pending",
    reports: [
      "Garbage dumped under the Moolchand flyover pillar near the bus stop, it keeps growing.",
      "Big garbage pile under Moolchand flyover next to the bus stop, commuters are covering their noses.",
    ],
  },
  {
    id: "mc-metro",
    profile: "plastic",
    cluster: "moolchand",
    offset: [110, 80],
    landmark: "Moolchand metro station exit",
    status: "Resolved",
    reports: [
      "Plastic bottles and bags clogging the footpath near Moolchand metro station exit.",
    ],
    resolution: { verifiedWeightKg: 22, afterImage: "after-clean-3.png" },
  },
  {
    id: "mc-auto-stand",
    profile: "litter",
    cluster: "moolchand",
    offset: [-120, 70],
    landmark: "Auto stand near Moolchand hospital",
    nearSensitiveSite: true,
    status: "Resolved",
    reports: [
      "Litter and paper scattered around the auto stand near Moolchand hospital.",
    ],
    resolution: { verifiedWeightKg: 6, afterImage: "after-clean-1.png" },
  },
  {
    id: "mc-underpass-ewaste",
    profile: "ewaste",
    cluster: "moolchand",
    offset: [40, -120],
    landmark: "Moolchand flyover underpass",
    status: "Pending",
    reports: [
      "Old CRT TV and broken wires dumped near the Moolchand flyover underpass.",
    ],
  },
  {
    id: "mc-stalls",
    profile: "organic_market",
    cluster: "moolchand",
    offset: [-20, 130],
    landmark: "Roadside stalls near Moolchand flyover",
    status: "Pending",
    reports: [
      "Leftover food from roadside stalls dumped near Moolchand flyover, stray animals gathering.",
    ],
  },

  // ---------------- Lajpat Nagar IV ----------------
  {
    id: "l4-bricks",
    profile: "construction",
    cluster: "lajpat_iv",
    offset: [-50, 30],
    landmark: "Road beside the park, Lajpat Nagar IV",
    blockedRoad: true,
    status: "Pending",
    reports: [
      "Truck-load of bricks, sand and broken tiles dumped on the road in Lajpat Nagar IV near the park. The road is blocked for cars.",
    ],
  },
  {
    id: "l4-drain",
    profile: "drain",
    cluster: "lajpat_iv",
    offset: [80, -30],
    landmark: "Storm drain, Lajpat Nagar IV main road",
    blockedRoad: true,
    status: "Resolved",
    reports: [
      "The storm drain on Lajpat Nagar IV main road is completely choked with plastic and silt. Water is overflowing onto the road and houses.",
    ],
    resolution: { verifiedWeightKg: 340, afterImage: "after-clean-2.png" },
  },
  {
    id: "l4-park-wall",
    profile: "plastic",
    cluster: "lajpat_iv",
    offset: [20, 110],
    landmark: "National Park boundary wall, Lajpat Nagar IV",
    status: "Pending",
    reports: [
      "Plastic waste dumped along the boundary wall of National Park, Lajpat Nagar IV.",
      "Lots of plastic bags and bottles thrown along the National Park wall in Lajpat Nagar IV.",
      "The National Park boundary wall is lined with plastic garbage, it looks terrible and blocks the walkway.",
    ],
  },
  {
    id: "l4-branches",
    profile: "garden",
    cluster: "lajpat_iv",
    offset: [-120, -80],
    landmark: "C Block footpath, Lajpat Nagar IV",
    status: "Resolved",
    reports: [
      "Pruned branches and garden waste dumped on the footpath in Lajpat Nagar IV, C block.",
    ],
    resolution: { verifiedWeightKg: 55, afterImage: "after-clean-3.png" },
  },
  {
    id: "l4-hall-glass",
    profile: "glass",
    cluster: "lajpat_iv",
    offset: [130, 60],
    landmark: "Community hall gate, Lajpat Nagar IV",
    status: "Resolved",
    reports: [
      "Broken glass and bottles near the Lajpat Nagar IV community hall gate.",
    ],
    resolution: { verifiedWeightKg: 9, afterImage: "after-clean-1.png" },
  },
  {
    id: "l4-empty-plot",
    profile: "mixed_household",
    cluster: "lajpat_iv",
    offset: [-30, -140],
    landmark: "Empty plot, Lajpat Nagar IV",
    status: "Pending",
    reports: [
      "Household garbage thrown in the empty plot in Lajpat Nagar IV, it is rotting in the rain.",
    ],
  },

  // ---------------- Ring Road ----------------
  {
    id: "rr-burning",
    profile: "burning",
    cluster: "ring_road",
    offset: [20, 40],
    landmark: "Ring Road near Lajpat Nagar II",
    status: "Pending",
    reports: [
      "Someone is burning a garbage pile next to Ring Road near Lajpat Nagar II. Thick black smoke is going into homes, children are coughing.",
    ],
  },
  {
    id: "rr-bottles",
    profile: "glass",
    cluster: "ring_road",
    offset: [-80, -20],
    landmark: "Ring Road footpath, Lajpat Nagar II",
    status: "Pending",
    reports: [
      "Broken beer bottles scattered on the footpath along Ring Road near Lajpat Nagar II.",
      "Glass bottle pieces all over the Ring Road footpath near Lajpat Nagar II, very unsafe for walkers.",
    ],
  },
  {
    id: "rr-bus-shelter",
    profile: "litter",
    cluster: "ring_road",
    offset: [100, -60],
    landmark: "Ring Road bus shelter, Lajpat Nagar II",
    status: "Pending",
    reports: [
      "Paper, wrappers and plastic cups littered around the Ring Road bus shelter, Lajpat Nagar II.",
      "Bus shelter on Ring Road near Lajpat Nagar II is full of litter.",
    ],
  },
  {
    id: "rr-gurudwara",
    profile: "mixed_household",
    cluster: "ring_road",
    offset: [-40, -120],
    landmark: "Gurudwara road, Lajpat Nagar II",
    status: "InProgress",
    reports: [
      "Garbage dump near the Lajpat Nagar II gurudwara road, overflowing onto the street.",
    ],
  },
  {
    id: "rr-storm-branches",
    profile: "garden",
    cluster: "ring_road",
    offset: [140, 70],
    landmark: "Ring Road service lane",
    status: "Assigned",
    reports: [
      "Fallen branches and leaves blocking the footpath on Ring Road service lane after the storm.",
    ],
  },
  {
    id: "rr-dhaba",
    profile: "organic_market",
    cluster: "ring_road",
    offset: [-130, 60],
    landmark: "Dhaba on Ring Road, Lajpat Nagar II",
    status: "Resolved",
    reports: ["Rotting food waste near the Ring Road dhaba, Lajpat Nagar II."],
    resolution: { verifiedWeightKg: 48, afterImage: "after-clean-2.png" },
  },
  {
    id: "rr-thermocol",
    profile: "cardboard",
    cluster: "ring_road",
    offset: [60, 130],
    landmark: "Ring Road service lane near Lajpat Nagar II",
    status: "Pending",
    reports: [
      "Cardboard boxes and thermocol dumped beside the Ring Road service lane near Lajpat Nagar II.",
    ],
  },
  {
    id: "rr-verge",
    profile: "plastic",
    cluster: "ring_road",
    offset: [-150, -80],
    landmark: "Ring Road central verge, Lajpat Nagar crossing",
    status: "Pending",
    reports: [
      "Plastic garbage thrown on the Ring Road central verge near the Lajpat Nagar crossing.",
    ],
  },
];

export const incidentCoordinates = (
  incident: DemoIncident,
  extraOffset: [number, number] = [0, 0],
) => {
  const centre = DEMO_CLUSTERS[incident.cluster];
  const east = incident.offset[0] + extraOffset[0];
  const north = incident.offset[1] + extraOffset[1];
  const metresPerDegreeLat = 111_320;
  const metresPerDegreeLng =
    metresPerDegreeLat * Math.cos((centre.latitude * Math.PI) / 180);

  return {
    latitude: Number((centre.latitude + north / metresPerDegreeLat).toFixed(6)),
    longitude: Number((centre.longitude + east / metresPerDegreeLng).toFixed(6)),
  };
};

const describeVolume = (volume: ComplaintFeatures["relativeVolume"]) =>
  volume === "Unknown" ? "" : `${volume.toLowerCase()} `;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Full feature set for a demo incident, as the AI step would return it.
export const demoIncidentFeatures = (incident: DemoIncident): ComplaintFeatures => {
  const { image: _image, ...profile } = DEMO_PROFILES[incident.profile];

  const details = [
    profile.hazardousDetected && `hazardous: ${profile.hazardousTypes.join(", ")}`,
    incident.blockedRoad && "blocking the road",
    incident.nearSensitiveSite && "near a busy public site",
  ].filter(Boolean);

  return {
    ...profile,
    wasteCategories: [...profile.wasteCategories],
    hazardousTypes: [...profile.hazardousTypes],
    suggestedEquipment: [...profile.suggestedEquipment],
    blockedRoad: incident.blockedRoad ?? false,
    nearSensitiveSite: incident.nearSensitiveSite ?? false,
    summary: capitalize(
      `${describeVolume(profile.relativeVolume)}${profile.wasteType.toLowerCase()} at ${incident.landmark}` +
        (details.length > 0 ? ` (${details.join("; ")}).` : "."),
    ),
  };
};

// Image-only features for a seed image submitted with unknown text.
export const demoImageFeatures = (profile: DemoProfile): ComplaintFeatures => {
  const { image: _image, ...features } = profile;

  return {
    ...features,
    wasteCategories: [...features.wasteCategories],
    hazardousTypes: [...features.hazardousTypes],
    suggestedEquipment: [...features.suggestedEquipment],
    blockedRoad: false,
    nearSensitiveSite: false,
    summary: `Photo shows ${describeVolume(features.relativeVolume)}${features.wasteType.toLowerCase()}.`,
  };
};
