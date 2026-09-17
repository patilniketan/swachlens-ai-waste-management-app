import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "GEMINI_API_KEY is not configured. AI features will use fallback logic.",
  );
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL = "gemini-3.6-flash";

/* =========================================================
   GENERIC GEMINI TEXT REQUEST
========================================================= */

async function askGemini(prompt: string): Promise<string | null> {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    return response.text ?? null;
  } catch (error) {
    console.error("Gemini API error:", error);
    return null;
  }
}

/* =========================================================
   GEMINI IMAGE REQUEST
========================================================= */

async function askGeminiWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<string | null> {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                data: imageBase64,
                mimeType,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    return response.text ?? null;
  } catch (error) {
    console.error("Gemini image analysis error:", error);
    return null;
  }
}

/* =========================================================
   JSON PARSER
========================================================= */

function extractJson(text: string | null): any | null {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    try {
      const match = text.match(/\{[\s\S]*\}/);

      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {
      return null;
    }
  }

  return null;
}

/* =========================================================
   1. DUPLICATE DETECTION
========================================================= */

export interface DuplicateCandidate {
  id: string;
  description: string;
  latitude: number;
  longitude: number;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  similarityScore: number;
  matchingComplaintId: string | null;
  reason: string;
}

export async function detectDuplicate(
  newDescription: string,
  candidates: DuplicateCandidate[],
): Promise<DuplicateResult> {
  if (candidates.length === 0) {
    return {
      isDuplicate: false,
      similarityScore: 0,
      matchingComplaintId: null,
      reason: "No nearby complaints found.",
    };
  }

  const complaints = candidates
    .map(
      (c) => `
Complaint ID: ${c.id}
Description: ${c.description}
Location: ${c.latitude}, ${c.longitude}
`,
    )
    .join("\n");

  const prompt = `
You are an AI system for a municipal waste reporting platform.

Determine whether the NEW complaint describes the same real-world waste problem
as any of the EXISTING complaints.

NEW COMPLAINT:
${newDescription}

EXISTING COMPLAINTS:
${complaints}

Rules:
- Compare meaning, not exact words.
- Similar wording alone is not enough.
- Same waste problem at approximately the same location should score highly.
- Return similarity from 0 to 1.
- A score greater than 0.85 means duplicate.
- Select the single best matching complaint.

Return ONLY valid JSON:

{
  "isDuplicate": true,
  "similarityScore": 0.95,
  "matchingComplaintId": "complaint_id",
  "reason": "Both reports describe the same garbage pile at the same location."
}
`;

  const result = extractJson(await askGemini(prompt));

  if (!result) {
    return fallbackDuplicateDetection(newDescription, candidates);
  }

  return {
    isDuplicate: Boolean(result.isDuplicate),
    similarityScore: clamp(
      Number(result.similarityScore) || 0,
      0,
      1,
    ),
    matchingComplaintId: result.matchingComplaintId ?? null,
    reason:
      result.reason ?? "AI similarity analysis completed.",
  };
}

/* =========================================================
   2. PRIORITY ANALYSIS
========================================================= */

export interface PriorityResult {
  priority: "CRITICAL" | "STANDARD" | "TRIVIAL";
  urgencyScore: number;
  requiredWorkers: number;
  requiredHeavyVehicles: number;
  estimatedTimeMinutes: number;
  wasteType: string;
}

