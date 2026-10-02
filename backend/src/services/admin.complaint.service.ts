import prisma from "../config/prisma.js";

export const getAllComplaints = async () => {
  return prisma.complaint.findMany({
    include: {
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getComplaintDetails = async (complaintId: string) => {
  const complaint = await prisma.complaint.findUnique({
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
    },
  });

  if (!complaint) {
    throw new Error("Complaint not found");
  }

  return complaint;
};

export const getAllStaff = async () => {
  return prisma.user.findMany({
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
      createdAt: "desc",
    },
  });
};
