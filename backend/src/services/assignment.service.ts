import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { calculateDistance } from "../utils/distance.js";
import type { ComplaintStatus } from "../constants/complaint.js";
import { recordEvents, statusChangeEvent } from "./event.service.js";

// Admin assigns an active complaint to a staff member. One open assignment
// per complaint; writes ASSIGNED (+ STATUS_CHANGED) events.
export const assignComplaint = async ({
  complaintId,
  staffId,
  assignedBy,
}: {
  complaintId: string;
  staffId: string;
  assignedBy: string;
}) => {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({
      where: { id: complaintId },
      include: {
        assignments: {
          where: { status: { not: "COMPLETED" } },
          include: { staff: { select: { email: true } } },
        },
      },
    });

    if (!complaint) {
      throw new HttpError(404, "Complaint not found");
    }

    if (complaint.masterComplaintId) {
      throw new HttpError(409, "This complaint is linked to another; assign the original instead.");
    }

    if (!["Pending", "Assigned", "InProgress"].includes(complaint.status)) {
      throw new HttpError(409, `Only active complaints can be assigned (status is ${complaint.status}).`);
    }

    const open = complaint.assignments[0];

    if (open) {
      throw new HttpError(409, `Already assigned to ${open.staff.email}.`);
    }

    const staff = await tx.user.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new HttpError(404, "Staff user not found");
    }

    if (staff.role !== "STAFF") {
      throw new HttpError(400, "Selected user is not a staff member");
    }

    const assignment = await tx.assignment.create({
      data: {
        complaintId,
        staffId,
        assignedBy,
      },
    });

    if (complaint.status !== "Assigned") {
      await tx.complaint.update({
        where: { id: complaintId },
        data: { status: "Assigned" },
      });
    }

    await recordEvents(tx, [
      {
        complaintId,
        actorId: assignedBy,
        type: "ASSIGNED",
        toValue: staff.email,
      },
      ...(complaint.status !== "Assigned"
        ? [statusChangeEvent(complaintId, assignedBy, complaint.status, "Assigned")]
        : []),
    ]);

    return assignment;
  });
};

export const getStaffTasks = async (
  staffId: string,
  latitude?: number,
  longitude?: number,
) => {
  const assignments = await prisma.assignment.findMany({
    where: {
      staffId,
    },
    include: {
      complaint: true,
    },
    orderBy: {
      assignedAt: "desc",
    },
  });

  return assignments.map((assignment) => {
    let distanceKm = null;

    if (latitude !== undefined && longitude !== undefined) {
      distanceKm = Number(
        calculateDistance(
          latitude,
          longitude,
          assignment.complaint.latitude,
          assignment.complaint.longitude,
        ).toFixed(2),
      );
    }

    return {
      ...assignment,
      distanceKm,
    };
  });
};

export const getStaffTaskById = async (
  assignmentId: string,
  staffId: string,
) => {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      staffId,
    },
    include: {
      complaint: true,
      staff: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new HttpError(404,"Assignment not found");
  }

  return assignment;
};

const ASSIGNMENT_ORDER = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] as const;

type AssignmentStatus = (typeof ASSIGNMENT_ORDER)[number];

const COMPLAINT_STATUS_FOR: Record<AssignmentStatus, ComplaintStatus> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "InProgress",
  COMPLETED: "Resolved",
};

export interface AssignmentStatusUpdate {
  status: AssignmentStatus;
  // Required for COMPLETED (resolution evidence).
  verifiedWeightKg?: number | undefined;
  afterImageUrl?: string | undefined;
  resolutionNotes?: string | undefined;
}

// Staff move their own task forward: ASSIGNED -> IN_PROGRESS -> COMPLETED.
// Completing records the after photo, weighed kg and notes on the complaint.
export const updateAssignmentStatus = async (
  assignmentId: string,
  staffId: string,
  update: AssignmentStatusUpdate,
) => {
  const { status } = update;

  if (status === "COMPLETED" && (!update.afterImageUrl || update.verifiedWeightKg === undefined)) {
    throw new HttpError(400, "Completing a task requires an after photo and verifiedWeightKg.");
  }

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.findFirst({
      where: {
        id: assignmentId,
        staffId,
      },
      include: { complaint: true },
    });

    if (!assignment) {
      throw new HttpError(404, "Assignment not found");
    }

    const current = ASSIGNMENT_ORDER.indexOf(assignment.status as AssignmentStatus);
    const next = ASSIGNMENT_ORDER.indexOf(status);

    if (assignment.status === "COMPLETED") {
      throw new HttpError(409, "This task is already completed.");
    }

    if (next <= current) {
      throw new HttpError(409, `Cannot move a task from ${assignment.status} to ${status}.`);
    }

    const updatedAssignment = await tx.assignment.update({
      where: { id: assignmentId },
      data: { status },
    });

    const complaintStatus = COMPLAINT_STATUS_FOR[status];
    const completed = status === "COMPLETED";
    const now = new Date();

    await tx.complaint.update({
      where: { id: assignment.complaintId },
      data: {
        status: complaintStatus,
        ...(completed && {
          resolvedAt: now,
          afterImageUrl: update.afterImageUrl ?? null,
          verifiedWeightKg: update.verifiedWeightKg ?? null,
          resolutionNotes: update.resolutionNotes ?? null,
          verifiedAt: now,
          verifiedBy: staffId,
        }),
      },
    });

    if (assignment.complaint.status !== complaintStatus) {
      await recordEvents(tx, [
        statusChangeEvent(
          assignment.complaintId,
          staffId,
          assignment.complaint.status,
          complaintStatus,
          completed
            ? [
                `Completed with after photo, ${update.verifiedWeightKg} kg weighed`,
                update.resolutionNotes,
              ]
                .filter(Boolean)
                .join(". ")
            : null,
        ),
      ]);
    }

    return updatedAssignment;
  });
};
