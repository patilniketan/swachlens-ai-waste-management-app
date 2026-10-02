/*
  Warnings:

  - You are about to drop the column `otp` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "afterImageUrl" TEXT,
ADD COLUMN     "aiSource" TEXT,
ADD COLUMN     "isSimulated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedWeightKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "otp",
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpHash" TEXT;
