-- CreateEnum
CREATE TYPE "AiSource" AS ENUM ('gemini', 'cached', 'seed', 'fallback');

-- CreateEnum
CREATE TYPE "SameIssueVerdict" AS ENUM ('yes', 'no', 'unsure');

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "duplicateOfId",
DROP COLUMN "duplicateSimilarity",
DROP COLUMN "sentimentLabel",
DROP COLUMN "sentimentScore",
ADD COLUMN     "aiBlockedRoad" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiNearSensitiveSite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "duplicateSuggestionOfId" TEXT,
ADD COLUMN     "duplicateSuggestionReason" TEXT,
ADD COLUMN     "duplicateSuggestionVerdict" "SameIssueVerdict",
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priorityReasons" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Convert aiSource in place (Prisma would drop and recreate it).
-- Older values: "live" and "+"-joined mixes from the previous pipeline.
ALTER TABLE "Complaint" ALTER COLUMN "aiSource" TYPE "AiSource" USING (
  CASE
    WHEN "aiSource" IS NULL THEN NULL
    WHEN "aiSource" IN ('gemini', 'cached', 'seed', 'fallback') THEN "aiSource"
    WHEN "aiSource" LIKE '%fallback%' THEN 'fallback'
    WHEN "aiSource" LIKE '%live%' THEN 'gemini'
    WHEN "aiSource" LIKE '%cached%' THEN 'cached'
    ELSE 'fallback'
  END
)::"AiSource";

-- AlterTable
ALTER TABLE "ComplaintLink" ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "reason" TEXT,
ALTER COLUMN "similarityScore" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_idempotencyKey_key" ON "Complaint"("idempotencyKey");
