// Structured features produced by the single multimodal AI call (or the
// demo cache). Priority, crew size and vehicles are NOT part of this: they
// are derived deterministically by services/priority.service.ts.

export type RelativeVolume = "Small" | "Medium" | "Large" | "Massive" | "Unknown";

export type WasteCondition =
  | "Clean"
  | "Mixed"
  | "Contaminated"
  | "Compacted"
  | "Unknown";

export type Accessibility = "Easy" | "Moderate" | "Difficult" | "Unknown";

export interface ComplaintFeatures {
  wasteCategories: string[];
  wasteType: string;
  relativeVolume: RelativeVolume;
  condition: WasteCondition;
  hazardousDetected: boolean;
  hazardousTypes: string[];
  accessibility: Accessibility;
  suggestedEquipment: string[];
  blockedRoad: boolean;
  // School, hospital/clinic or market nearby.
  nearSensitiveSite: boolean;
  // <= 40 words. null when no real summary is available (fallback).
  summary: string | null;
  confidence: number;
}

export const RELATIVE_VOLUMES: RelativeVolume[] = [
  "Small",
  "Medium",
  "Large",
  "Massive",
  "Unknown",
];

export const WASTE_CONDITIONS: WasteCondition[] = [
  "Clean",
  "Mixed",
  "Contaminated",
  "Compacted",
  "Unknown",
];

export const ACCESSIBILITY_LEVELS: Accessibility[] = [
  "Easy",
  "Moderate",
  "Difficult",
  "Unknown",
];
