import prisma from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { utcDayKey, utcToday } from "../utils/date.js";

// ============================================================
// ANALYTICS (real aggregates only)
// ============================================================
// Every number is computed from the database at request time. Seeded demo
// rows are included by default and reported in `dataset` so the UI can
// label them; pass includeSimulated=false for real data only.
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;

const VOLUME_ORDER = ["Small", "Medium", "Large", "Massive", "Unknown"];

const round = (value: number | null, digits = 1) =>
  value === null ? null : Number(value.toFixed(digits));

export const getAnalytics = async ({ includeSimulated }: { includeSimulated: boolean }) => {
  const where: Prisma.ComplaintWhereInput = includeSimulated ? {} : { isSimulated: false };

  // Raw-SQL equivalent of `where`.
  const simulatedFilter = includeSimulated
    ? Prisma.empty
    : Prisma.sql`AND c."isSimulated" = false`;

  const today = utcToday();
  const firstDay = new Date(today.getTime() - 6 * DAY_MS);

  const [
    total,
    simulated,
    byStatus,
    byWasteType,
    last7Days,
    resolution,
    confirmed,
    rejected,
    pending,
    aiVsVerified,
  ] = await Promise.all([
    prisma.complaint.count({ where }),

    // With simulated data excluded there is none in the result set.
    includeSimulated
      ? prisma.complaint.count({ where: { isSimulated: true } })
      : Promise.resolve(0),

    prisma.complaint.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),

    prisma.complaint.groupBy({
      by: ["wasteType"],
      where,
      _count: { _all: true },
    }),

    // created / resolved per UTC day, including days with zero.
    prisma.$queryRaw<{ day: string; created: number; resolved: number }[]>`
      SELECT to_char(d, 'YYYY-MM-DD') AS day,
        (SELECT count(*) FROM "Complaint" c
          WHERE c."createdAt" >= d AND c."createdAt" < d + interval '1 day' ${simulatedFilter})::int AS created,
        (SELECT count(*) FROM "Complaint" c
          WHERE c."resolvedAt" >= d AND c."resolvedAt" < d + interval '1 day' ${simulatedFilter})::int AS resolved
      FROM generate_series(${utcDayKey(firstDay)}::timestamp, ${utcDayKey(today)}::timestamp, interval '1 day') AS d
      ORDER BY d`,

    prisma.$queryRaw<{ resolvedCount: number; avgHours: number | null }[]>`
      SELECT count(*)::int AS "resolvedCount",
        avg(extract(epoch FROM (c."resolvedAt" - c."createdAt")) / 3600)::float AS "avgHours"
      FROM "Complaint" c
      WHERE c.status = 'Resolved' AND c."resolvedAt" IS NOT NULL ${simulatedFilter}`,

    prisma.complaintEvent.count({
      where: { type: "DUPLICATE_CONFIRMED", complaint: where },
    }),

    prisma.complaintEvent.count({
      where: { type: "DUPLICATE_REJECTED", complaint: where },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        duplicateSuggestionOfId: { not: null },
        masterComplaintId: null,
        status: { notIn: ["Linked", "Merged"] },
      },
    }),

    // AI relative volume vs the weight staff actually measured.
    prisma.$queryRaw<
      { bucket: string; count: number; medianKg: number; minKg: number; maxKg: number }[]
    >`
      SELECT COALESCE(c."aiRelativeVolume", 'Unknown') AS bucket,
        count(*)::int AS count,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c."verifiedWeightKg")::float AS "medianKg",
        min(c."verifiedWeightKg")::float AS "minKg",
        max(c."verifiedWeightKg")::float AS "maxKg"
      FROM "Complaint" c
      WHERE c.status = 'Resolved' AND c."verifiedWeightKg" IS NOT NULL ${simulatedFilter}
      GROUP BY 1`,
  ]);

  const avg = resolution[0];

  return {
    generatedAt: new Date().toISOString(),
    includeSimulated,
    dataset: {
      totalComplaints: total,
      simulated,
      real: total - simulated,
      note:
        simulated > 0
          ? `${simulated} of ${total} complaints are simulated seed data.`
          : null,
    },
    byStatus: byStatus
      .map((row) => ({ status: row.status, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    byWasteType: byWasteType
      .map((row) => ({ wasteType: row.wasteType ?? "Unknown", count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    last7Days: last7Days.map((row) => ({
      date: row.day,
      created: row.created,
      resolved: row.resolved,
    })),
    resolution: {
      resolvedCount: avg?.resolvedCount ?? 0,
      avgResolutionHours: round(avg?.avgHours ?? null),
    },
    duplicateSuggestions: { confirmed, rejected, pending },
    aiVsVerified: aiVsVerified
      .map((row) => ({
        aiRelativeVolume: row.bucket,
        count: row.count,
        medianKg: round(row.medianKg),
        minKg: round(row.minKg),
        maxKg: round(row.maxKg),
      }))
      .sort(
        (a, b) =>
          VOLUME_ORDER.indexOf(a.aiRelativeVolume) - VOLUME_ORDER.indexOf(b.aiRelativeVolume),
      ),
  };
};

// ============================================================
// CSV EXPORT
// ============================================================
// No reporter emails or user ids (data minimisation). isSimulated is a
// column so exported demo data stays labelled.
// ============================================================

const CSV_COLUMNS = [
  "id",
  "createdAt",
  "status",
  "priority",
  "priorityOverridden",
  "urgencyScore",
  "voteCount",
  "wasteType",
  "aiRelativeVolume",
  "aiHazardousDetected",
  "aiSource",
  "needsManualReview",
  "latitude",
  "longitude",
  "address",
  "masterComplaintId",
  "resolvedAt",
  "verifiedWeightKg",
  "isSimulated",
] as const;

// Quote when needed; neutralise spreadsheet formulas in text cells.
const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) return value.toISOString();

  if (typeof value !== "string") return String(value);

  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const EXPORT_BATCH = 500;

export async function* exportComplaintsCsv({
  includeSimulated,
}: {
  includeSimulated: boolean;
}): AsyncGenerator<string> {
  const where: Prisma.ComplaintWhereInput = includeSimulated ? {} : { isSimulated: false };
  const select = Object.fromEntries(
    CSV_COLUMNS.map((column) => [column, true]),
  ) as { [Column in (typeof CSV_COLUMNS)[number]]: true };

  yield `${CSV_COLUMNS.join(",")}\r\n`;

  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.complaint.findMany({
      where,
      select,
      orderBy: { id: "asc" },
      take: EXPORT_BATCH,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    if (rows.length === 0) return;

    yield rows
      .map((row) =>
        CSV_COLUMNS.map((column) => csvCell(row[column])).join(","),
      )
      .join("\r\n") + "\r\n";

    cursor = rows[rows.length - 1]?.id;

    if (rows.length < EXPORT_BATCH) return;
  }
}
