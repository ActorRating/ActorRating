-- ARIE Sprint 1: inbound events, opportunities, usage meter, config, logs, experiments

CREATE TYPE "AriePlatform" AS ENUM ('X');
CREATE TYPE "ArieEventDecision" AS ENUM ('PENDING', 'IGNORE', 'PROCESS', 'ERROR');
CREATE TYPE "ArieUsageProvider" AS ENUM ('X', 'GROQ', 'IMAGE', 'OTHER');

CREATE TABLE "ArieInboundEvent" (
    "id" TEXT NOT NULL,
    "platform" "AriePlatform" NOT NULL DEFAULT 'X',
    "externalId" TEXT NOT NULL,
    "authorHandle" TEXT,
    "authorId" TEXT,
    "text" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "ArieEventDecision" NOT NULL DEFAULT 'PENDING',
    "opportunityScore" INTEGER,
    "scoreBreakdown" JSONB,
    "reasonCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    CONSTRAINT "ArieInboundEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArieInboundEvent_platform_externalId_key" ON "ArieInboundEvent"("platform", "externalId");
CREATE INDEX "ArieInboundEvent_receivedAt_idx" ON "ArieInboundEvent"("receivedAt");
CREATE INDEX "ArieInboundEvent_decision_receivedAt_idx" ON "ArieInboundEvent"("decision", "receivedAt");
CREATE INDEX "ArieInboundEvent_opportunityScore_idx" ON "ArieInboundEvent"("opportunityScore");

CREATE TABLE "ArieOpportunity" (
    "id" TEXT NOT NULL,
    "inboundEventId" TEXT,
    "format" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "opportunityScore" INTEGER,
    "scoreBreakdown" JSONB,
    "priorityAuthor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ArieOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArieOpportunity_status_createdAt_idx" ON "ArieOpportunity"("status", "createdAt");
CREATE INDEX "ArieOpportunity_inboundEventId_idx" ON "ArieOpportunity"("inboundEventId");

ALTER TABLE "ArieOpportunity" ADD CONSTRAINT "ArieOpportunity_inboundEventId_fkey"
  FOREIGN KEY ("inboundEventId") REFERENCES "ArieInboundEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ArieUsageRecord" (
    "id" TEXT NOT NULL,
    "provider" "ArieUsageProvider" NOT NULL,
    "operation" TEXT NOT NULL,
    "units" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(12,6) NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodKey" TEXT NOT NULL,
    CONSTRAINT "ArieUsageRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArieUsageRecord_periodKey_provider_idx" ON "ArieUsageRecord"("periodKey", "provider");
CREATE INDEX "ArieUsageRecord_occurredAt_idx" ON "ArieUsageRecord"("occurredAt");

CREATE TABLE "ArieConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ArieConfig_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "ArieLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArieLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArieLog_scope_createdAt_idx" ON "ArieLog"("scope", "createdAt");
CREATE INDEX "ArieLog_level_createdAt_idx" ON "ArieLog"("level", "createdAt");

CREATE TABLE "ArieExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "hypothesis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ArieExperiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArieExperimentArm" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "promptRef" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ArieExperimentArm_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArieExperimentArm_experimentId_idx" ON "ArieExperimentArm"("experimentId");
ALTER TABLE "ArieExperimentArm" ADD CONSTRAINT "ArieExperimentArm_experimentId_fkey"
  FOREIGN KEY ("experimentId") REFERENCES "ArieExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ArieExperimentAssignment" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "armId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArieExperimentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArieExperimentAssignment_experimentId_opportunityId_key"
  ON "ArieExperimentAssignment"("experimentId", "opportunityId");
CREATE INDEX "ArieExperimentAssignment_armId_idx" ON "ArieExperimentAssignment"("armId");

ALTER TABLE "ArieExperimentAssignment" ADD CONSTRAINT "ArieExperimentAssignment_experimentId_fkey"
  FOREIGN KEY ("experimentId") REFERENCES "ArieExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArieExperimentAssignment" ADD CONSTRAINT "ArieExperimentAssignment_armId_fkey"
  FOREIGN KEY ("armId") REFERENCES "ArieExperimentArm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