export async function analyzePriority(
  description: string,
): Promise<PriorityResult> {
  const prompt = `
You are an AI municipal waste management priority classifier.

Analyze this citizen complaint:

"${description}"

Classification:

CRITICAL:
- Blocked major/main road
- Construction debris
- Hazardous waste
- Chemical/medical waste
- Large waste accumulation
- Emergency/public safety risk
- Requires JCB, bulldozer, large truck or similar machinery

STANDARD:
- Large household garbage pile
- Overflowing community garbage
- Multiple bags of waste
- Requires 2-3 sanitation workers

TRIVIAL:
- Small litter
- Single bag
- Small scattered waste
- Requires approximately 1 worker

Urgency:
1 = very low
10 = emergency

Increase urgency for:
- disease
- children sick
- dangerous
- health hazard
- emergency
- blocked road
- accident risk

Return ONLY JSON:

{
  "priority": "CRITICAL",
  "urgencyScore": 9,
  "requiredWorkers": 3,
  "requiredHeavyVehicles": 1,
  "estimatedTimeMinutes": 90,
  "wasteType": "construction debris"
}
`;

  const result = extractJson(await askGemini(prompt));

  if (!result) {
    return fallbackPriority(description);
  }

  return {
    priority: normalizePriority(result.priority),
    urgencyScore: clamp(
      Number(result.urgencyScore) || 5,
      1,
      10,
    ),
    requiredWorkers: Math.max(
      1,
      Number(result.requiredWorkers) || 1,
    ),
    requiredHeavyVehicles: Math.max(
      0,
      Number(result.requiredHeavyVehicles) || 0,
    ),
    estimatedTimeMinutes: Math.max(
      15,
      Number(result.estimatedTimeMinutes) || 30,
    ),
    wasteType: result.wasteType || "General waste",
  };
}

/* =========================================================
   3. SENTIMENT
========================================================= */

export interface SentimentResult {
  sentimentScore: number;
  sentimentLabel:
    | "POSITIVE"
    | "NEUTRAL"
    | "NEGATIVE"
    | "HIGHLY_NEGATIVE";
  highPriority: boolean;
}

export async function analyzeSentiment(
  description: string,
): Promise<SentimentResult> {
  const prompt = `
Analyze the sentiment and frustration level of this municipal complaint:

"${description}"

Return ONLY JSON:

{
  "sentimentScore": 0.9,
  "sentimentLabel": "HIGHLY_NEGATIVE",
  "highPriority": true
}

Rules:
- sentimentScore must be between 0 and 1.
- 0 = calm/positive
- 1 = extremely frustrated/negative
- Words such as "fed up", "dangerous", "urgent", "health hazard",
  "children sick", "emergency" increase the score.
- highPriority should be true when score >= 0.8.

Return JSON only.
`;

  const result = extractJson(await askGemini(prompt));

  if (!result) {
    return fallbackSentiment(description);
  }

  const score = clamp(
    Number(result.sentimentScore) || 0,
    0,
    1,
  );

  return {
    sentimentScore: score,
    sentimentLabel: normalizeSentiment(result.sentimentLabel),
    highPriority:
      score >= 0.8 || Boolean(result.highPriority),
  };
}

/* =========================================================
   4. AUTO FILL FROM DESCRIPTION
========================================================= */

export interface AutoFillResult {
  wasteType: string;
  locationDescription: string;
  urgency: number;
  estimatedQuantity: string;
}

export async function extractComplaintData(
  description: string,
): Promise<AutoFillResult> {
  const prompt = `
Extract structured information from this citizen's waste complaint.

Complaint:
"${description}"

IMPORTANT:
Do NOT claim exact kilograms or exact physical measurements.

For quantity, only return what the citizen explicitly states,
or use a qualitative estimate such as:
- Small
- Medium
- Large
- Massive
- Unknown

Return ONLY JSON:

{
  "wasteType": "household garbage",
  "locationDescription": "near the school gate",
  "urgency": 7,
  "estimatedQuantity": "Large"
}

If information is not mentioned:
- use "Unknown" for text fields
- use a reasonable urgency between 1 and 10
- use "Unknown" for quantity.

Do not invent specific locations or quantities.
`;

  const result = extractJson(await askGemini(prompt));

  if (!result) {
    return {
      wasteType: "General waste",
      locationDescription: "Unknown",
      urgency: 5,
      estimatedQuantity: "Unknown",
    };
  }

  return {
    wasteType: result.wasteType || "General waste",
    locationDescription:
      result.locationDescription || "Unknown",
    urgency: clamp(
      Number(result.urgency) || 5,
      1,
      10,
    ),
    estimatedQuantity:
      result.estimatedQuantity || "Unknown",
  };
}

