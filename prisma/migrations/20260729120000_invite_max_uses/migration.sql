-- AlterTable
ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "maxUses" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "usedCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill: codes already redeemed once
UPDATE "InviteCode" SET "usedCount" = 1 WHERE "usedById" IS NOT NULL AND "usedCount" = 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "InviteRedemption" (
    "id" TEXT NOT NULL,
    "inviteCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InviteRedemption_userId_key" ON "InviteRedemption"("userId");
CREATE INDEX IF NOT EXISTS "InviteRedemption_inviteCodeId_idx" ON "InviteRedemption"("inviteCodeId");

DO $$ BEGIN
  ALTER TABLE "InviteRedemption" ADD CONSTRAINT "InviteRedemption_inviteCodeId_fkey"
    FOREIGN KEY ("inviteCodeId") REFERENCES "InviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "InviteRedemption" ADD CONSTRAINT "InviteRedemption_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Backfill redemptions from legacy single-use usedById
INSERT INTO "InviteRedemption" ("id", "inviteCodeId", "userId", "createdAt")
SELECT
  'legacy_' || "id",
  "id",
  "usedById",
  COALESCE("usedAt", "createdAt")
FROM "InviteCode"
WHERE "usedById" IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;
