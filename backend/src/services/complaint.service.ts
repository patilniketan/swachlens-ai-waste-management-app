import fs from "fs/promises";
import { performance } from "perf_hooks";
import prisma from "../config/prisma.js";
import {
  analyzeComplaint,
  judgeDuplicates,
  type DuplicateCandidate,
  type DuplicateJudgment,
} from "./ai.service.js";
import { rescoreComplaint, scorePriority } from "./priority.service.js";
import { recordEvents, statusChangeEvent } from "./event.service.js";
import { calculateDistance } from "../utils/distance.js";
import { HttpError } from "../utils/httpError.js";
import { getTodayPlan } from "./plan.service.js";
import {
  ACTIVE_STATUSES,
  COMPLAINT_STATUSES,
  DUPLICATE_RADIUS_METERS,
  HOTSPOT_RADIUS_METERS,
  PRIORITIES,
  type ComplaintStatus,
  type Priority,
} from "../constants/complaint.js";
import type {
  AiSource,
  Complaint,
  Prisma,
} from "../generated/prisma/client.js";

interface CreateComplaintInput {
  text: string;
  address?: string | undefined;
  latitude: number;
  longitude: number;
  userId: string;
  imageUrl?: string | undefined;
  imagePath?: string | undefined;
  imageMimeType?: string | undefined;
  idempotencyKey?: string | undefined;
}

const MAX_DUPLICATE_CANDIDATES = 5;

const METRES_PER_DEGREE_LAT = 111_320;

const complaintWithReporter = {
  User: {
    select: {
      id: true,
      email: true,
      role: true,
    },
  },
} satisfies Prisma.ComplaintInclude;

type ComplaintWithReporter = Prisma.ComplaintGetPayload<{
  include: typeof complaintWithReporter;
}>;

// ============================================================
// DUPLICATE CANDIDATES
// ============================================================
// Bounding-box prefilter in SQL (active complaints only), then exact
// haversine distance, nearest first, capped at 5.
// ============================================================

export const findDuplicateCandidates = async (
  latitude: number,
  longitude: number,
  radiusMeters = DUPLICATE_RADIUS_METERS,
): Promise<DuplicateCandidate[]> => {
  const latDelta = radiusMeters / METRES_PER_DEGREE_LAT;
  const lngDelta =
    radiusMeters /
    (METRES_PER_DEGREE_LAT * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));

  const nearby = await prisma.complaint.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
      longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
    },
    select: {
      id: true,
      description: true,
      latitude: true,
      longitude: true,
    },
  });

  return nearby
    .map((complaint) => ({
      id: complaint.id,
      description: complaint.description,
      distanceMeters:
        calculateDistance(
          latitude,
          longitude,
          complaint.latitude,
          complaint.longitude,
        ) * 1000,
    }))
    .filter((candidate) => candidate.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_DUPLICATE_CANDIDATES);
};

// Nearest "yes" wins; otherwise the nearest "unsure". "no" never suggests.
const pickDuplicateSuggestion = (
  candidates: DuplicateCandidate[],
  judgments: DuplicateJudgment[],
) => {
  for (const verdict of ["yes", "unsure"] as const) {
    for (const candidate of candidates) {
      const judgment = judgments.find(
        (item) => item.candidateId === candidate.id && item.sameIssue === verdict,
      );

      if (judgment) return judgment;
    }
  }

  return null;
};

// ============================================================
// API RESPONSE
// ============================================================

