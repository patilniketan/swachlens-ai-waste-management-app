import prisma from "../config/prisma.js";
import { getDailyResources } from "./resource.service.js";
import { utcDayKey } from "../utils/date.js";
import type { Prisma } from "../generated/prisma/client.js";

// ============================================================
// DAILY PLAN (greedy, capacity-aware)
// ============================================================
// Capacity for the day = workers x shift minutes (worker-minutes) and
// heavy vehicles x shift minutes (vehicle-minutes).
//
// 1. Work already Assigned / InProgress is reserved first ("committed").
// 2. Pending, unassigned master complaints are sorted by urgency desc,
//    votes desc, oldest first, and taken while they fit. A job costs
//    requiredWorkers x estimatedTimeMinutes worker-minutes (same for
//    vehicles). Anything that does not fit is deferred with the reason.
// 3. Selected + committed complaints get isScheduled=true (all others
//    false) and the plan is stored on today's Resource row.
// ============================================================

const readMinutes = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 60 && parsed <= 1440
    ? parsed
    : fallback;
};

export const SHIFT_MINUTES = readMinutes(process.env.SHIFT_MINUTES, 480);

// Used when a complaint has no time estimate.
const DEFAULT_JOB_MINUTES = 60;

const planComplaintSelect = {
  id: true,
  status: true,
  priority: true,
  urgencyScore: true,
  voteCount: true,
  requiredWorkers: true,
  requiredHeavyVehicles: true,
  estimatedTimeMinutes: true,
  wasteType: true,
  aiSummary: true,
  address: true,
  needsManualReview: true,
  isSimulated: true,
  createdAt: true,
} satisfies Prisma.ComplaintSelect;

type PlanComplaint = Prisma.ComplaintGetPayload<{
  select: typeof planComplaintSelect;
}>;

export interface PlanItem {
  complaintId: string;
  status: string;
  priority: string;
  urgencyScore: number;
  voteCount: number;
  requiredWorkers: number;
  requiredHeavyVehicles: number;
  estimatedTimeMinutes: number;
  workerMinutes: number;
  vehicleMinutes: number;
  wasteType: string | null;
  summary: string | null;
  address: string | null;
  needsManualReview: boolean;
  isSimulated: boolean;
}

export interface DeferredItem extends PlanItem {
  reason: string;
}

interface Capacity {
  workerMinutes: number;
  vehicleMinutes: number;
}

export interface DailyPlan {
  date: string;
  generatedAt: string;
  generatedBy: string;
  shiftMinutes: number;
  resources: { workers: number; heavyVehicles: number; available: boolean };
  capacityTotal: Capacity;
  capacityUsed: Capacity & { committed: Capacity; scheduled: Capacity };
  capacityRemaining: Capacity;
  // e.g. already-assigned work alone exceeds today's capacity.
  warnings: string[];
  committed: PlanItem[];
  scheduled: PlanItem[];
  deferred: DeferredItem[];
}

const toItem = (complaint: PlanComplaint): PlanItem => {
  const minutes = complaint.estimatedTimeMinutes ?? DEFAULT_JOB_MINUTES;

  return {
    complaintId: complaint.id,
    status: complaint.status,
    priority: complaint.priority,
    urgencyScore: complaint.urgencyScore,
    voteCount: complaint.voteCount,
    requiredWorkers: complaint.requiredWorkers,
    requiredHeavyVehicles: complaint.requiredHeavyVehicles,
    estimatedTimeMinutes: minutes,
    workerMinutes: complaint.requiredWorkers * minutes,
    vehicleMinutes: complaint.requiredHeavyVehicles * minutes,
    wasteType: complaint.wasteType,
    summary: complaint.aiSummary,
    address: complaint.address,
    needsManualReview: complaint.needsManualReview,
    isSimulated: complaint.isSimulated,
  };
};

const sum = (items: PlanItem[]): Capacity => ({
  workerMinutes: items.reduce((total, item) => total + item.workerMinutes, 0),
  vehicleMinutes: items.reduce((total, item) => total + item.vehicleMinutes, 0),
});

// Why a job cannot be scheduled with what is left, or null if it fits.
const deferralReason = (
  item: PlanItem,
  resources: { workers: number; heavyVehicles: number; available: boolean },
  remaining: Capacity,
): string | null => {
  if (!resources.available) {
    return "Resources are marked unavailable today.";
  }

  if (item.estimatedTimeMinutes > SHIFT_MINUTES) {
    return `Takes ${item.estimatedTimeMinutes} min, longer than one ${SHIFT_MINUTES}-min shift.`;
  }

  if (item.requiredWorkers > resources.workers) {
    return `Needs ${item.requiredWorkers} workers at once; only ${resources.workers} on duty today.`;
  }

  if (item.requiredHeavyVehicles > resources.heavyVehicles) {
    return `Needs ${item.requiredHeavyVehicles} heavy vehicle(s); only ${resources.heavyVehicles} available today.`;
  }

  if (item.workerMinutes > remaining.workerMinutes) {
    return `Not enough crew time left: needs ${item.workerMinutes} worker-min, ${Math.max(remaining.workerMinutes, 0)} left.`;
  }

  if (item.vehicleMinutes > remaining.vehicleMinutes) {
    return `Not enough heavy-vehicle time left: needs ${item.vehicleMinutes} vehicle-min, ${Math.max(remaining.vehicleMinutes, 0)} left.`;
  }

  return null;
};

