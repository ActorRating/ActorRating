-- ARIE Discovery Engine V1 — additive schema

ALTER TABLE "ArieInboundEvent" ADD COLUMN IF NOT EXISTS "sourceCreatedAt" TIMESTAMP(3);
ALTER TABLE "ArieInboundEvent" ADD COLUMN IF NOT EXISTS "discoveryMethod" TEXT;
ALTER TABLE "ArieInboundEvent" ADD COLUMN IF NOT EXISTS "discoveryRunId" TEXT;
ALTER TABLE "ArieInboundEvent" ADD COLUMN IF NOT EXISTS "discoveryCandidateId" TEXT;

CREATE INDEX IF NOT EXISTS "ArieInboundEvent_discoveryRunId_idx" ON "ArieInboundEvent"("discoveryRunId");
CREATE INDEX IF NOT EXISTS "ArieInboundEvent_discoveryMethod_idx" ON "ArieInboundEvent"("discoveryMethod");

CREATE TABLE "ArieDiscoverySource" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'X',
    "sourceType" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "handle" TEXT,
    "query" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pollIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxCandidatesPerPoll" INTEGER NOT NULL DEFAULT 10,
    "authorId" TEXT,
    "lastPolledAt" TIMESTAMP(3),
    "lastSeenPostId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArieDiscoverySource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArieDiscoverySource_provider_sourceKey_key" ON "ArieDiscoverySource"("provider", "sourceKey");
CREATE INDEX "ArieDiscoverySource_enabled_priority_idx" ON "ArieDiscoverySource"("enabled", "priority");
CREATE INDEX "ArieDiscoverySource_provider_sourceType_idx" ON "ArieDiscoverySource"("provider", "sourceType");

CREATE TABLE "ArieDiscoveryRun" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'X',
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "candidatesFound" INTEGER NOT NULL DEFAULT 0,
    "candidatesDeduped" INTEGER NOT NULL DEFAULT 0,
    "candidatesIngested" INTEGER NOT NULL DEFAULT 0,
    "scoutIgnored" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesCreated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "rateLimitInfo" JSONB,
    "capabilitySnapshot" JSONB,
    "triggeredBy" TEXT,

    CONSTRAINT "ArieDiscoveryRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArieDiscoveryRun_provider_startedAt_idx" ON "ArieDiscoveryRun"("provider", "startedAt");
CREATE INDEX "ArieDiscoveryRun_status_startedAt_idx" ON "ArieDiscoveryRun"("status", "startedAt");

CREATE TABLE "ArieDiscoveryCandidate" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'X',
    "externalPostId" TEXT NOT NULL,
    "authorHandle" TEXT,
    "authorId" TEXT,
    "text" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourcePublishedAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveryMethod" TEXT NOT NULL,
    "discoveryRunId" TEXT NOT NULL,
    "discoverySourceId" TEXT,
    "discoveryPriority" INTEGER NOT NULL DEFAULT 0,
    "velocityStatus" TEXT NOT NULL DEFAULT 'unknown',
    "publicMetrics" JSONB,
    "dedupeState" TEXT NOT NULL DEFAULT 'new',
    "inboundEventId" TEXT,
    "opportunityId" TEXT,
    "scoutStatus" TEXT NOT NULL DEFAULT 'pending',
    "originalScore" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "ArieDiscoveryCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArieDiscoveryCandidate_provider_externalPostId_key" ON "ArieDiscoveryCandidate"("provider", "externalPostId");
CREATE INDEX "ArieDiscoveryCandidate_discoveryRunId_idx" ON "ArieDiscoveryCandidate"("discoveryRunId");
CREATE INDEX "ArieDiscoveryCandidate_discoverySourceId_idx" ON "ArieDiscoveryCandidate"("discoverySourceId");
CREATE INDEX "ArieDiscoveryCandidate_discoveredAt_idx" ON "ArieDiscoveryCandidate"("discoveredAt");
CREATE INDEX "ArieDiscoveryCandidate_dedupeState_idx" ON "ArieDiscoveryCandidate"("dedupeState");
CREATE INDEX "ArieDiscoveryCandidate_scoutStatus_idx" ON "ArieDiscoveryCandidate"("scoutStatus");
CREATE INDEX "ArieDiscoveryCandidate_discoveryPriority_idx" ON "ArieDiscoveryCandidate"("discoveryPriority");

ALTER TABLE "ArieDiscoveryCandidate" ADD CONSTRAINT "ArieDiscoveryCandidate_discoveryRunId_fkey" FOREIGN KEY ("discoveryRunId") REFERENCES "ArieDiscoveryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArieDiscoveryCandidate" ADD CONSTRAINT "ArieDiscoveryCandidate_discoverySourceId_fkey" FOREIGN KEY ("discoverySourceId") REFERENCES "ArieDiscoverySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ArieInboundEvent" ADD CONSTRAINT "ArieInboundEvent_discoveryCandidateId_fkey" FOREIGN KEY ("discoveryCandidateId") REFERENCES "ArieDiscoveryCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
