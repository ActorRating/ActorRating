-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);

-- Existing completed accounts: treat prior onboarding as terms acceptance
UPDATE "User"
SET "termsAcceptedAt" = COALESCE("firstSeenAt", "createdAt")
WHERE "onboardingCompleted" = true
  AND "termsAcceptedAt" IS NULL;
