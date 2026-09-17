import prisma from "../config/prisma.js";
import {
  analyzePriority,
  analyzeSentiment,
  detectDuplicate,
  extractComplaintData,
} from "./ai.service.js";
import { calculateDistance } from "../utils/distance.js";

interface CreateComplaintInput {
  text: string;
  address?: string;
  latitude: number;
  longitude: number;
  userId: string;
  imageUrl?: string;
}

// ============================================================
// CREATE COMPLAINT
// ============================================================

export const createComplaint = async ({
  text,
  address,
  latitude,
  longitude,
  userId,
  imageUrl,
}: CreateComplaintInput) => {
  // ---------------------------------------------------------
  // 1. AI STRUCTURED EXTRACTION
  // ---------------------------------------------------------

  const extracted = await extractComplaintData(text);

  // ---------------------------------------------------------
  // 2. FIND NEARBY ACTIVE COMPLAINTS
  // ---------------------------------------------------------

  const existingComplaints = await prisma.complaint.findMany({
    where: {
      status: {
        in: ["Pending", "Open", "In Progress"],
      },
    },
    select: {
      id: true,
      description: true,
      latitude: true,
      longitude: true,
      status: true,
      masterComplaintId: true,
      voteCount: true,
      aiSummary: true,
      priority: true,
    },
  });

  const nearbyComplaints = existingComplaints.filter((complaint) => {
    const distance = calculateDistance(
      latitude,
      longitude,
      complaint.latitude,
      complaint.longitude,
    );

    return distance <= 0.5;
  });

  // ---------------------------------------------------------
  // 3. AI SEMANTIC DUPLICATE DETECTION
  // ---------------------------------------------------------

  const duplicateResult = await detectDuplicate(
    text,
    nearbyComplaints.map((complaint) => ({
      id: complaint.id,
      description: complaint.description,
      latitude: complaint.latitude,
      longitude: complaint.longitude,
    })),
  );

  // ---------------------------------------------------------
  // 4. AI PRIORITY
  // ---------------------------------------------------------

  const priorityResult = await analyzePriority(text);

  // ---------------------------------------------------------
  // 5. AI SENTIMENT
  // ---------------------------------------------------------

  const sentimentResult = await analyzeSentiment(text);

  // ---------------------------------------------------------
  // 6. FINAL PRIORITY
  // ---------------------------------------------------------

  let finalPriority = priorityResult.priority;

  if (
    sentimentResult.highPriority &&
    finalPriority === "TRIVIAL"
  ) {
    finalPriority = "STANDARD";
  }

  // ---------------------------------------------------------
  // 7. FIND MATCHING COMPLAINT
  // ---------------------------------------------------------

  const matchingComplaint =
    duplicateResult.matchingComplaintId
      ? nearbyComplaints.find(
          (complaint) =>
            complaint.id === duplicateResult.matchingComplaintId,
        )
      : null;

  // ---------------------------------------------------------
  // 8. CREATE COMPLAINT
  // ---------------------------------------------------------

  const complaint = await prisma.complaint.create({
    data: {
      userId,

      description: text,

      imageUrl: imageUrl ?? null,

      latitude,
      longitude,

      address:
        address ??
        extracted.locationDescription,

      locationDescription:
        extracted.locationDescription,

      wasteType:
        extracted.wasteType,

      estimatedQuantity:
        extracted.estimatedQuantity,

      status: "Pending",

      priority: finalPriority,

      urgencyScore: Math.max(
        priorityResult.urgencyScore,
        extracted.urgency,
      ),

      sentimentScore:
        sentimentResult.sentimentScore,

      sentimentLabel:
        sentimentResult.sentimentLabel,

      voteCount: 1,

      duplicateSimilarity:
        matchingComplaint
          ? duplicateResult.similarityScore
          : null,

      duplicateOfId:
        matchingComplaint
          ? matchingComplaint.id
          : null,

      aiSummary: text,

      requiredWorkers:
        priorityResult.requiredWorkers,

      requiredHeavyVehicles:
        priorityResult.requiredHeavyVehicles,

      estimatedTimeMinutes:
        priorityResult.estimatedTimeMinutes,

      isScheduled: false,
    },
  });

  // ---------------------------------------------------------
  // 9. LINK DUPLICATE COMPLAINT
  // ---------------------------------------------------------

  if (
    matchingComplaint &&
    duplicateResult.similarityScore > 0.85
  ) {
    const masterId =
      matchingComplaint.masterComplaintId ??
      matchingComplaint.id;

    await prisma.complaint.update({
      where: {
        id: complaint.id,
      },
      data: {
        masterComplaintId: masterId,
        status: "Linked",
      },
    });

    await prisma.complaint.update({
      where: {
        id: masterId,
      },
      data: {
        voteCount: {
          increment: 1,
        },
      },
    });

    // Prevent duplicate ComplaintLink records
    await prisma.complaintLink.upsert({
      where: {
        masterComplaintId_linkedComplaintId: {
          masterComplaintId: masterId,
          linkedComplaintId: complaint.id,
        },
      },
      update: {
        similarityScore:
          duplicateResult.similarityScore,
      },
      create: {
        masterComplaintId: masterId,
        linkedComplaintId: complaint.id,
        similarityScore:
          duplicateResult.similarityScore,
      },
    });
  }

  // ---------------------------------------------------------
  // 10. CREATE RECYCLABLE INVENTORY
  //
  // AI only provides approximate information.
  //
  // Exact weight MUST be entered by field staff.
  // ---------------------------------------------------------

  let inventory = null;

  try {
    inventory =
      await prisma.recyclableInventory.create({
        data: {
          complaintId: complaint.id,

          // AI prediction
          aiPredictedType:
            extracted.wasteType,

          aiPredictedVolume:
            extracted.estimatedQuantity,

          aiConfidence: null,

          // Physical verification
          verifiedType: null,
          verifiedWeightKg: null,
          verifiedVolumeCbm: null,

          // Quality assessment
          qualityGrade: null,
          contamination: null,

          // Marketplace
          isAvailable: false,
          pricePerKg: null,
          buyerId: null,

          // Verification
          verificationStatus:
            "PendingVerification",

          verifiedBy: null,
          verifiedAt: null,
        },
      });
  } catch (error) {
    console.error(
      "Failed to create recyclable inventory:",
      error,
    );
  }

  // ---------------------------------------------------------
  // 11. GET FINAL COMPLAINT
  // ---------------------------------------------------------

  const finalComplaint =
    await prisma.complaint.findUnique({
      where: {
        id: complaint.id,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        inventory: true,
      },
    });

  // ---------------------------------------------------------
  // 12. RETURN RESPONSE
  // ---------------------------------------------------------

  return {
    complaint: finalComplaint,

    inventory: inventory
      ? {
          id: inventory.id,

          verificationStatus:
            inventory.verificationStatus,

          aiPredictedType:
            inventory.aiPredictedType,

          aiPredictedVolume:
            inventory.aiPredictedVolume,

          verifiedWeightKg:
            inventory.verifiedWeightKg,

          verifiedType:
            inventory.verifiedType,
        }
      : null,

    duplicate: {
      detected:
        Boolean(matchingComplaint) &&
        duplicateResult.similarityScore > 0.85,

      similarityScore:
        duplicateResult.similarityScore,

      matchingComplaintId:
        matchingComplaint?.id ?? null,

      matchingComplaintSummary:
        matchingComplaint?.aiSummary ??
        matchingComplaint?.description ??
        null,

      reason:
        duplicateResult.reason,
    },

    ai: {
      priority: finalPriority,

      urgencyScore:
        Math.max(
          priorityResult.urgencyScore,
          extracted.urgency,
        ),

      sentimentScore:
        sentimentResult.sentimentScore,

      sentimentLabel:
        sentimentResult.sentimentLabel,

      highPriority:
        sentimentResult.highPriority,

      wasteType:
        extracted.wasteType,

      locationDescription:
        extracted.locationDescription,

      estimatedQuantity:
        extracted.estimatedQuantity,

      requiredWorkers:
        priorityResult.requiredWorkers,

      requiredHeavyVehicles:
        priorityResult.requiredHeavyVehicles,

      estimatedTimeMinutes:
        priorityResult.estimatedTimeMinutes,
    },
  };
};

