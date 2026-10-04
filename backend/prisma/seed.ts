// ============================================================
// DEMO SEED (SIMULATED DATA)
// ============================================================
// Run with: npx prisma db seed
//
// Creates demo accounts, today's resources, and ~47 simulated complaints
// in Lajpat Nagar (see src/demo/demoData.ts). Every seeded complaint has
// isSimulated=true and aiSource="seed". Re-running replaces previously
// seeded complaints and leaves real (non-simulated) complaints alone.
// ============================================================

import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma.js";
import {
  DEMO_INCIDENTS,
  DEMO_PROFILES,
  SEED_IMAGE_SUBDIR,
  demoIncidentFeatures,
  incidentCoordinates,
  type DemoIncident,
} from "../src/demo/demoData.js";
import { scorePriority } from "../src/services/priority.service.js";
import { utcToday } from "../src/utils/date.js";
import {
  Prisma,
  type ComplaintStatus,
  type Role,
} from "../src/generated/prisma/client.js";

// Demo-only credentials, documented in README.md. Never reuse for real accounts.
const DEMO_PASSWORD = "SwachhDemo#2026";

const DEMO_USERS: { email: string; role: Role }[] = [
  { email: "admin@swachhlens.demo", role: "ADMIN" },
  { email: "staff1@swachhlens.demo", role: "STAFF" },
  { email: "staff2@swachhlens.demo", role: "STAFF" },
  { email: "staff3@swachhlens.demo", role: "STAFF" },
  { email: "citizen1@swachhlens.demo", role: "CITIZEN" },
  { email: "citizen2@swachhlens.demo", role: "CITIZEN" },
  { email: "citizen3@swachhlens.demo", role: "CITIZEN" },
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const seedImageUrl = (file: string) => `/uploads/${SEED_IMAGE_SUBDIR}/${file}`;

const pick = <T>(items: T[], index: number): T => {
  const item = items[index % items.length];

  if (item === undefined) throw new Error("pick() from an empty list");

  return item;
};

async function resetSimulatedComplaints() {
  const simulated = await prisma.complaint.findMany({
    where: { isSimulated: true },
    select: { id: true },
  });

  const ids = simulated.map((complaint) => complaint.id);

  if (ids.length === 0) return 0;

  await prisma.$transaction([
    prisma.complaintEvent.deleteMany({ where: { complaintId: { in: ids } } }),
    prisma.complaintLink.deleteMany({
      where: {
        OR: [
          { masterComplaintId: { in: ids } },
          { linkedComplaintId: { in: ids } },
        ],
      },
    }),
    prisma.assignment.deleteMany({ where: { complaintId: { in: ids } } }),
    // Detach any real complaints that were linked to a seeded master.
    prisma.complaint.updateMany({
      where: { masterComplaintId: { in: ids }, isSimulated: false },
      data: { masterComplaintId: null },
    }),
    prisma.complaint.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return ids.length;
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = [];

  for (const { email, role } of DEMO_USERS) {
    // Demo accounts used to be @civicclean.demo (the project's earlier name):
    // rename them in place so a re-seed does not leave duplicates behind.
    const legacyEmail = email.replace("@swachhlens.demo", "@civicclean.demo");

    if (!(await prisma.user.findUnique({ where: { email } }))) {
      await prisma.user.updateMany({ where: { email: legacyEmail }, data: { email } });
    }

    const data = {
      password: passwordHash,
      role,
      isVerified: true,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    };

    users.push(
      await prisma.user.upsert({
        where: { email },
        update: data,
        create: { email, ...data },
      }),
    );
  }

  return {
    admin: users.find((user) => user.role === "ADMIN")!,
    staff: users.filter((user) => user.role === "STAFF"),
    citizens: users.filter((user) => user.role === "CITIZEN"),
  };
}

async function seedTodaysResources() {
  // Same UTC day key as services/resource.service.ts. Any stored plan is
  // cleared: generating today's plan is a live demo step.
  const today = utcToday();
  const data = {
    workers: 15,
    heavyVehicles: 5,
    available: true,
    plan: Prisma.DbNull,
    planGeneratedAt: null,
    planGeneratedBy: null,
  };

  return prisma.resource.upsert({
    where: { date: today },
    update: data,
    create: { date: today, ...data },
  });
}

const buildTimeline = (incident: DemoIncident, index: number, now: number) => {
  if (incident.status === "Resolved") {
    const createdAt = now - (8 + (index % 12)) * DAY - (index % 9) * HOUR;

    return {
      createdAt: new Date(createdAt),
      resolvedAt: new Date(createdAt + (1 + (index % 3)) * DAY),
    };
  }

  return {
    createdAt: new Date(now - (1 + (index % 6)) * DAY - ((index * 7) % 20) * HOUR),
    resolvedAt: null,
  };
};

async function seedComplaints(
  users: Awaited<ReturnType<typeof seedUsers>>,
) {
  const now = Date.now();

  const masters: Prisma.ComplaintCreateManyInput[] = [];
  const linked: Prisma.ComplaintCreateManyInput[] = [];
  const links: Prisma.ComplaintLinkCreateManyInput[] = [];
  const events: Prisma.ComplaintEventCreateManyInput[] = [];

  const at = (date: Date, hours: number) => new Date(date.getTime() + hours * HOUR);
  const assignments: Prisma.AssignmentCreateManyInput[] = [];

  const seededIncidents = DEMO_INCIDENTS.filter(
    (incident) => incident.seeded !== false,
  );

  seededIncidents.forEach((incident, index) => {
    const profile = DEMO_PROFILES[incident.profile];
    const masterId = `seed-${incident.id}`;
    const { createdAt, resolvedAt } = buildTimeline(incident, index, now);
    const staff = pick(users.staff, index);
    const reportCount = incident.reports.length;

    // Features are hand-written demo values; priority, crew and vehicles are
    // computed by the same deterministic scorer used for live complaints.
    const features = demoIncidentFeatures(incident);

    const scoredFields = (voteCount: number) => {
      const scored = scorePriority(features, voteCount);

      return {
        priority: scored.priority,
        urgencyScore: scored.urgencyScore,
        requiredWorkers: scored.requiredWorkers,
        requiredHeavyVehicles: scored.requiredHeavyVehicles,
        estimatedTimeMinutes: scored.estimatedTimeMinutes,
        priorityReasons: scored.reasons,
      };
    };

    const shared = {
      address: incident.landmark,
      locationDescription: incident.landmark,
      wasteType: features.wasteType,
      imageUrl: seedImageUrl(DEMO_PROFILES[incident.profile].image),
      aiWasteCategories: features.wasteCategories,
      aiRelativeVolume: features.relativeVolume,
      aiWasteCondition: features.condition,
      aiHazardousDetected: features.hazardousDetected,
      aiHazardousTypes: features.hazardousTypes,
      aiAccessibility: features.accessibility,
      aiSuggestedEquipment: features.suggestedEquipment,
      aiBlockedRoad: features.blockedRoad,
      aiNearSensitiveSite: features.nearSensitiveSite,
      aiImageConfidence: features.confidence,
      aiSummary: features.summary,
      aiSource: "seed",
      needsManualReview: false,
      isSimulated: true,
    } satisfies Partial<Prisma.ComplaintCreateManyInput>;

    const status: ComplaintStatus = incident.status;
    const isActive = status !== "Resolved";
    const masterScore = scoredFields(reportCount);

    masters.push({
      ...shared,
      ...masterScore,
      id: masterId,
      userId: pick(users.citizens, index).id,
      description: incident.reports[0]!,
      ...incidentCoordinates(incident),
      status,
      voteCount: reportCount,
      isScheduled: false,
      createdAt,
      resolvedAt,
      ...(incident.resolution && {
        verifiedWeightKg: incident.resolution.verifiedWeightKg,
        afterImageUrl: seedImageUrl(incident.resolution.afterImage),
        verifiedAt: resolvedAt,
        verifiedBy: staff.id,
      }),
    });

    // Simulated history for the audit trail (GET /api/admin/complaints/:id/events).
    const reporterId = pick(users.citizens, index).id;
    events.push({
      complaintId: masterId,
      actorId: reporterId,
      type: "CREATED",
      toValue: "Pending",
      reason: "Simulated seed data",
      createdAt,
    });

    if (status !== "Pending") {
      events.push(
        {
          complaintId: masterId,
          actorId: users.admin.id,
          type: "ASSIGNED",
          toValue: staff.email,
          createdAt: at(createdAt, 2),
        },
        {
          complaintId: masterId,
          actorId: users.admin.id,
          type: "STATUS_CHANGED",
          fromValue: "Pending",
          toValue: "Assigned",
          createdAt: at(createdAt, 2),
        },
      );
    }

    if (status === "InProgress" || status === "Resolved") {
      events.push({
        complaintId: masterId,
        actorId: staff.id,
        type: "STATUS_CHANGED",
        fromValue: "Assigned",
        toValue: "InProgress",
        createdAt: at(createdAt, 4),
      });
    }

    if (status === "Resolved" && resolvedAt && incident.resolution) {
      events.push({
        complaintId: masterId,
        actorId: staff.id,
        type: "STATUS_CHANGED",
        fromValue: "InProgress",
        toValue: "Resolved",
        reason: `Completed with after photo, ${incident.resolution.verifiedWeightKg} kg weighed (simulated)`,
        createdAt: resolvedAt,
      });
    }

    incident.reports.slice(1).forEach((description, k) => {
      const linkedId = `${masterId}-r${k + 2}`;
      const reason = "Same incident as the original report (simulated).";

      // As if the AI suggested it and staff confirmed it.
      linked.push({
        ...shared,
        ...scoredFields(1),
        id: linkedId,
        userId: pick(users.citizens, index + k + 1).id,
        description,
        ...incidentCoordinates(incident, [(k + 1) * 15, -(k + 1) * 12]),
        status: "Linked",
        voteCount: 1,
        masterComplaintId: masterId,
        duplicateSuggestionOfId: masterId,
        duplicateSuggestionVerdict: "yes",
        duplicateSuggestionReason: reason,
        createdAt: new Date(createdAt.getTime() + (k + 1) * 5 * HOUR),
      });

      const reportedAt = at(createdAt, (k + 1) * 5);

      links.push({
        masterComplaintId: masterId,
        linkedComplaintId: linkedId,
        reason,
        confirmedBy: staff.id,
        createdAt: reportedAt,
      });

      events.push(
        {
          complaintId: linkedId,
          actorId: pick(users.citizens, index + k + 1).id,
          type: "CREATED",
          toValue: "Pending",
          reason: "Simulated seed data",
          createdAt: reportedAt,
        },
        {
          complaintId: linkedId,
          actorId: staff.id,
          type: "DUPLICATE_CONFIRMED",
          fromValue: masterId,
          toValue: masterId,
          reason,
          createdAt: at(reportedAt, 1),
        },
        {
          complaintId: linkedId,
          actorId: staff.id,
          type: "STATUS_CHANGED",
          fromValue: "Pending",
          toValue: "Linked",
          createdAt: at(reportedAt, 1),
        },
      );
    });

    if (status !== "Pending") {
      assignments.push({
        complaintId: masterId,
        staffId: staff.id,
        assignedBy: users.admin.id,
        status:
          status === "Assigned"
            ? "ASSIGNED"
            : status === "InProgress"
              ? "IN_PROGRESS"
              : "COMPLETED",
        assignedAt: new Date(createdAt.getTime() + 2 * HOUR),
      });
    }
  });

  // Masters first: linked complaints reference them.
  await prisma.complaint.createMany({ data: masters });
  await prisma.complaint.createMany({ data: linked });
  await prisma.complaintLink.createMany({ data: links });
  await prisma.assignment.createMany({ data: assignments });
  await prisma.complaintEvent.createMany({ data: events });

  return { masters, linked, links, assignments, events };
}

async function main() {
  const removed = await resetSimulatedComplaints();
  const users = await seedUsers();
  const resource = await seedTodaysResources();
  const { masters, linked, links, assignments, events } = await seedComplaints(users);

  const all = [...masters, ...linked];
  const countBy = (key: "status" | "priority") =>
    all.reduce<Record<string, number>>((counts, complaint) => {
      const value = String(complaint[key]);
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {});

  console.log("Seed complete (all complaint data is SIMULATED).");
  console.log(`  Removed previously seeded complaints: ${removed}`);
  console.log(
    `  Users: 1 admin, ${users.staff.length} staff, ${users.citizens.length} citizens (all verified)`,
  );
  console.log(
    `  Resource for ${resource.date.toISOString()}: ${resource.workers} workers, ${resource.heavyVehicles} heavy vehicles`,
  );
  console.log(
    `  Complaints: ${all.length} (${masters.length} incidents, ${linked.length} linked duplicates in ${
      new Set(links.map((link) => link.masterComplaintId)).size
    } groups)`,
  );
  console.log(`  By status: ${JSON.stringify(countBy("status"))}`);
  console.log(`  By priority: ${JSON.stringify(countBy("priority"))}`);
  console.log(`  Assignments: ${assignments.length}`);
  console.log(`  Events: ${events.length} (simulated history)`);
  console.log("  No plan generated yet: POST /api/admin/plan/generate");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