/* =========================================================
   5. AI WASTE IMAGE ANALYSIS
========================================================= */

export interface WasteImageAnalysis {
  categories: string[];

  relativeVolume:
    | "Small"
    | "Medium"
    | "Large"
    | "Massive"
    | "Unknown";

  condition:
    | "Clean"
    | "Mixed"
    | "Contaminated"
    | "Compacted"
    | "Unknown";

  hazardousMaterialsDetected: boolean;

  hazardousTypes: string[];

  accessibility:
    | "Easy"
    | "Moderate"
    | "Difficult"
    | "Unknown";

  suggestedEquipment: string[];

  visibleQualityIndicators: string[];

  confidence: number;
}

export async function analyzeWasteImage(
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<WasteImageAnalysis> {
  if (!imageBase64) {
    return fallbackWasteImageAnalysis();
  }

  const prompt = `
You are an AI visual assistant for a municipal waste-management platform.

Analyze the uploaded waste photograph.

IMPORTANT LIMITATION:
You MUST NOT estimate exact weight in kilograms.
You MUST NOT claim that computer vision can accurately measure physical quantity.

Instead, classify the visible waste using relative categories.

Analyze:

1. Visible waste categories
   Examples:
   - plastic bottles
   - plastic bags
   - cardboard
   - paper
   - metal cans
   - glass
   - organic waste
   - construction debris
   - e-waste
   - textile
   - mixed municipal waste

2. Relative volume:
   - Small
   - Medium
   - Large
   - Massive
   - Unknown

3. Condition:
   - Clean
   - Mixed
   - Contaminated
   - Compacted
   - Unknown

4. Hazardous materials:
   Only mark true when potentially hazardous material is visibly identifiable.
   Possible examples:
   - batteries
   - chemicals
   - medical waste
   - sharp objects
   - electronic components

5. Accessibility:
   - Easy
   - Moderate
   - Difficult
   - Unknown

6. Suggested collection equipment:
   Examples:
   - manual labor
   - garbage bags
   - handcart
   - pickup truck
   - garbage truck
   - JCB
   - excavator
   - protective equipment

7. Visible quality indicators:
   Examples:
   - sorted
   - mixed
   - wet
   - dry
   - recyclable-looking
   - contaminated
   - compacted

8. Confidence:
   Overall confidence from 0 to 1.

Be conservative.
If something cannot be reliably determined from the image, return "Unknown"
rather than inventing information.

Return ONLY valid JSON:

{
  "categories": ["plastic bottles", "plastic bags"],
  "relativeVolume": "Large",
  "condition": "Mixed",
  "hazardousMaterialsDetected": false,
  "hazardousTypes": [],
  "accessibility": "Moderate",
  "suggestedEquipment": ["manual labor", "garbage truck"],
  "visibleQualityIndicators": ["mixed", "dry"],
  "confidence": 0.88
}
`;

  const result = extractJson(
    await askGeminiWithImage(
      prompt,
      imageBase64,
      mimeType,
    ),
  );

  if (!result) {
    return fallbackWasteImageAnalysis();
  }

  return {
    categories: Array.isArray(result.categories)
      ? result.categories.map(String)
      : ["Unknown"],

    relativeVolume: normalizeRelativeVolume(
      result.relativeVolume,
    ),

    condition: normalizeWasteCondition(
      result.condition,
    ),

    hazardousMaterialsDetected:
      Boolean(result.hazardousMaterialsDetected),

    hazardousTypes: Array.isArray(result.hazardousTypes)
      ? result.hazardousTypes.map(String)
      : [],

    accessibility: normalizeAccessibility(
      result.accessibility,
    ),

    suggestedEquipment: Array.isArray(
      result.suggestedEquipment,
    )
      ? result.suggestedEquipment.map(String)
      : ["manual labor"],

    visibleQualityIndicators: Array.isArray(
      result.visibleQualityIndicators,
    )
      ? result.visibleQualityIndicators.map(String)
      : [],

    confidence: clamp(
      Number(result.confidence) || 0,
      0,
      1,
    ),
  };
}

/* =========================================================
   6. MARKETPLACE MATCHING
========================================================= */

export interface RecyclerCandidate {
  id: string;
  companyName: string;
  preferredWasteTypes: string[];
  dailyCapacityKg: number;
  location: string;
}

export interface RecyclerMatch {
  recyclerId: string;
  companyName: string;
  matchScore: number;
  reason: string;
  estimatedValue: string;
}

export async function matchWithRecyclers(
  inventoryData: {
    verifiedType: string;
    verifiedWeightKg: number;
    location: string;
    qualityGrade?: string | null;
    contamination?: string | null;
  },
  recyclers: RecyclerCandidate[],
): Promise<RecyclerMatch[]> {
  if (recyclers.length === 0) {
    return [];
  }

  const recyclerText = recyclers
    .map(
      (r) => `
Recycler ID: ${r.id}
Company: ${r.companyName}
Preferred waste types: ${r.preferredWasteTypes.join(", ")}
Daily capacity: ${r.dailyCapacityKg} kg
Location: ${r.location}
`,
    )
    .join("\n");

  const prompt = `
You are a waste-recycling marketplace matchmaker.

VERIFIED INVENTORY:

Waste type:
${inventoryData.verifiedType}

Verified weight:
${inventoryData.verifiedWeightKg} kg

Location:
${inventoryData.location}

Quality:
${inventoryData.qualityGrade || "Unknown"}

Contamination:
${inventoryData.contamination || "Unknown"}

AVAILABLE RECYCLERS:
${recyclerText}

Rank the best matching recyclers.

Consider:
- Waste type compatibility
- Capacity
- Location
- Quality
- Contamination

Do NOT invent exact market prices.
If value cannot be determined from supplied information,
return "Not estimated".

Return ONLY JSON:

{
  "matches": [
    {
      "recyclerId": "id",
      "companyName": "Company",
      "matchScore": 0.95,
      "reason": "Specializes in this material and has sufficient capacity.",
      "estimatedValue": "Not estimated"
    }
  ]
}

Return maximum 3 matches.
`;

  const result = extractJson(await askGemini(prompt));

  if (!result || !Array.isArray(result.matches)) {
    return [];
  }

  return result.matches.slice(0, 3).map((match: any) => ({
    recyclerId: String(match.recyclerId || ""),
    companyName: String(
      match.companyName || "Unknown recycler",
    ),
    matchScore: clamp(
      Number(match.matchScore) || 0,
      0,
      1,
    ),
    reason: String(
      match.reason || "Potentially compatible recycler.",
    ),
    estimatedValue: String(
      match.estimatedValue || "Not estimated",
    ),
  }));
}

/* =========================================================
   7. MARKETPLACE LISTING DESCRIPTION
========================================================= */

export interface ListingDescriptionResult {
  title: string;
  description: string;
}

export async function generateListingDescription(
  inventory: {
    verifiedType: string;
    verifiedWeightKg: number;
    location: string;
    qualityGrade?: string | null;
    contamination?: string | null;
  },
): Promise<ListingDescriptionResult> {
  const prompt = `
Generate a professional recyclable-waste marketplace listing.

Verified information:

Waste type:
${inventory.verifiedType}

Verified quantity:
${inventory.verifiedWeightKg} kg

Location:
${inventory.location}

Quality grade:
${inventory.qualityGrade || "Unknown"}

Contamination:
${inventory.contamination || "Unknown"}

IMPORTANT:
Use ONLY the verified information supplied above.
Do not invent composition, purity, pricing, or recycling value.

Return ONLY JSON:

{
  "title": "Verified Plastic Waste - 125 kg",
  "description": "Professionally verified recyclable material..."
}
`;

  const result = extractJson(await askGemini(prompt));

  if (!result) {
    return {
      title: `Verified ${inventory.verifiedType} - ${inventory.verifiedWeightKg} kg`,
      description:
        `Verified recyclable material available at ${inventory.location}.`,
    };
  }

  return {
    title:
      result.title ||
      `Verified ${inventory.verifiedType}`,
    description:
      result.description ||
      `Verified recyclable material available at ${inventory.location}.`,
  };
}

/* =========================================================
   8. MASTER SUMMARY
========================================================= */

export interface SummaryResult {
  summary: string;
  priority: string;
  required_workers: number;
  estimated_time: number;
}

export async function generateMasterSummary(
  complaints: {
    description: string;
    latitude: number;
    longitude: number;
    wasteType?: string | null;
  }[],
): Promise<SummaryResult> {
  const complaintText = complaints
    .map(
      (c, index) => `
Complaint ${index + 1}:
Description: ${c.description}
Location: ${c.latitude}, ${c.longitude}
Waste type: ${c.wasteType || "Unknown"}
`,
    )
    .join("\n");

  const prompt = `
You are generating a field-worker work order for a municipal waste department.

Combine these citizen complaints:

${complaintText}

Generate a concise summary of approximately 50 words.

The summary MUST include:
- Exact/available location
- Primary waste type
- Number of citizens affected
- Specific request/action required

Return ONLY JSON:

{
  "summary": "...",
  "priority": "CRITICAL",
  "required_workers": 3,
  "estimated_time": 90
}
`;

  const result = extractJson(await askGemini(prompt));

  if (!result) {
    return {
      summary:
        complaints[0]?.description ||
        "Waste cleanup required.",
      priority: "STANDARD",
      required_workers: 2,
      estimated_time: 60,
    };
  }

  return {
    summary:
      result.summary || "Waste cleanup required.",
    priority: normalizePriority(result.priority),
    required_workers: Math.max(
      1,
      Number(result.required_workers) || 1,
    ),
    estimated_time: Math.max(
      15,
      Number(result.estimated_time) || 30,
    ),
  };
}

/* =========================================================
   FALLBACK: DUPLICATE
========================================================= */

function fallbackDuplicateDetection(
  description: string,
  candidates: DuplicateCandidate[],
): DuplicateResult {
  const words = new Set(
    description
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3),
  );

  let bestScore = 0;
  let bestId: string | null = null;

  for (const candidate of candidates) {
    const candidateWords = new Set(
      candidate.description
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length > 3),
    );

    const intersection = [...words].filter((word) =>
      candidateWords.has(word),
    );

    const union = new Set([
      ...words,
      ...candidateWords,
    ]);

    const score =
      union.size === 0
        ? 0
        : intersection.length / union.size;

    if (score > bestScore) {
      bestScore = score;
      bestId = candidate.id;
    }
  }

  return {
    isDuplicate: bestScore > 0.85,
    similarityScore: bestScore,
    matchingComplaintId: bestId,
    reason:
      "Fallback keyword similarity was used because Gemini was unavailable.",
  };
}

