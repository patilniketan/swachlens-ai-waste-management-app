-- CreateEnum
CREATE TYPE "ComplaintEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'MERGED', 'DUPLICATE_CONFIRMED', 'DUPLICATE_REJECTED', 'PRIORITY_OVERRIDE');

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "priorityOverridden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolutionNotes" TEXT;

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "plan" JSONB,
ADD COLUMN     "planGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "planGeneratedBy" TEXT,
ALTER COLUMN "date" SET DATA TYPE DATE;

-- CreateTable
CREATE TABLE "ComplaintEvent" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "ComplaintEventType" NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplaintEvent_complaintId_createdAt_idx" ON "ComplaintEvent"("complaintId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplaintEvent_type_idx" ON "ComplaintEvent"("type");

-- CreateIndex
CREATE INDEX "Complaint_masterComplaintId_idx" ON "Complaint"("masterComplaintId");

-- AddForeignKey
ALTER TABLE "ComplaintEvent" ADD CONSTRAINT "ComplaintEvent_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintEvent" ADD CONSTRAINT "ComplaintEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
