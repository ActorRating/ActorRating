-- CreateEnum
CREATE TYPE "BotCategory" AS ENUM ('KNOWN_CRAWLER', 'UNIDENTIFIED');

-- AlterTable
ALTER TABLE "PageView" ADD COLUMN "botCategory" "BotCategory";

-- CreateIndex
CREATE INDEX "PageView_botCategory_createdAt_idx" ON "PageView"("botCategory", "createdAt");