/* =========================================================
   FALLBACK: PRIORITY
========================================================= */

function fallbackPriority(
  description: string,
): PriorityResult {
  const text = description.toLowerCase();

  const criticalWords = [
    "blocked road",
    "main road",
    "hazardous",
    "chemical",
    "medical waste",
    "construction debris",
    "jcb",
    "dangerous",
    "emergency",
  ];

  const standardWords = [
    "garbage pile",
    "overflowing",
    "many bags",
    "large pile",
    "dump",
  ];

  const isCritical = criticalWords.some(
    (word) => text.includes(word),
  );

  if (isCritical) {
    return {
      priority: "CRITICAL",
      urgencyScore: 9,
      requiredWorkers: 3,
      requiredHeavyVehicles: 1,
      estimatedTimeMinutes: 90,
      wasteType: "General waste",
    };
  }

  const isStandard = standardWords.some(
    (word) => text.includes(word),
  );

  if (isStandard) {
    return {
      priority: "STANDARD",
      urgencyScore: 6,
      requiredWorkers: 2,
      requiredHeavyVehicles: 0,
      estimatedTimeMinutes: 60,
      wasteType: "General waste",
    };
  }

  return {
    priority: "TRIVIAL",
    urgencyScore: 3,
    requiredWorkers: 1,
    requiredHeavyVehicles: 0,
    estimatedTimeMinutes: 30,
    wasteType: "General waste",
  };
}

