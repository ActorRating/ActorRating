-- ARIE validation batches (immutable corpus runs for originals evaluation)

CREATE TABLE "ArieValidationBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "corpusVersion" TEXT NOT NULL,
    "corpusSnapshot" JSONB NOT NULL,
    "arieVersions" JSONB,
    "sourceDistribution" JSONB,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "runMode" TEXT NOT NULL DEFAULT 'score_only',
    "sampleConfig" JSONB,
    "aggregateMetrics" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArieValidationBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArieValidationCase" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "corpusItemId" TEXT NOT NULL,
    "sourceHandle" TEXT,
    "sourceText" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourcePostId" TEXT,
    "inputOrigin" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "opportunityId" TEXT,
    "pipelineResult" JSONB,
    "sampleReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedForReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewPriority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "humanGrade" "ArieHumanGrade",
    "scoreTruthfulness" INTEGER,
    "scoreUsefulness" INTEGER,
    "scoreFraming" INTEGER,
    "scoreBrandVoice" INTEGER,
    "gradeNotes" TEXT,
    "gradedAt" TIMESTAMP(3),
    "gradedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArieValidationCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArieValidationBatch_status_createdAt_idx" ON "ArieValidationBatch"("status", "createdAt");
CREATE INDEX "ArieValidationBatch_corpusVersion_createdAt_idx" ON "ArieValidationBatch"("corpusVersion", "createdAt");

CREATE UNIQUE INDEX "ArieValidationCase_batchId_corpusItemId_key" ON "ArieValidationCase"("batchId", "corpusItemId");
CREATE INDEX "ArieValidationCase_batchId_selectedForReview_idx" ON "ArieValidationCase"("batchId", "selectedForReview");
CREATE INDEX "ArieValidationCase_batchId_humanGrade_idx" ON "ArieValidationCase"("batchId", "humanGrade");
CREATE INDEX "ArieValidationCase_batchId_status_idx" ON "ArieValidationCase"("batchId", "status");
CREATE INDEX "ArieValidationCase_opportunityId_idx" ON "ArieValidationCase"("opportunityId");
CREATE INDEX "ArieValidationCase_sourceHandle_idx" ON "ArieValidationCase"("sourceHandle");

ALTER TABLE "ArieValidationCase" ADD CONSTRAINT "ArieValidationCase_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ArieValidationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
