import {
  ComplaintStatus,
  Priority,
} from "../generated/prisma/enums.js";

export { ComplaintStatus, Priority };

// Complaints that still need field work. Used by nearby, hotspots,
// duplicate detection and today's tasks.
export const ACTIVE_STATUSES: ComplaintStatus[] = [
  ComplaintStatus.Pending,
  ComplaintStatus.Assigned,
  ComplaintStatus.InProgress,
];

export const COMPLAINT_STATUSES = Object.values(ComplaintStatus);

export const PRIORITIES = Object.values(Priority);

const readPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const HOTSPOT_RADIUS_METERS = readPositiveNumber(
  process.env.HOTSPOT_RADIUS_METERS,
  500,
);

export const DUPLICATE_RADIUS_METERS = readPositiveNumber(
  process.env.DUPLICATE_RADIUS_METERS,
  500,
);