/* =========================================================
   FALLBACK: SENTIMENT
========================================================= */

function fallbackSentiment(
  description: string,
): SentimentResult {
  const text = description.toLowerCase();

  const negativeWords = [
    "fed up",
    "urgent",
    "dangerous",
    "health hazard",
    "children sick",
    "emergency",
    "disgusting",
    "terrible",
    "frustrated",
  ];

  const matches = negativeWords.filter(
    (word) => text.includes(word),
  ).length;

  const score = Math.min(1, matches * 0.2);

  return {
    sentimentScore: score,
    sentimentLabel:
      score >= 0.8
        ? "HIGHLY_NEGATIVE"
        : score >= 0.4
        ? "NEGATIVE"
        : "NEUTRAL",
    highPriority: score >= 0.8,
  };
}

/* =========================================================
   FALLBACK: IMAGE ANALYSIS
========================================================= */

function fallbackWasteImageAnalysis(): WasteImageAnalysis {
  return {
    categories: ["Unknown"],
    relativeVolume: "Unknown",
    condition: "Unknown",
    hazardousMaterialsDetected: false,
    hazardousTypes: [],
    accessibility: "Unknown",
    suggestedEquipment: ["manual labor"],
    visibleQualityIndicators: [],
    confidence: 0,
  };
}