export const buildComplaintResponse = async (
  complaint: ComplaintWithReporter,
  extras: { idempotentReplay?: boolean; processingMs?: number; aiErrors?: string[] } = {},
) => {
  const suggested = complaint.duplicateSuggestionOfId
    ? await prisma.complaint.findUnique({
        where: { id: complaint.duplicateSuggestionOfId },
        select: { id: true, aiSummary: true, description: true, status: true },
      })
    : null;

  return {
    complaint,

    duplicateSuggestion:
      complaint.duplicateSuggestionOfId && complaint.duplicateSuggestionVerdict
        ? {
            complaintId: complaint.duplicateSuggestionOfId,
            verdict: complaint.duplicateSuggestionVerdict,
            reason: complaint.duplicateSuggestionReason,
            summary: suggested?.aiSummary ?? suggested?.description ?? null,
            status: suggested?.status ?? null,
            confirmed: complaint.masterComplaintId !== null,
          }
        : null,

    ai: {
      source: complaint.aiSource,
      needsManualReview: complaint.needsManualReview,
      errors: extras.aiErrors ?? [],

      summary: complaint.aiSummary,
      wasteType: complaint.wasteType,
      wasteCategories: complaint.aiWasteCategories,
      relativeVolume: complaint.aiRelativeVolume,
      condition: complaint.aiWasteCondition,
      hazardousDetected: complaint.aiHazardousDetected,
      hazardousTypes: complaint.aiHazardousTypes,
      accessibility: complaint.aiAccessibility,
      suggestedEquipment: complaint.aiSuggestedEquipment,
      blockedRoad: complaint.aiBlockedRoad,
      nearSensitiveSite: complaint.aiNearSensitiveSite,
      confidence: complaint.aiImageConfidence,

      priority: complaint.priority,
      urgencyScore: complaint.urgencyScore,
      requiredWorkers: complaint.requiredWorkers,
      requiredHeavyVehicles: complaint.requiredHeavyVehicles,
      estimatedTimeMinutes: complaint.estimatedTimeMinutes,
      priorityReasons: complaint.priorityReasons,
    },

    idempotentReplay: extras.idempotentReplay ?? false,
    ...(extras.processingMs !== undefined && { processingMs: extras.processingMs }),
  };
};

// Returns the complaint already created with this key, or null.
// A key belongs to the user who first used it.
const findByIdempotencyKey = async (idempotencyKey: string, userId: string) => {
  const existing = await prisma.complaint.findUnique({
    where: { idempotencyKey },
    include: complaintWithReporter,
  });

  if (existing && existing.userId !== userId) {
    throw new HttpError(409, "This Idempotency-Key has already been used.");
  }

  return existing;
};

const isUniqueViolation = (error: unknown) =>
  (error as { code?: unknown })?.code === "P2002";

// ============================================================
// CREATE COMPLAINT
// ============================================================
// 1. analysis (one multimodal AI call)       } in parallel
// 2. duplicate candidates (SQL) + AI judgment }
// 3. deterministic priority from features
// 4. save; duplicates are only SUGGESTED (staff confirm separately)
// ============================================================

