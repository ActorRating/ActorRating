-- Add lightweight acquisition tracking fields to User.
-- NOTE: This migration was generated manually because the database was unreachable
-- in the current environment when `prisma migrate dev` was requested.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "firstSeenAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

