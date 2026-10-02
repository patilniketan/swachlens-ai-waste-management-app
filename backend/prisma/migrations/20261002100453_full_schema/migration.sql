-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('Pending', 'Assigned', 'InProgress', 'Resolved', 'Linked', 'Merged', 'Rejected');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'STANDARD', 'TRIVIAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "wasteType" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aiAccessibility" TEXT,
    "aiHazardousDetected" BOOLEAN NOT NULL DEFAULT false,
    "aiHazardousTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiImageConfidence" DOUBLE PRECISION,
    "aiQualityIndicators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiRelativeVolume" TEXT,
    "aiSuggestedEquipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiSummary" TEXT,
    "aiWasteCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiWasteCondition" TEXT,
    "duplicateOfId" TEXT,
    "duplicateSimilarity" DOUBLE PRECISION,
    "estimatedQuantity" TEXT,
    "estimatedTimeMinutes" INTEGER,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "locationDescription" TEXT,
    "masterComplaintId" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'STANDARD',
    "requiredHeavyVehicles" INTEGER NOT NULL DEFAULT 0,
    "requiredWorkers" INTEGER NOT NULL DEFAULT 1,
    "sentimentLabel" TEXT,
    "sentimentScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "urgencyScore" INTEGER NOT NULL DEFAULT 1,
    "voteCount" INTEGER NOT NULL DEFAULT 1,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintLink" (
    "id" TEXT NOT NULL,
    "masterComplaintId" TEXT NOT NULL,
    "linkedComplaintId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workers" INTEGER NOT NULL DEFAULT 0,
    "heavyVehicles" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintLink_masterComplaintId_linkedComplaintId_key" ON "ComplaintLink"("masterComplaintId", "linkedComplaintId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_date_key" ON "Resource"("date");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_masterComplaintId_fkey" FOREIGN KEY ("masterComplaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintLink" ADD CONSTRAINT "ComplaintLink_linkedComplaintId_fkey" FOREIGN KEY ("linkedComplaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintLink" ADD CONSTRAINT "ComplaintLink_masterComplaintId_fkey" FOREIGN KEY ("masterComplaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