export const createComplaint = async ({
  text,
  address,
  latitude,
  longitude,
  userId,
  imageUrl,
  imagePath,
  imageMimeType,
  idempotencyKey,
}: CreateComplaintInput) => {
  const startedAt = performance.now();

  if (idempotencyKey) {
    const existing = await findByIdempotencyKey(idempotencyKey, userId);

    if (existing) {
      return {
        replayed: true,
        response: await buildComplaintResponse(existing, { idempotentReplay: true }),
      };
    }
  }

  const image = imagePath
    ? { data: await fs.readFile(imagePath), mimeType: imageMimeType ?? "image/jpeg" }
    : undefined;

  const timings: Record<string, number> = {};
  const timed = async <T>(label: string, work: () => Promise<T>) => {
    const start = performance.now();
    try {
      return await work();
    } finally {
      timings[label] = Math.round(performance.now() - start);
    }
  };

  const [analysis, duplicateCheck] = await Promise.all([
    timed("analysisMs", () => analyzeComplaint({ description: text, image })),
    timed("duplicateMs", async () => {
      const candidates = await findDuplicateCandidates(latitude, longitude);

      return {
        candidates,
        result: candidates.length > 0 ? await judgeDuplicates(text, candidates) : null,
      };
    }),
  ]);

  const { features } = analysis;
  const duplicateResult = duplicateCheck.result;

  const aiErrors = [analysis.error, duplicateResult?.error].filter(
    (error): error is string => Boolean(error),
  );

  const stepSources = [analysis.source, duplicateResult?.source].filter(Boolean);

  const aiSource: AiSource = stepSources.includes("fallback")
    ? "fallback"
    : stepSources.includes("gemini")
      ? "gemini"
      : "cached";

  const scored = scorePriority(features, 1);

  const priorityReasons =
    analysis.source === "fallback"
      ? [
          ...scored.reasons,
          "AI analysis unavailable: features from keyword rules only. Needs manual review.",
        ]
      : scored.reasons;

  const suggestion = duplicateResult?.judgments
    ? pickDuplicateSuggestion(duplicateCheck.candidates, duplicateResult.judgments)
    : null;

  const data: Prisma.ComplaintUncheckedCreateInput = {
    userId,
    description: text,
    imageUrl: imageUrl ?? null,
    latitude,
    longitude,
    address: address ?? null,
    wasteType: features.wasteType,
    status: "Pending",
    voteCount: 1,
    isScheduled: false,

    priority: scored.priority,
    urgencyScore: scored.urgencyScore,
    requiredWorkers: scored.requiredWorkers,
    requiredHeavyVehicles: scored.requiredHeavyVehicles,
    estimatedTimeMinutes: scored.estimatedTimeMinutes,
    priorityReasons,

    aiWasteCategories: features.wasteCategories,
    aiRelativeVolume: features.relativeVolume,
    aiWasteCondition: features.condition,
    aiHazardousDetected: features.hazardousDetected,
    aiHazardousTypes: features.hazardousTypes,
    aiAccessibility: features.accessibility,
    aiSuggestedEquipment: features.suggestedEquipment,
    aiBlockedRoad: features.blockedRoad,
    aiNearSensitiveSite: features.nearSensitiveSite,
    aiImageConfidence: features.confidence,
    aiSummary: features.summary,
    aiSource,
    needsManualReview: aiSource === "fallback",

    duplicateSuggestionOfId: suggestion?.candidateId ?? null,
    duplicateSuggestionVerdict: suggestion?.sameIssue ?? null,
    duplicateSuggestionReason: suggestion?.reason ?? null,

    idempotencyKey: idempotencyKey ?? null,

    events: {
      create: {
        actorId: userId,
        type: "CREATED",
        toValue: "Pending",
        reason: `aiSource=${aiSource}`,
      },
    },
  };

  let complaint: ComplaintWithReporter;

  try {
    complaint = await timed("saveMs", () =>
      prisma.complaint.create({ data, include: complaintWithReporter }),
    );
  } catch (error) {
    // Two requests with the same key raced; return the one that won.
    if (idempotencyKey && isUniqueViolation(error)) {
      const existing = await findByIdempotencyKey(idempotencyKey, userId);

      if (existing) {
        return {
          replayed: true,
          response: await buildComplaintResponse(existing, { idempotentReplay: true }),
        };
      }
    }

    throw error;
  }

  const processingMs = Math.round(performance.now() - startedAt);

  console.log(
    `[complaint ${complaint.id}] created in ${processingMs}ms ` +
      `(analysis ${timings.analysisMs}ms, duplicates ${timings.duplicateMs}ms ` +
      `[${duplicateCheck.candidates.length} candidates], save ${timings.saveMs}ms) ` +
      `aiSource=${aiSource} priority=${scored.priority}` +
      (suggestion ? ` duplicateSuggestion=${suggestion.candidateId}(${suggestion.sameIssue})` : "") +
      (aiErrors.length ? ` errors=${JSON.stringify(aiErrors)}` : ""),
  );

  return {
    replayed: false,
    response: await buildComplaintResponse(complaint, { processingMs, aiErrors }),
  };
};

// ============================================================
// CONFIRM DUPLICATE (staff)
// ============================================================
// Links the complaint to its master in one transaction: masterComplaintId,
// status=Linked, master voteCount += the duplicate's votes, master priority
// re-scored with the new vote count.
// ============================================================

const LINKED_STATUSES: ComplaintStatus[] = ["Linked", "Merged"];