// ============================================================
// GET NEARBY COMPLAINTS
// ============================================================

export const getNearbyComplaints = async (
  latitude: number,
  longitude: number,
  radiusMeters = 500,
) => {
  const complaints =
    await prisma.complaint.findMany({
      where: {
        status: {
          in: [
            "Pending",
            "Open",
            "In Progress",
          ],
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        inventory: true,
      },
    });

  const radiusKm =
    radiusMeters / 1000;

  return complaints
    .map((complaint) => {
      const distanceKm =
        calculateDistance(
          latitude,
          longitude,
          complaint.latitude,
          complaint.longitude,
        );

      return {
        ...complaint,

        distanceMeters:
          Math.round(
            distanceKm * 1000,
          ),

        distanceKm,
      };
    })
    .filter(
      (complaint) =>
        complaint.distanceKm <=
        radiusKm,
    )
    .sort(
      (a, b) =>
        a.distanceKm -
        b.distanceKm,
    );
};

// ============================================================
// GET USER COMPLAINTS
// ============================================================

export const getUserComplaints = async (
  userId: string,
) => {
  return prisma.complaint.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      assignments: true,
      inventory: {
        include: {
          marketplaceListing: true,
        },
      },
    },
  });
};

// ============================================================
// GET SINGLE COMPLAINT
// ============================================================

