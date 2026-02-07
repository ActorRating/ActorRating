-- CreateEnum
CREATE TYPE "PerformanceTier" AS ENUM ('LEAD', 'SUPPORTING', 'MINOR');

-- AlterTable
ALTER TABLE "Performance" ADD COLUMN "order" INTEGER,
ADD COLUMN "tier" "PerformanceTier" NOT NULL DEFAULT 'MINOR';

-- CreateIndex
CREATE INDEX "Performance_tier_idx" ON "Performance"("tier");