export const confirmDuplicate = async (
  complaintId: string,
  confirmedBy: string,
  requestedMasterId?: string,
) => {
  return prisma.$transaction(
    async (tx) => {
      const complaint = await tx.complaint.findUnique({
        where: { id: complaintId },
      });

      if (!complaint) {
        throw new HttpError(404, "Complaint not found");
      }

      const targetId = requestedMasterId ?? complaint.duplicateSuggestionOfId;

      if (!targetId) {
        throw new HttpError(400, "This complaint has no duplicate suggestion to confirm.");
      }

      let master: Complaint | null = await tx.complaint.findUnique({
        where: { id: targetId },
      });

      // If the suggested complaint was itself linked meanwhile, use its master.
      if (master?.masterComplaintId) {
        master = await tx.complaint.findUnique({
          where: { id: master.masterComplaintId },
        });
      }

      if (!master) {
        throw new HttpError(404, "Suggested original complaint not found");
      }

      if (master.id === complaint.id) {
        throw new HttpError(400, "A complaint cannot be a duplicate of itself.");
      }

      if (LINKED_STATUSES.includes(master.status)) {
        throw new HttpError(409, "The suggested original is itself linked or merged.");
      }

      // Atomic claim: a concurrent confirm for the same complaint gets 0 rows.
      const claimed = await tx.complaint.updateMany({
        where: {
          id: complaint.id,
          status: { notIn: LINKED_STATUSES },
        },
        data: {
          masterComplaintId: master.id,
          status: "Linked",
        },
      });

      if (claimed.count === 0) {
        throw new HttpError(409, "This complaint is already linked or merged.");
      }

      // Anything already linked to the duplicate moves to the master.
      await tx.complaint.updateMany({
        where: { masterComplaintId: complaint.id },
        data: { masterComplaintId: master.id },
      });

      const withVotes = await tx.complaint.update({
        where: { id: master.id },
        data: { voteCount: { increment: complaint.voteCount } },
      });

      const updatedMaster = await tx.complaint.update({
        where: { id: master.id },
        data: rescoreComplaint(withVotes, withVotes.voteCount),
      });

      const reason =
        complaint.duplicateSuggestionOfId === master.id
          ? complaint.duplicateSuggestionReason
          : "Linked manually by staff.";

      await tx.complaintLink.upsert({
        where: {
          masterComplaintId_linkedComplaintId: {
            masterComplaintId: master.id,
            linkedComplaintId: complaint.id,
          },
        },
        create: {
          masterComplaintId: master.id,
          linkedComplaintId: complaint.id,
          reason,
          confirmedBy,
        },
        update: { reason, confirmedBy },
      });

      await recordEvents(tx, [
        {
          complaintId: complaint.id,
          actorId: confirmedBy,
          type: "DUPLICATE_CONFIRMED",
          fromValue: complaint.duplicateSuggestionOfId,
          toValue: master.id,
          reason,
        },
        statusChangeEvent(complaint.id, confirmedBy, complaint.status, "Linked"),
      ]);

      const linked = await tx.complaint.findUniqueOrThrow({
        where: { id: complaint.id },
      });

      return { complaint: linked, master: updatedMaster };
    },
    { timeout: 20_000 },
  );
};

// ============================================================
// REJECT DUPLICATE SUGGESTION (staff)
// ============================================================
// Clears the suggestion and records the decision; the complaint stays a
// separate report.
// ============================================================

export const rejectDuplicate = async (
  complaintId: string,
  rejectedBy: string,
  reason?: string,
) => {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new HttpError(404, "Complaint not found");
    }

    if (!complaint.duplicateSuggestionOfId) {
      throw new HttpError(400, "This complaint has no duplicate suggestion to reject.");
    }

    if (complaint.masterComplaintId) {
      throw new HttpError(409, "This complaint is already linked; the suggestion cannot be rejected.");
    }

    const updated = await tx.complaint.update({
      where: { id: complaint.id },
      data: {
        duplicateSuggestionOfId: null,
        duplicateSuggestionVerdict: null,
        duplicateSuggestionReason: null,
      },
    });

    await recordEvents(tx, [
      {
        complaintId: complaint.id,
        actorId: rejectedBy,
        type: "DUPLICATE_REJECTED",
        fromValue: complaint.duplicateSuggestionOfId,
        reason: reason ?? complaint.duplicateSuggestionReason,
      },
    ]);

    return updated;
  });
};

// ============================================================
// GET NEARBY COMPLAINTS
// ============================================================
// Visible to every signed-in user, so only public fields are selected:
// no reporter id/email, staff ids or idempotency keys.
// ============================================================

