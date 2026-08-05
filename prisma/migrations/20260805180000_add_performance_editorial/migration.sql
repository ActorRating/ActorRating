-- CreateEnum
CREATE TYPE "EditorialStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HUMAN_LOCKED', 'NEEDS_REGEN');

-- CreateTable
CREATE TABLE "PerformanceEditorial" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "status" "EditorialStatus" NOT NULL DEFAULT 'DRAFT',
    "overview" TEXT NOT NULL,
    "scoreAnalysis" TEXT NOT NULL,
    "communityTake" TEXT NOT NULL,
    "notableMoments" TEXT NOT NULL,
    "spoilerFree" BOOLEAN NOT NULL DEFAULT true,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "inputHash" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT,
    "generatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "editedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceEditorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceEditorial_status_publishedAt_idx" ON "PerformanceEditorial"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "PerformanceEditorial_status_updatedAt_idx" ON "PerformanceEditorial"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceEditorial_actorId_movieId_key" ON "PerformanceEditorial"("actorId", "movieId");

-- AddForeignKey
ALTER TABLE "PerformanceEditorial" ADD CONSTRAINT "PerformanceEditorial_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceEditorial" ADD CONSTRAINT "PerformanceEditorial_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
