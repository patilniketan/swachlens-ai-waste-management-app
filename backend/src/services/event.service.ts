import prisma from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import type {
  ComplaintEventType,
  Prisma,
} from "../generated/prisma/client.js";

// ============================================================
// COMPLAINT EVENTS (audit trail)
// ============================================================
// Call recordEvent with the same transaction client that makes the change,
// so the change and its event are committed (or rolled back) together.
// ============================================================

type Db = Prisma.TransactionClient | typeof prisma;

export interface ComplaintEventInput {
  complaintId: string;
  actorId: string | null;
  type: ComplaintEventType;
  fromValue?: string | null | undefined;
  toValue?: string | null | undefined;
  reason?: string | null | undefined;
}

const toRow = (event: ComplaintEventInput) => ({
  complaintId: event.complaintId,
  actorId: event.actorId,
  type: event.type,
  fromValue: event.fromValue ?? null,
  toValue: event.toValue ?? null,
  reason: event.reason ?? null,
});

export const recordEvents = async (db: Db, events: ComplaintEventInput[]) => {
  if (events.length === 0) return;

  await db.complaintEvent.createMany({ data: events.map(toRow) });
};

export const recordEvent = (db: Db, event: ComplaintEventInput) =>
  recordEvents(db, [event]);

export const statusChangeEvent = (
  complaintId: string,
  actorId: string | null,
  fromValue: string,
  toValue: string,
  reason?: string | null,
): ComplaintEventInput => ({
  complaintId,
  actorId,
  type: "STATUS_CHANGED",
  fromValue,
  toValue,
  reason,
});

export const getComplaintEvents = async (complaintId: string) => {
  // In parallel: each database round trip is the expensive part.
  const [exists, events] = await Promise.all([
    prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true },
    }),
    prisma.complaintEvent.findMany({
      where: { complaintId },
      orderBy: { createdAt: "asc" },
      include: {
        actor: { select: { id: true, email: true, role: true } },
      },
    }),
  ]);

  if (!exists) {
    throw new HttpError(404, "Complaint not found");
  }

  return events;
};
