import prisma from "../config/prisma.js";
import { utcToday } from "../utils/date.js";

const readCount = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

// Used when no Resource row exists for today.
export const DEFAULT_WORKERS = readCount(process.env.DEFAULT_WORKERS, 15);
export const DEFAULT_HEAVY_VEHICLES = readCount(
  process.env.DEFAULT_HEAVY_VEHICLES,
  5,
);

// Today's (UTC) resources. Upsert, so concurrent first requests of the day
// cannot create two rows; an existing row is returned unchanged.
export const getDailyResources = async () => {
  const date = utcToday();

  try {
    return await prisma.resource.upsert({
      where: { date },
      update: {},
      create: {
        date,
        workers: DEFAULT_WORKERS,
        heavyVehicles: DEFAULT_HEAVY_VEHICLES,
        available: true,
      },
    });
  } catch (error) {
    // Two upserts raced on the unique date; the other one created it.
    if ((error as { code?: unknown })?.code === "P2002") {
      return prisma.resource.findUniqueOrThrow({ where: { date } });
    }

    throw error;
  }
};