export const getComplaintById = async (
  complaintId: string,
) => {
  return prisma.complaint.findUnique({
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

      assignments: true,

      inventory: {
        include: {
          marketplaceListing: true,
          buyer: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      },

      childComplaints: {
        select: {
          id: true,
          description: true,
          status: true,
          voteCount: true,
          duplicateSimilarity: true,
          createdAt: true,
        },
      },
    },
  });
};

// ============================================================
// UPDATE COMPLAINT
// ============================================================

export const updateComplaint = async (
  complaintId: string,
  data: Record<string, unknown>,
) => {
  const allowedFields = [
    "status",
    "address",
    "wasteType",
    "priority",
    "isScheduled",
  ];

  const updateData:
    Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  return prisma.complaint.update({
    where: {
      id: complaintId,
    },

    data: updateData,
  });
};

// ============================================================
// VERIFY COMPLAINT
// ============================================================

export const verifyComplaint = async (
  complaintId: string,
  verifiedBy: string,
) => {
  const complaint =
    await prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },
    });

  if (!complaint) {
    throw new Error(
      "Complaint not found",
    );
  }

  return prisma.complaint.update({
    where: {
      id: complaintId,
    },

    data: {
      status: "Verified",
    },
  });
};


// ============================================================
// GET HOTSPOTS
// ============================================================

// ============================================================
// GET HOTSPOTS
// ============================================================

const HOTSPOT_RADIUS_METERS = 500;


const getPriorityWeight = (priority: string | null) => {
  switch (priority?.toLowerCase()) {
    case "critical":
      return 10;
    case "high":
      return 7;
    case "medium":
      return 4;
    case "low":
      return 2;
    default:
      return 1;
  }
};

export const getHotspots = async () => {
  const complaints = await prisma.complaint.findMany({
    where: {
      status: {
        in: ["Pending", "Open", "In Progress"],
      },
    },

    select: {
      id: true,
      latitude: true,
      longitude: true,
      wasteType: true,
      priority: true,
      voteCount: true,
      status: true,
      createdAt: true,

      inventory: {
        select: {
          verificationStatus: true,
          verifiedWeightKg: true,
        },
      },
    },
  });

  // Remove complaints without valid coordinates
  const validComplaints = complaints.filter(
    (complaint) =>
      complaint.latitude !== null &&
      complaint.longitude !== null
  );

  const hotspots: any[] = [];

  for (const complaint of validComplaints) {
    const latitude = Number(complaint.latitude);
    const longitude = Number(complaint.longitude);

    // Find an existing hotspot within 500 meters
    let hotspot = hotspots.find((existingHotspot) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        existingHotspot.latitude,
        existingHotspot.longitude
      );

      return distance <= HOTSPOT_RADIUS_METERS;
    });

    // Create a new hotspot if none exists
    if (!hotspot) {
      hotspot = {
        latitude,
        longitude,
        complaints: [],
        complaintCount: 0,
        score: 0,
        totalVotes: 0,
        totalVerifiedWeightKg: 0,
      };

      hotspots.push(hotspot);
    }

    // Add complaint to hotspot
    hotspot.complaints.push(complaint);

    hotspot.complaintCount += 1;

    hotspot.totalVotes += complaint.voteCount || 0;

    // Priority contribution
    hotspot.score += getPriorityWeight(complaint.priority);

    // Verified waste weight contribution
    if (
      complaint.inventory?.verificationStatus === "Verified" &&
      complaint.inventory?.verifiedWeightKg
    ) {
      hotspot.totalVerifiedWeightKg += Number(
        complaint.inventory.verifiedWeightKg
      );
    }
  }

  // Calculate final hotspot score
  const finalHotspots = hotspots.map((hotspot) => {
    const complaintScore = hotspot.complaintCount * 5;

    const voteScore = Math.min(hotspot.totalVotes * 0.5, 20);

    const weightScore = Math.min(
      hotspot.totalVerifiedWeightKg * 0.2,
      20
    );

    const finalScore =
      hotspot.score +
      complaintScore +
      voteScore +
      weightScore;

    let level = "LOW";

    if (finalScore >= 40) {
      level = "CRITICAL";
    } else if (finalScore >= 25) {
      level = "HIGH";
    } else if (finalScore >= 12) {
      level = "MEDIUM";
    }

    return {
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,

      complaintCount: hotspot.complaintCount,

      totalVotes: hotspot.totalVotes,

      totalVerifiedWeightKg:
        Math.round(hotspot.totalVerifiedWeightKg * 100) / 100,

      score: Math.round(finalScore * 100) / 100,

      level,

      complaintIds: hotspot.complaints.map(
        (complaint: any) => complaint.id
      ),

      wasteTypes: [
        ...new Set(
          hotspot.complaints.map(
            (complaint: any) => complaint.wasteType
          )
        ),
      ],

      statuses: [
        ...new Set(
          hotspot.complaints.map(
            (complaint: any) => complaint.status
          )
        ),
      ],
    };
  });

  // Highest priority hotspots first
  return finalHotspots.sort((a, b) => b.score - a.score);
};
// ============================================================
// MERGE COMPLAINTS
// ============================================================

