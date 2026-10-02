import {
  ACCESSIBILITY_LEVELS,
  RELATIVE_VOLUMES,
  type Accessibility,
  type ComplaintFeatures,
  type RelativeVolume,
} from "../types/ai.js";

// ============================================================
// DETERMINISTIC PRIORITY SCORING
// ============================================================
// The AI only describes the scene (ComplaintFeatures). Priority, crew size,
// vehicles and time are decided here by fixed, documented rules so every
// decision can be explained to staff via `reasons`.
//
// urgencyScore = 1 + points, clamped to 1..10:
//   hazardous material visible   +4
//   blocking a road              +3
//   near school/hospital/market  +2
//   volume Massive/Large/Medium  +3/+2/+1
//   citizen reports              +1 at 3+, +2 at 6+ (capped)
// priority: CRITICAL >= 7, STANDARD >= 3, otherwise TRIVIAL
// ============================================================

export type PriorityLevel = "CRITICAL" | "STANDARD" | "TRIVIAL";

export type PriorityFeatures = Pick<
  ComplaintFeatures,
  | "relativeVolume"
  | "hazardousDetected"
  | "hazardousTypes"
  | "accessibility"
  | "suggestedEquipment"
  | "blockedRoad"
  | "nearSensitiveSite"
>;

export interface PriorityResult {
  priority: PriorityLevel;
  urgencyScore: number;
  requiredWorkers: number;
  requiredHeavyVehicles: number;
  estimatedTimeMinutes: number;
  reasons: string[];
}

export const CRITICAL_THRESHOLD = 7;
export const STANDARD_THRESHOLD = 3;

const VOLUME_POINTS: Record<RelativeVolume, number> = {
  Massive: 3,
  Large: 2,
  Medium: 1,
  Small: 0,
  Unknown: 0,
};

const VOLUME_WORKERS: Record<RelativeVolume, number> = {
  Massive: 5,
  Large: 3,
  Medium: 2,
  Small: 1,
  Unknown: 2,
};

const VOLUME_MINUTES: Record<RelativeVolume, number> = {
  Massive: 150,
  Large: 75,
  Medium: 45,
  Small: 20,
  Unknown: 45,
};

const HEAVY_EQUIPMENT = /\b(jcb|excavator|bulldozer|dumper|tractor|loader|crane)\b/i;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const voteBonus = (voteCount: number) =>
  voteCount >= 6 ? 2 : voteCount >= 3 ? 1 : 0;

export const scorePriority = (
  features: PriorityFeatures,
  voteCount = 1,
): PriorityResult => {
  const reasons: string[] = [];
  let points = 0;

  if (features.hazardousDetected) {
    points += 4;
    const types = features.hazardousTypes.length
      ? `: ${features.hazardousTypes.join(", ")}`
      : "";
    reasons.push(`+4 hazardous material visible${types}`);
  }

  if (features.blockedRoad) {
    points += 3;
    reasons.push("+3 blocking a road");
  }

  if (features.nearSensitiveSite) {
    points += 2;
    reasons.push("+2 near a school, hospital or market");
  }

  const volumePoints = VOLUME_POINTS[features.relativeVolume] ?? 0;

  if (volumePoints > 0) {
    points += volumePoints;
    reasons.push(`+${volumePoints} ${features.relativeVolume.toLowerCase()} volume`);
  }

  const bonus = voteBonus(voteCount);

  if (bonus > 0) {
    points += bonus;
    reasons.push(`+${bonus} reported by ${voteCount} citizens`);
  }

  const urgencyScore = clamp(1 + points, 1, 10);

  const priority: PriorityLevel =
    urgencyScore >= CRITICAL_THRESHOLD
      ? "CRITICAL"
      : urgencyScore >= STANDARD_THRESHOLD
        ? "STANDARD"
        : "TRIVIAL";

  reasons.unshift(
    `Urgency ${urgencyScore}/10 -> ${priority} (CRITICAL >= ${CRITICAL_THRESHOLD}, STANDARD >= ${STANDARD_THRESHOLD})`,
  );

  // ---- Crew, vehicles, time ----

  const requiredWorkers = clamp(
    VOLUME_WORKERS[features.relativeVolume] + (features.hazardousDetected ? 1 : 0),
    1,
    8,
  );

  const needsHeavyEquipment = features.suggestedEquipment.some((item) =>
    HEAVY_EQUIPMENT.test(item),
  );

  const requiredHeavyVehicles = clamp(
    features.relativeVolume === "Massive" ||
      needsHeavyEquipment ||
      (features.blockedRoad && features.relativeVolume === "Large")
      ? 1
      : 0,
    0,
    3,
  );

  const accessFactor =
    features.accessibility === "Difficult"
      ? 1.5
      : features.accessibility === "Moderate"
        ? 1.2
        : 1;

  const estimatedTimeMinutes = clamp(
    Math.round(
      (VOLUME_MINUTES[features.relativeVolume] * accessFactor +
        (features.hazardousDetected ? 15 : 0)) /
        5,
    ) * 5,
    15,
    480,
  );

  return {
    priority,
    urgencyScore,
    requiredWorkers,
    requiredHeavyVehicles,
    estimatedTimeMinutes,
    reasons,
  };
};

// Rebuilds scorer input from a stored complaint row (e.g. after votes change).
export const priorityFeaturesFromComplaint = (complaint: {
  aiRelativeVolume: string | null;
  aiHazardousDetected: boolean;
  aiHazardousTypes: string[];
  aiAccessibility: string | null;
  aiSuggestedEquipment: string[];
  aiBlockedRoad: boolean;
  aiNearSensitiveSite: boolean;
}): PriorityFeatures => ({
  relativeVolume: RELATIVE_VOLUMES.includes(
    complaint.aiRelativeVolume as RelativeVolume,
  )
    ? (complaint.aiRelativeVolume as RelativeVolume)
    : "Unknown",
  hazardousDetected: complaint.aiHazardousDetected,
  hazardousTypes: complaint.aiHazardousTypes,
  accessibility: ACCESSIBILITY_LEVELS.includes(
    complaint.aiAccessibility as Accessibility,
  )
    ? (complaint.aiAccessibility as Accessibility)
    : "Unknown",
  suggestedEquipment: complaint.aiSuggestedEquipment,
  blockedRoad: complaint.aiBlockedRoad,
  nearSensitiveSite: complaint.aiNearSensitiveSite,
});
