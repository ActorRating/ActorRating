/*
  Warnings:

  - You are about to drop the column `acceptedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `acceptedTerms` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerifiedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isVerifiedRater` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `kvkkAccepted` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastSignupAttempt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lockedUntil` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `loginAttempts` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `onboardingCompleted` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profilePublic` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `ratingCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `showEmail` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `signupAttempts` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `termsVersion` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationExpiry` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."User_username_key";

-- DropIndex
DROP INDEX "public"."User_verificationToken_key";

-- AlterTable
ALTER TABLE "public"."Performance" ADD COLUMN     "character" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "acceptedAt",
DROP COLUMN "acceptedTerms",
DROP COLUMN "bio",
DROP COLUMN "emailVerified",
DROP COLUMN "emailVerifiedAt",
DROP COLUMN "image",
DROP COLUMN "isActive",
DROP COLUMN "isVerifiedRater",
DROP COLUMN "kvkkAccepted",
DROP COLUMN "lastLoginAt",
DROP COLUMN "lastSignupAttempt",
DROP COLUMN "location",
DROP COLUMN "lockedUntil",
DROP COLUMN "loginAttempts",
DROP COLUMN "name",
DROP COLUMN "onboardingCompleted",
DROP COLUMN "profilePublic",
DROP COLUMN "ratingCount",
DROP COLUMN "showEmail",
DROP COLUMN "signupAttempts",
DROP COLUMN "termsVersion",
DROP COLUMN "updatedAt",
DROP COLUMN "username",
DROP COLUMN "verificationExpiry",
DROP COLUMN "verificationToken",
DROP COLUMN "website",
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "password" SET NOT NULL;

-- DropTable
DROP TABLE "public"."VerificationToken";