export const mergeComplaints = async (
  complaintIds: string[],
) => {
  if (complaintIds.length < 2) {
    throw new Error(
      "At least two complaints are required for merging",
    );
  }

  const complaints =
    await prisma.complaint.findMany({
      where: {
        id: {
          in: complaintIds,
        },
      },
    });

  if (
    complaints.length !==
    complaintIds.length
  ) {
    throw new Error(
      "One or more complaints were not found",
    );
  }

  const masterComplaint =
    complaints[0];

  if (!masterComplaint) {
    throw new Error(
      "Master complaint could not be determined",
    );
  }

  const totalVotes =
    complaints.reduce(
      (total, complaint) =>
        total +
        (complaint.voteCount ?? 1),
      0,
    );

  const descriptions =
    complaints.map(
      (complaint) =>
        complaint.description,
    );

  const combinedDescription =
    descriptions.join("\n");

  const updatedMaster =
    await prisma.complaint.update({
      where: {
        id: masterComplaint.id,
      },

      data: {
        voteCount: totalVotes,
        status: "Pending",
      },
    });

  await prisma.complaint.updateMany({
    where: {
      id: {
        in: complaintIds.filter(
          (id) =>
            id !==
            masterComplaint.id,
        ),
      },
    },

    data: {
      masterComplaintId:
        masterComplaint.id,

      status: "Merged",
    },
  });

  return {
    masterComplaint:
      updatedMaster,

    mergedComplaintIds:
      complaintIds.filter(
        (id) =>
          id !==
          masterComplaint.id,
      ),

    voteCount: totalVotes,

    combinedDescriptions:
      combinedDescription,
  };
};

// ============================================================
// GET TODAY'S TASKS
// ============================================================

export const getTodaysTasks =
  async () => {
    return prisma.complaint.findMany({
      where: {
        isScheduled: true,

        status: {
          in: [
            "Pending",
            "Open",
            "In Progress",
          ],
        },
      },

      orderBy: [
        {
          priority: "asc",
        },

        {
          urgencyScore: "desc",
        },

        {
          voteCount: "desc",
        },

        {
          createdAt: "asc",
        },
      ],

      include: {
        assignments: true,
        inventory: true,
      },
    });
  };

// ============================================================
// RECYCLING / RECYCLABLE INVENTORY
// ============================================================
//
// Flow:
//
// Complaint created
//      ↓
// RecyclableInventory created
//      ↓
// PendingVerification
//      ↓
// Field worker verifies physical waste
//      ↓
// Verified
//      ↓
// MarketplaceListing created
//
// AI predictions are approximate.
// Exact weight/volume must come from field verification.
// ============================================================


// ============================================================
// GET PENDING RECYCLABLE INVENTORY
// ============================================================
// Field workers use this endpoint to see recyclable waste
// waiting for physical verification.
// ============================================================

