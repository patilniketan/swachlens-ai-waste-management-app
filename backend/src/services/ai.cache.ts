import crypto from "crypto";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "../config/uploads.js";
import {
  DEMO_INCIDENTS,
  DEMO_PROFILES,
  SEED_IMAGE_SUBDIR,
  type DemoIncident,
  type DemoProfile,
} from "../demo/demoData.js";

// ============================================================
// AI_MODE=cached lookups
// ============================================================
// Known demo descriptions and seed images map to stored (simulated)
// analysis in demo/demoData.ts. Anything unknown returns null so the
// caller falls through to Gemini (if configured) or the rule-based
// fallback.
// ============================================================

export const AI_MODE: "live" | "cached" =
  process.env.AI_MODE === "cached" ? "cached" : "live";

const normalizeText = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const incidentsByDescription = new Map<string, DemoIncident>();

for (const incident of DEMO_INCIDENTS) {
  for (const text of [...incident.reports, ...(incident.liveDemoReports ?? [])]) {
    incidentsByDescription.set(normalizeText(text), incident);
  }
}

export const findCachedIncident = (
  description: string,
): { incident: DemoIncident; profile: DemoProfile } | null => {
  if (AI_MODE !== "cached") return null;

  const incident = incidentsByDescription.get(normalizeText(description));

  return incident ? { incident, profile: DEMO_PROFILES[incident.profile] } : null;
};

let profilesByImageHash: Map<string, DemoProfile> | null = null;

const sha256 = (data: Buffer) =>
  crypto.createHash("sha256").update(data).digest("hex");

const loadImageHashes = () => {
  const map = new Map<string, DemoProfile>();

  for (const profile of Object.values(DEMO_PROFILES)) {
    const file = path.join(UPLOAD_DIR, SEED_IMAGE_SUBDIR, profile.image);

    try {
      map.set(sha256(fs.readFileSync(file)), profile);
    } catch {
      console.warn(`AI cache: seed image missing, skipping ${file}`);
    }
  }

  return map;
};

export const findCachedImageProfile = (image: Buffer): DemoProfile | null => {
  if (AI_MODE !== "cached") return null;

  profilesByImageHash ??= loadImageHashes();

  return profilesByImageHash.get(sha256(image)) ?? null;
};