/* =========================================================
   NORMALIZERS
========================================================= */

function normalizePriority(
  value: unknown,
): "CRITICAL" | "STANDARD" | "TRIVIAL" {
  const priority = String(value || "").toUpperCase();

  if (priority === "CRITICAL") return "CRITICAL";
  if (priority === "TRIVIAL") return "TRIVIAL";

  return "STANDARD";
}

function normalizeSentiment(
  value: unknown,
):
  | "POSITIVE"
  | "NEUTRAL"
  | "NEGATIVE"
  | "HIGHLY_NEGATIVE" {
  const sentiment = String(value || "").toUpperCase();

  if (sentiment === "POSITIVE") return "POSITIVE";
  if (sentiment === "NEGATIVE") return "NEGATIVE";
  if (sentiment === "HIGHLY_NEGATIVE")
    return "HIGHLY_NEGATIVE";

  return "NEUTRAL";
}

function normalizeRelativeVolume(
  value: unknown,
):
  | "Small"
  | "Medium"
  | "Large"
  | "Massive"
  | "Unknown" {
  const volume = String(value || "").toLowerCase();

  if (volume === "small") return "Small";
  if (volume === "medium") return "Medium";
  if (volume === "large") return "Large";
  if (volume === "massive") return "Massive";

  return "Unknown";
}

function normalizeWasteCondition(
  value: unknown,
):
  | "Clean"
  | "Mixed"
  | "Contaminated"
  | "Compacted"
  | "Unknown" {
  const condition = String(value || "").toLowerCase();

  if (condition === "clean") return "Clean";
  if (condition === "mixed") return "Mixed";
  if (condition === "contaminated")
    return "Contaminated";
  if (condition === "compacted")
    return "Compacted";

  return "Unknown";
}

function normalizeAccessibility(
  value: unknown,
):
  | "Easy"
  | "Moderate"
  | "Difficult"
  | "Unknown" {
  const accessibility = String(
    value || "",
  ).toLowerCase();

  if (accessibility === "easy") return "Easy";
  if (accessibility === "moderate")
    return "Moderate";
  if (accessibility === "difficult")
    return "Difficult";

  return "Unknown";
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    Math.max(value, min),
    max,
  );
}