export const getPendingRecyclableInventory = async () => {
  return prisma.recyclableInventory.findMany({
    where: {
      verificationStatus: "PendingVerification",
    },

    orderBy: {
      createdAt: "asc",
    },

    include: {
      complaint: {
        select: {
          id: true,
          description: true,
          imageUrl: true,
          latitude: true,
          longitude: true,
          address: true,
          locationDescription: true,
          wasteType: true,
          estimatedQuantity: true,

          // AI image / waste analysis
          aiWasteCategories: true,
          aiRelativeVolume: true,
          aiWasteCondition: true,
          aiHazardousDetected: true,
          aiHazardousTypes: true,
          aiAccessibility: true,
          aiSuggestedEquipment: true,
          aiQualityIndicators: true,
          aiImageConfidence: true,

          priority: true,
          urgencyScore: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
};


// ============================================================
// VERIFY RECYCLABLE INVENTORY
// ============================================================
//
// Field worker enters REAL physical measurements.
//
// Required:
// - verifiedType
// - verifiedWeightKg
//
// Optional:
// - verifiedVolumeCbm
// - qualityGrade
// - contamination
// - pricePerKg
// - images
//
// After verification:
//
// PendingVerification
//        ↓
//     Verified
//        ↓
// MarketplaceListing created
// ============================================================

interface VerifyInventoryInput {
  inventoryId: string;

  verifiedBy: string;

  verifiedType: string;

  verifiedWeightKg?: number;

  verifiedVolumeCbm?: number;

  qualityGrade?: string;

  contamination?: string;

  pricePerKg?: number;

  images?: string[];
}

export const verifyRecyclableInventory = async ({
  inventoryId,
  verifiedBy,
  verifiedType,
  verifiedWeightKg,
  verifiedVolumeCbm,
  qualityGrade,
  contamination,
  pricePerKg,
  images = [],
}: VerifyInventoryInput) => {
  // ----------------------------------------------------------
  // 1. FIND INVENTORY
  // ----------------------------------------------------------

  const inventory =
    await prisma.recyclableInventory.findUnique({
      where: {
        id: inventoryId,
      },

      include: {
        complaint: true,
        marketplaceListing: true,
      },
    });

  if (!inventory) {
    throw new Error(
      "Recyclable inventory not found",
    );
  }

  // ----------------------------------------------------------
  // 2. CHECK CURRENT STATUS
  // ----------------------------------------------------------

  if (
    inventory.verificationStatus !==
    "PendingVerification"
  ) {
    throw new Error(
      `Inventory is already ${inventory.verificationStatus}`,
    );
  }

  // ----------------------------------------------------------
  // 3. VALIDATE WASTE TYPE
  // ----------------------------------------------------------

  if (
    !verifiedType ||
    verifiedType.trim().length === 0
  ) {
    throw new Error(
      "Verified waste type is required",
    );
  }

  // ----------------------------------------------------------
  // 4. VALIDATE WEIGHT
  // ----------------------------------------------------------

  if (
    verifiedWeightKg === undefined ||
    !Number.isFinite(verifiedWeightKg) ||
    verifiedWeightKg <= 0
  ) {
    throw new Error(
      "Verified weight must be greater than 0 kg",
    );
  }

  // ----------------------------------------------------------
  // 5. VALIDATE VOLUME
  // ----------------------------------------------------------

  if (
    verifiedVolumeCbm !== undefined &&
    (
      !Number.isFinite(verifiedVolumeCbm) ||
      verifiedVolumeCbm < 0
    )
  ) {
    throw new Error(
      "Verified volume must be a valid number",
    );
  }

  // ----------------------------------------------------------
  // 6. VALIDATE PRICE
  // ----------------------------------------------------------

  if (
    pricePerKg !== undefined &&
    (
      !Number.isFinite(pricePerKg) ||
      pricePerKg < 0
    )
  ) {
    throw new Error(
      "Price per kg must be a valid non-negative number",
    );
  }

  const finalPricePerKg =
    pricePerKg ?? 0;

  const totalPrice =
    verifiedWeightKg *
    finalPricePerKg;

  const listingImages =
    Array.isArray(images)
      ? images
      : [];

  // ----------------------------------------------------------
  // 7. VERIFY + CREATE LISTING IN ONE TRANSACTION
  // ----------------------------------------------------------

  const result =
    await prisma.$transaction(
      async (tx) => {

        // ----------------------------------------------------
        // UPDATE INVENTORY
        // ----------------------------------------------------

        const verifiedInventory =
          await tx.recyclableInventory.update({
            where: {
              id: inventoryId,
            },

            data: {
              verifiedType:
                verifiedType.trim(),

              verifiedWeightKg:
                verifiedWeightKg,

              verifiedVolumeCbm:
                verifiedVolumeCbm ?? null,

              qualityGrade:
                qualityGrade?.trim() || null,

              contamination:
                contamination?.trim() || null,

              pricePerKg:
                finalPricePerKg,

              isAvailable: true,

              verificationStatus:
                "Verified",

              verifiedBy,

              verifiedAt:
                new Date(),
            },

            include: {
              complaint: true,
            },
          });

        // ----------------------------------------------------
        // CREATE / UPDATE MARKETPLACE LISTING
        // ----------------------------------------------------

        const title =
          `${verifiedType.trim()} - ${verifiedWeightKg} kg`;

        const description =
          `Verified ${verifiedType.trim()} recyclable waste ` +
          `available for collection. ` +
          `Quantity: ${verifiedWeightKg} kg.` +
          (
            qualityGrade
              ? ` Quality grade: ${qualityGrade}.`
              : ""
          ) +
          (
            contamination
              ? ` Contamination: ${contamination}.`
              : ""
          );

        const listing =
          await tx.marketplaceListing.upsert({
            where: {
              inventoryId,
            },

            update: {
              title,

              description,

              quantityKg:
                verifiedWeightKg,

              wasteType:
                verifiedType.trim(),

              location:
                inventory.complaint.address ??
                inventory.complaint.locationDescription ??
                `${inventory.complaint.latitude}, ${inventory.complaint.longitude}`,

              pricePerKg:
                finalPricePerKg,

              totalPrice,

              images:
                listingImages,

              status:
                "Active",

              expiresAt:
                new Date(
                  Date.now() +
                    30 *
                      24 *
                      60 *
                      60 *
                      1000,
                ),
            },

            create: {
              inventoryId,

              title,

              description,

              quantityKg:
                verifiedWeightKg,

              wasteType:
                verifiedType.trim(),

              location:
                inventory.complaint.address ??
                inventory.complaint.locationDescription ??
                `${inventory.complaint.latitude}, ${inventory.complaint.longitude}`,

              pricePerKg:
                finalPricePerKg,

              totalPrice,

              images:
                listingImages,

              status:
                "Active",

              views: 0,

              interestedBuyers: [],

              expiresAt:
                new Date(
                  Date.now() +
                    30 *
                      24 *
                      60 *
                      60 *
                      1000,
                ),
            },
          });

        return {
          inventory:
            verifiedInventory,

          listing,
        };
      },
    );

  return result;
};


// ============================================================
// REJECT RECYCLABLE INVENTORY
// ============================================================
//
// Used when field worker determines that the waste is:
//
// - not recyclable
// - incorrectly classified
// - inaccessible
// - unsafe
// - unsuitable for marketplace
// ============================================================

export const rejectRecyclableInventory = async (
  inventoryId: string,
  verifiedBy: string,
) => {

  const inventory =
    await prisma.recyclableInventory.findUnique({
      where: {
        id: inventoryId,
      },
    });

  if (!inventory) {
    throw new Error(
      "Recyclable inventory not found",
    );
  }

  if (
    inventory.verificationStatus !==
    "PendingVerification"
  ) {
    throw new Error(
      `Inventory is already ${inventory.verificationStatus}`,
    );
  }

  return prisma.recyclableInventory.update({
    where: {
      id: inventoryId,
    },

    data: {
      verificationStatus:
        "Rejected",

      isAvailable:
        false,

      verifiedBy,

      verifiedAt:
        new Date(),
    },

    include: {
      complaint: true,
    },
  });
};


// ============================================================
// GET MARKETPLACE LISTINGS
// ============================================================
//
// Recyclers/buyers can browse only:
//
// - Active listings
// - Non-expired listings
// - Verified inventory
// - Currently available inventory
// ============================================================

export const getMarketplaceListings =
  async () => {

    return prisma.marketplaceListing.findMany({
      where: {
        status: "Active",

        expiresAt: {
          gt: new Date(),
        },

        inventory: {
          verificationStatus:
            "Verified",

          isAvailable:
            true,
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        inventory: {
          select: {
            id: true,

            verifiedType: true,

            verifiedWeightKg: true,

            verifiedVolumeCbm: true,

            qualityGrade: true,

            contamination: true,

            verificationStatus: true,

            verifiedBy: true,

            verifiedAt: true,

            complaint: {
              select: {
                id: true,

                address: true,

                locationDescription: true,

                latitude: true,

                longitude: true,

                imageUrl: true,

                wasteType: true,
              },
            },
          },
        },
      },
    });
  };