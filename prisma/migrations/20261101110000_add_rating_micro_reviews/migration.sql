-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RatingCommentReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Rating"
  ADD COLUMN IF NOT EXISTS "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "commentHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "RatingCommentReport" (
    "id" TEXT NOT NULL,
    "ratingId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" VARCHAR(40) NOT NULL,
    "details" TEXT,
    "status" "RatingCommentReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "RatingCommentReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RatingCommentReport_ratingId_reporterUserId_key"
  ON "RatingCommentReport"("ratingId", "reporterUserId");

CREATE INDEX IF NOT EXISTS "RatingCommentReport_status_createdAt_idx"
  ON "RatingCommentReport"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "RatingCommentReport_ratingId_idx"
  ON "RatingCommentReport"("ratingId");

CREATE INDEX IF NOT EXISTS "Rating_actorId_movieId_commentHidden_createdAt_idx"
  ON "Rating"("actorId", "movieId", "commentHidden", "createdAt");

DO $$ BEGIN
  ALTER TABLE "RatingCommentReport"
    ADD CONSTRAINT "RatingCommentReport_ratingId_fkey"
    FOREIGN KEY ("ratingId") REFERENCES "Rating"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "RatingCommentReport"
    ADD CONSTRAINT "RatingCommentReport_reporterUserId_fkey"
    FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "RatingCommentReport"
    ADD CONSTRAINT "RatingCommentReport_resolvedByUserId_fkey"
    FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
