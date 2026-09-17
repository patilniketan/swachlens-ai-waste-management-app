import prisma from "../config/prisma";
import { calculateDistance } from "../utils/distance";

export const assignComplaint = async ({
  complaintId,
  staffId,
  assignedBy,
}: {
  complaintId: string;
  staffId: string;
  assignedBy: string;
}) => {
  const complaint = await prisma.complaint.findUnique({
    where: {
      id: complaintId,
    },
  });

  if (!complaint) {
    throw new Error("Complaint not found");
  }

  const staff = await prisma.user.findUnique({
    where: {
      id: staffId,
    },
  });

  if (!staff) {
    throw new Error("Staff user not found");
  }

  if (staff.role !== "STAFF") {
    throw new Error("Selected user is not a staff member");
  }

  const assignment = await prisma.assignment.create({
    data: {
      complaintId,
      staffId,
      assignedBy,
    },
  });

  await prisma.complaint.update({
    where: {
      id: complaintId,
    },
    data: {
      status: "Assigned",
    },
  });

  return assignment;
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
    throw new Error("Assignment not found");
  }

  return assignment;
};

export const updateAssignmentStatus = async (
  assignmentId: string,
  staffId: string,
  status: string,
) => {
  const allowedStatuses = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Invalid status. Allowed values: ASSIGNED, IN_PROGRESS, COMPLETED",
    );
  }

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      staffId,
    },
  });

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const updatedAssignment = await prisma.assignment.update({
    where: {
      id: assignmentId,
    },
    data: {
      status,
    },
  });

  let complaintStatus = "Assigned";

  if (status === "IN_PROGRESS") {
    complaintStatus = "In Progress";
  }

  if (status === "COMPLETED") {
    complaintStatus = "Resolved";
  }

  await prisma.complaint.update({
    where: {
      id: assignment.complaintId,
    },
    data: {
      status: complaintStatus,
    },
  });

  return updatedAssignment;
};