export const generatePlan = async (adminId: string): Promise<DailyPlan> => {
  const resource = await getDailyResources();

  const [committedRows, candidateRows] = await Promise.all([
    prisma.complaint.findMany({
      where: {
        masterComplaintId: null,
        status: { in: ["Assigned", "InProgress"] },
      },
      select: planComplaintSelect,
      orderBy: [{ urgencyScore: "desc" }, { voteCount: "desc" }, { createdAt: "asc" }],
    }),
    prisma.complaint.findMany({
      where: {
        masterComplaintId: null,
        status: "Pending",
        // Unassigned: no assignment that is still open.
        assignments: { none: { status: { not: "COMPLETED" } } },
      },
      select: planComplaintSelect,
      orderBy: [{ urgencyScore: "desc" }, { voteCount: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  const resources = {
    workers: resource.workers,
    heavyVehicles: resource.heavyVehicles,
    available: resource.available,
  };

  const capacityTotal: Capacity = {
    workerMinutes: resource.workers * SHIFT_MINUTES,
    vehicleMinutes: resource.heavyVehicles * SHIFT_MINUTES,
  };

  const committed = committedRows.map(toItem);
  const committedUse = sum(committed);

  const remaining: Capacity = {
    workerMinutes: capacityTotal.workerMinutes - committedUse.workerMinutes,
    vehicleMinutes: capacityTotal.vehicleMinutes - committedUse.vehicleMinutes,
  };

  const scheduled: PlanItem[] = [];
  const deferred: DeferredItem[] = [];

  for (const item of candidateRows.map(toItem)) {
    const reason = deferralReason(item, resources, remaining);

    if (reason) {
      deferred.push({ ...item, reason });
      continue;
    }

    scheduled.push(item);
    remaining.workerMinutes -= item.workerMinutes;
    remaining.vehicleMinutes -= item.vehicleMinutes;
  }

  const scheduledUse = sum(scheduled);
  const generatedAt = new Date();

  // The planner never schedules past capacity, but work that is already
  // assigned can exceed it on its own (e.g. after resources were reduced).
  const warnings: string[] = [];

  if (committedUse.workerMinutes > capacityTotal.workerMinutes) {
    warnings.push(
      `Already-assigned work needs ${committedUse.workerMinutes} worker-min, more than today's ${capacityTotal.workerMinutes}.`,
    );
  }

  if (committedUse.vehicleMinutes > capacityTotal.vehicleMinutes) {
    warnings.push(
      `Already-assigned work needs ${committedUse.vehicleMinutes} vehicle-min, more than today's ${capacityTotal.vehicleMinutes}.`,
    );
  }

  const plan: DailyPlan = {
    date: utcDayKey(resource.date),
    generatedAt: generatedAt.toISOString(),
    generatedBy: adminId,
    shiftMinutes: SHIFT_MINUTES,
    resources,
    capacityTotal,
    capacityUsed: {
      workerMinutes: committedUse.workerMinutes + scheduledUse.workerMinutes,
      vehicleMinutes: committedUse.vehicleMinutes + scheduledUse.vehicleMinutes,
      committed: committedUse,
      scheduled: scheduledUse,
    },
    capacityRemaining: {
      workerMinutes: capacityTotal.workerMinutes - committedUse.workerMinutes - scheduledUse.workerMinutes,
      vehicleMinutes: capacityTotal.vehicleMinutes - committedUse.vehicleMinutes - scheduledUse.vehicleMinutes,
    },
    warnings,
    committed,
    scheduled,
    deferred,
  };

  const plannedIds = [...committed, ...scheduled].map((item) => item.complaintId);

  await prisma.$transaction([
    prisma.complaint.updateMany({
      where: { isScheduled: true, id: { notIn: plannedIds } },
      data: { isScheduled: false },
    }),
    prisma.complaint.updateMany({
      where: { id: { in: plannedIds } },
      data: { isScheduled: true },
    }),
    prisma.resource.update({
      where: { id: resource.id },
      data: {
        plan: plan as unknown as Prisma.InputJsonValue,
        planGeneratedAt: generatedAt,
        planGeneratedBy: adminId,
      },
    }),
  ]);

  return plan;
};

// Today's stored plan, or null when none has been generated today.
export const getTodayPlan = async (): Promise<DailyPlan | null> => {
  const resource = await getDailyResources();

  return (resource.plan as unknown as DailyPlan | null) ?? null;
};