const PUBLIC_COMPLAINT_SELECT = {
  id: true,
  description: true,
  imageUrl: true,
  latitude: true,
  longitude: true,
  address: true,
  wasteType: true,
  status: true,
  priority: true,
  urgencyScore: true,
  voteCount: true,
  aiSummary: true,
  aiWasteCategories: true,
  isSimulated: true,
  masterComplaintId: true,
  afterImageUrl: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ComplaintSelect;

export const getNearbyComplaints = async (
  latitude: number,
  longitude: number,
  radiusMeters = 500,
) => {
  const complaints =
    await prisma.complaint.findMany({
      where: {
        status: {
          in: ACTIVE_STATUSES,
        },
      },

      select: PUBLIC_COMPLAINT_SELECT,

      orderBy: {
        createdAt: "desc",
      },
    });

  const radiusKm =
    radiusMeters / 1000;

  return complaints
    .map((complaint) => {
      const distanceKm =
        calculateDistance(
          latitude,
          longitude,
          complaint.latitude,
          complaint.longitude,
        );

      return {
        ...complaint,

        distanceMeters:
          Math.round(
            distanceKm * 1000,
          ),

        distanceKm,
      };
    })
    .filter(
      (complaint) =>
        complaint.distanceKm <=
        radiusKm,
    )
    .sort(
      (a, b) =>
        a.distanceKm -
        b.distanceKm,
    );
};

// ============================================================
// CITIZEN VIEW
// ============================================================
// What a citizen sees of their own complaint: no reporter email, no staff
// user ids (assignment staff/assigner, verifier).
// ============================================================

const citizenAssignmentSelect = {
  id: true,
  status: true,
  assignedAt: true,
  updatedAt: true,
} satisfies Prisma.AssignmentSelect;

const toCitizenView = <T extends { verifiedBy: string | null; User?: unknown }>(
  complaint: T,
): Omit<T, "verifiedBy" | "User"> => {
  const { verifiedBy: _verifiedBy, User: _reporter, ...rest } = complaint;

  return rest;
};

// ============================================================
// GET USER COMPLAINTS
// ============================================================

export const getUserComplaints = async (
  userId: string,
) => {
  const complaints = await prisma.complaint.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      assignments: { select: citizenAssignmentSelect },
    },
  });

  return complaints.map((complaint) => toCitizenView(complaint));
};

// ============================================================
// GET SINGLE COMPLAINT
// ============================================================
// Citizens may only read their own complaints (others look "not found" so
// ids cannot be probed); staff and admins can read any, with reporter info.
// ============================================================

// Event types a citizen sees in their own timeline. Internal decisions
// (priority overrides, dismissed duplicate suggestions) are left out.
const CITIZEN_EVENT_TYPES = [
  "CREATED",
  "STATUS_CHANGED",
  "ASSIGNED",
  "DUPLICATE_CONFIRMED",
  "MERGED",
] as const;

type TimelineEvent = {
  type: string;
  fromValue: string | null;
  toValue: string | null;
  reason: string | null;
  createdAt: Date;
  actor?: { id: string; email: string; role: string } | null;
};

// No actors, no staff emails; only the completion note keeps its text.
const toCitizenTimeline = (events: TimelineEvent[]) =>
  events
    .filter((event) =>
      (CITIZEN_EVENT_TYPES as readonly string[]).includes(event.type),
    )
    .map((event) => ({
      type: event.type,
      fromValue: event.fromValue,
      toValue: event.type === "ASSIGNED" ? null : event.toValue,
      reason:
        event.type === "STATUS_CHANGED" && event.toValue === "Resolved"
          ? event.reason
          : null,
      createdAt: event.createdAt,
    }));

export const getComplaintById = async (
  complaintId: string,
  viewer: { userId: string; role: string | undefined },
) => {
  const isStaff = viewer.role === "STAFF" || viewer.role === "ADMIN";

  // In parallel: each database round trip is the expensive part.
  const [complaint, events] = await Promise.all([
    prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },

      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },

        assignments: isStaff ? true : { select: citizenAssignmentSelect },

        childComplaints: {
          select: {
            id: true,
            description: true,
            status: true,
            voteCount: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.complaintEvent.findMany({
      where: { complaintId },
      orderBy: { createdAt: "asc" },
      include: {
        actor: { select: { id: true, email: true, role: true } },
      },
    }),
  ]);

  if (!complaint) {
    throw new HttpError(404, "Complaint not found");
  }

  if (isStaff) {
    return { ...complaint, timeline: events };
  }

  if (complaint.userId !== viewer.userId) {
    throw new HttpError(404, "Complaint not found");
  }

  return { ...toCitizenView(complaint), timeline: toCitizenTimeline(events) };
};

