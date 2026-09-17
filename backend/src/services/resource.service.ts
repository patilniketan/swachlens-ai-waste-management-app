import prisma from "../config/prisma.js";

export const getDailyResources = async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  let resource = await prisma.resource.findFirst({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  // Hackathon fallback resources
  if (!resource) {
    resource = await prisma.resource.create({
      data: {
        date: start,
        heavyVehicles: 5,
        workers: 15,
        available: true,
      },
    });
  }

  return resource;
};
