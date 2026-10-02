import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { OVERRIDE_REASON_PREFIX } from "./priority.service.js";
import { recordEvent } from "./event.service.js";
import type { ComplaintStatus } from "../constants/complaint.js";
import type { Prisma, Priority } from "../generated/prisma/client.js";

const complaintListInclude = {
  User: {
    select: {
      id: true,
      email: true,
      role: true,
    },
  },
  assignments: {
    include: {
      staff: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  },
} satisfies Prisma.ComplaintInclude;

export interface ComplaintListQuery {
  take: number;
  skip: number;
  status?: ComplaintStatus | undefined;
  priority?: Priority | undefined;
  wasteType?: string | undefined;
  sort: "newest" | "urgency";
}

const LIST_ORDER: Record<ComplaintListQuery["sort"], Prisma.ComplaintOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  urgency: [{ urgencyScore: "desc" }, { voteCount: "desc" }, { createdAt: "asc" }, { id: "asc" }],
};

// Paginated, filterable list.
export const getAllComplaints = async ({
  take,
  skip,
  status,
  priority,
  wasteType,
  sort,
}: ComplaintListQuery) => {
  const where: Prisma.ComplaintWhereInput = {
    ...(status && { status }),
    ...(priority && { priority }),
    ...(wasteType && { wasteType }),
  };

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: complaintListInclude,
      orderBy: LIST_ORDER[sort],
      take,
      skip,
    }),
    prisma.complaint.count({ where }),
  ]);

  return { items, total };
};

export const getComplaintDetails = async (complaintId: string) => {
  const complaint = await prisma.complaint.findUnique({
    where: {
      id: complaintId,
    },
    include: {
      ...complaintListInclude,
      // Reports linked or merged into this one.
      childComplaints: {
        select: {
          id: true,
          description: true,
          status: true,
          voteCount: true,
          aiSummary: true,
          imageUrl: true,
          isSimulated: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      masterComplaint: {
        select: { id: true, aiSummary: true, description: true, status: true },
      },
    },
  });

  if (!complaint) {
    throw new HttpError(404, "Complaint not found");
  }

  // The complaint the AI suggested this one duplicates (for the review card).
  const duplicateSuggestionTarget = complaint.duplicateSuggestionOfId
    ? await prisma.complaint.findUnique({
        where: { id: complaint.duplicateSuggestionOfId },
        select: {
          id: true,
          description: true,
          aiSummary: true,
          status: true,
          imageUrl: true,
          voteCount: true,
          createdAt: true,
        },
      })
    : null;

  return { ...complaint, duplicateSuggestionTarget };
};

// Staff with their real workload (assignment counts per status).
export const getAllStaff = async () => {
  const [staff, counts, openAssignments] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "STAFF",
      },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: {
        email: "asc",
      },
    }),
    prisma.assignment.groupBy({
      by: ["staffId", "status"],
      _count: { _all: true },
    }),
    prisma.assignment.findMany({
      where: { status: { not: "COMPLETED" } },
      orderBy: { assignedAt: "desc" },
      select: {
        staffId: true,
        status: true,
        complaint: { select: { id: true, wasteType: true, address: true } },
      },
    }),
  ]);

  const countFor = (staffId: string, status: string) =>
    counts.find((row) => row.staffId === staffId && row.status === status)?._count._all ?? 0;

  return staff.map((member) => {
    const current = openAssignments.find((row) => row.staffId === member.id);

    return {
      ...member,
      assigned: countFor(member.id, "ASSIGNED"),
      inProgress: countFor(member.id, "IN_PROGRESS"),
      completed: countFor(member.id, "COMPLETED"),
      currentAssignment: current
        ? { complaintId: current.complaint.id, status: current.status, wasteType: current.complaint.wasteType, address: current.complaint.address }
        : null,
    };
  });
};

// Active master complaints with just what the map needs.
export const getMapComplaints = async () => {
  return prisma.complaint.findMany({
    where: {
      masterComplaintId: null,
      status: { in: ["Pending", "Assigned", "InProgress"] },
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      priority: true,
      status: true,
      wasteType: true,
      aiSummary: true,
      address: true,
      voteCount: true,
      urgencyScore: true,
      isSimulated: true,
    },
    orderBy: { urgencyScore: "desc" },
    take: 1000,
  });
};

// ============================================================
// PRIORITY OVERRIDE (admin, reason required)
// ============================================================
// Sets the priority by hand. The reason is shown first in priorityReasons
// and logged as a PRIORITY_OVERRIDE event; later re-scoring keeps it.
// ============================================================

export const overridePriority = async (
  complaintId: string,
  adminId: string,
  priority: Priority,
  reason: string,
) => {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new HttpError(404, "Complaint not found");
    }

    if (complaint.masterComplaintId) {
      throw new HttpError(409, "This complaint is linked; override the original complaint instead.");
    }

    const priorityReasons = [
      `${OVERRIDE_REASON_PREFIX}: ${priority} (${reason})`,
      ...complaint.priorityReasons.filter(
        (line) => !line.startsWith(OVERRIDE_REASON_PREFIX),
      ),
    ];

    const updated = await tx.complaint.update({
      where: { id: complaintId },
      data: {
        priority,
        priorityOverridden: true,
        priorityReasons,
      },
    });

    await recordEvent(tx, {
      complaintId,
      actorId: adminId,
      type: "PRIORITY_OVERRIDE",
      fromValue: complaint.priority,
      toValue: priority,
      reason,
    });

    return updated;
  });
};