// ============================================================
// UPDATE COMPLAINT
// ============================================================

export const updateComplaint = async (
  complaintId: string,
  actorId: string,
  data: {
    status?: ComplaintStatus | undefined;
    address?: string | undefined;
    wasteType?: string | undefined;
    isScheduled?: boolean | undefined;
  },
) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!existing) {
      throw new HttpError(404, "Complaint not found");
    }

    const statusChanged =
      data.status !== undefined && data.status !== existing.status;

    const updated = await tx.complaint.update({
      where: { id: complaintId },
      data: {
        ...(data.address !== undefined && { address: data.address }),
        ...(data.wasteType !== undefined && { wasteType: data.wasteType }),
        ...(data.isScheduled !== undefined && { isScheduled: data.isScheduled }),
        ...(statusChanged && {
          status: data.status as ComplaintStatus,
          resolvedAt:
            data.status === "Resolved" ? (existing.resolvedAt ?? new Date()) : null,
        }),
      },
    });

    if (statusChanged) {
      await recordEvents(tx, [
        statusChangeEvent(
          complaintId,
          actorId,
          existing.status,
          data.status as string,
          "Changed by staff edit",
        ),
      ]);
    }

    return updated;
  });
};

// ============================================================
// VERIFY COMPLAINT
// ============================================================
// Staff confirms the report is genuine. This is recorded on
// verifiedAt/verifiedBy and does not change the lifecycle status,
// so a verified complaint stays in the active work queue.
// ============================================================

export const verifyComplaint = async (
  complaintId: string,
  verifiedBy: string,
) => {
  const complaint =
    await prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },
    });

  if (!complaint) {
    throw new HttpError(404,
      "Complaint not found",
    );
  }

  return prisma.complaint.update({
    where: {
      id: complaintId,
    },

    data: {
      verifiedAt: new Date(),
      verifiedBy,
    },
  });
};

// ============================================================
// GET HOTSPOTS
// ============================================================

const getPriorityWeight = (priority: Priority) => {
  switch (priority) {
    case "CRITICAL":
      return 10;
    case "STANDARD":
      return 4;
    case "TRIVIAL":
      return 1;
  }
};

export const getHotspots = async () => {
  const complaints = await prisma.complaint.findMany({
    where: {
      status: {
        in: ACTIVE_STATUSES,
      },
    },

    select: {
      id: true,
      latitude: true,
      longitude: true,
      wasteType: true,
      priority: true,
      voteCount: true,
      status: true,
      createdAt: true,
      isSimulated: true,
    },
  });

  // Remove complaints without valid coordinates
  const validComplaints = complaints.filter(
    (complaint) =>
      complaint.latitude !== null &&
      complaint.longitude !== null
  );

  const hotspots: any[] = [];

  for (const complaint of validComplaints) {
    const latitude = Number(complaint.latitude);
    const longitude = Number(complaint.longitude);

    // Find an existing hotspot within HOTSPOT_RADIUS_METERS
    let hotspot = hotspots.find((existingHotspot) => {
      const distanceKm = calculateDistance(
        latitude,
        longitude,
        existingHotspot.latitude,
        existingHotspot.longitude
      );

      return distanceKm * 1000 <= HOTSPOT_RADIUS_METERS;
    });

    // Create a new hotspot if none exists
    if (!hotspot) {
      hotspot = {
        latitude,
        longitude,
        complaints: [],
        complaintCount: 0,
        score: 0,
        totalVotes: 0,
      };

      hotspots.push(hotspot);
    }

    // Add complaint to hotspot
    hotspot.complaints.push(complaint);

    hotspot.complaintCount += 1;

    hotspot.totalVotes += complaint.voteCount || 0;

    // Priority contribution
    hotspot.score += getPriorityWeight(complaint.priority);
  }

  // Calculate final hotspot score
  const finalHotspots = hotspots.map((hotspot) => {
    const complaintScore = hotspot.complaintCount * 5;

    const voteScore = Math.min(hotspot.totalVotes * 0.5, 20);

    const finalScore =
      hotspot.score +
      complaintScore +
      voteScore;

    let level = "LOW";

    if (finalScore >= 40) {
      level = "CRITICAL";
    } else if (finalScore >= 25) {
      level = "HIGH";
    } else if (finalScore >= 12) {
      level = "MEDIUM";
    }

    return {
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,

      complaintCount: hotspot.complaintCount,

      totalVotes: hotspot.totalVotes,

      radiusMeters: HOTSPOT_RADIUS_METERS,

      simulatedCount: hotspot.complaints.filter(
        (complaint: any) => complaint.isSimulated,
      ).length,

      score: Math.round(finalScore * 100) / 100,

      level,

      complaintIds: hotspot.complaints.map(
        (complaint: any) => complaint.id
      ),

      wasteTypes: [
        ...new Set(
          hotspot.complaints.map(
            (complaint: any) => complaint.wasteType
          )
        ),
      ],

      statuses: [
        ...new Set(
          hotspot.complaints.map(
            (complaint: any) => complaint.status
          )
        ),
      ],
    };
  });

  // Highest priority hotspots first
  return finalHotspots.sort((a, b) => b.score - a.score);
};
// ============================================================
// MERGE COMPLAINTS
// ============================================================

