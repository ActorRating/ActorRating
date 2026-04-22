-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('NEW', 'ONBOARDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN "status" "public"."UserStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "onboardingStartedAt" TIMESTAMP(3);
