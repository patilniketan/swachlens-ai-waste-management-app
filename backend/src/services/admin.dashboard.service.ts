import prisma from "../config/prisma";

export const getDashboardStats = async () => {
  const [
    totalComplaints,
    pendingComplaints,
    assignedComplaints,
    inProgressComplaints,
    resolvedComplaints,
    totalStaff,
  ] = await Promise.all([
    prisma.complaint.count(),

    prisma.complaint.count({
      where: {
        status: "Pending",
      },
    }),

    prisma.complaint.count({
      where: {
        status: "Assigned",
      },
    }),

    prisma.complaint.count({
      where: {
        status: "In Progress",
      },
    }),

    prisma.complaint.count({
      where: {
        status: "Resolved",
      },
    }),

    prisma.user.count({
      where: {
        role: "STAFF",
      },
    }),
  ]);

  return {
    complaints: {
      total: totalComplaints,
      pending: pendingComplaints,
      assigned: assignedComplaints,
      inProgress: inProgressComplaints,
      resolved: resolvedComplaints,
    },
    staff: {
      total: totalStaff,
    },
  };
};