export const mergeComplaints = async (
  complaintIds: string[],
  actorId: string,
) => {
  const ids = [...new Set(complaintIds)];

  if (ids.length < 2) {
    throw new HttpError(400, "At least two different complaints are required for merging");
  }

  // The first id in the request is the master.
  const [masterId, ...mergedIds] = ids as [string, ...string[]];

  return prisma.$transaction(
    async (tx) => {
      const complaints = await tx.complaint.findMany({
        where: { id: { in: ids } },
      });

      if (complaints.length !== ids.length) {
        throw new HttpError(404, "One or more complaints were not found");
      }

      const alreadyLinked = complaints.filter(
        (complaint) =>
          complaint.status === "Linked" ||
          complaint.status === "Merged" ||
          complaint.masterComplaintId !== null,
      );

      if (alreadyLinked.length > 0) {
        throw new HttpError(
          409,
          `Already linked or merged: ${alreadyLinked.map((c) => c.id).join(", ")}`,
        );
      }

      const merged = complaints.filter((complaint) => complaint.id !== masterId);
      const addedVotes = merged.reduce((total, c) => total + c.voteCount, 0);

      await tx.complaint.updateMany({
        where: { id: { in: mergedIds } },
        data: { masterComplaintId: masterId, status: "Merged" },
      });

      // Anything already linked to a merged complaint moves to the master.
      await tx.complaint.updateMany({
        where: { masterComplaintId: { in: mergedIds } },
        data: { masterComplaintId: masterId },
      });

      // The master keeps its status (it may already be assigned).
      const withVotes = await tx.complaint.update({
        where: { id: masterId },
        data: { voteCount: { increment: addedVotes } },
      });

      const updatedMaster = await tx.complaint.update({
        where: { id: masterId },
        data: rescoreComplaint(withVotes, withVotes.voteCount),
      });

      await recordEvents(
        tx,
        merged.flatMap((complaint) => [
          {
            complaintId: complaint.id,
            actorId,
            type: "MERGED" as const,
            toValue: masterId,
          },
          statusChangeEvent(complaint.id, actorId, complaint.status, "Merged"),
        ]),
      );

      return {
        masterComplaint: updatedMaster,
        mergedComplaintIds: mergedIds,
        voteCount: updatedMaster.voteCount,
      };
    },
    { timeout: 20_000 },
  );
};

// ============================================================
// GET TODAY'S TASKS
// ============================================================
// The complaints in today's generated plan (committed + scheduled) that
// are still active, in plan order. No plan today -> no tasks, so a plan
// from a previous day can never show up as today's work.
// ============================================================

export const getTodaysTasks = async () => {
  const plan = await getTodayPlan();

  if (!plan) {
    return { planGenerated: false, generatedAt: null, tasks: [] };
  }

  const order = [...plan.committed, ...plan.scheduled].map(
    (item) => item.complaintId,
  );

  const complaints = await prisma.complaint.findMany({
    where: {
      id: { in: order },
      status: { in: ACTIVE_STATUSES },
    },
    include: {
      assignments: true,
    },
  });

  const position = new Map(order.map((id, index) => [id, index]));

  return {
    planGenerated: true,
    generatedAt: plan.generatedAt,
    tasks: complaints.sort(
      (a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0),
    ),
  };
};
