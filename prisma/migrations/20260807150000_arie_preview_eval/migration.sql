-- ARIE Sprint 2 eval: preview logging + human grades

CREATE TYPE "ArieHumanGrade" AS ENUM ('A', 'B', 'C', 'D');

CREATE TABLE "AriePreviewEval" (
    "id" TEXT NOT NULL,
    "inboundEventId" TEXT,
    "sourceText" TEXT NOT NULL,
    "authorHandle" TEXT,
    "opportunityScore" INTEGER NOT NULL,
    "coveragePercent" INTEGER NOT NULL,
    "coverage" JSONB NOT NULL,
    "contextPackage" JSONB NOT NULL,
    "draftText" TEXT NOT NULL,
    "draftJson" JSONB,
    "confidence" INTEGER,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generationMs" INTEGER,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "humanGrade" "ArieHumanGrade",
    "notes" TEXT,
    "gradedAt" TIMESTAMP(3),
    "gradedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AriePreviewEval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AriePreviewEval_humanGrade_createdAt_idx" ON "AriePreviewEval"("humanGrade", "createdAt");
CREATE INDEX "AriePreviewEval_createdAt_idx" ON "AriePreviewEval"("createdAt");
CREATE INDEX "AriePreviewEval_opportunityScore_idx" ON "AriePreviewEval"("opportunityScore");
CREATE INDEX "AriePreviewEval_coveragePercent_idx" ON "AriePreviewEval"("coveragePercent");
CREATE INDEX "AriePreviewEval_promptVersion_idx" ON "AriePreviewEval"("promptVersion");
