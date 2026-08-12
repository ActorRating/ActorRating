-- ARIE Discovery Engine V1 hardening — additive only

ALTER TABLE "ArieDiscoveryRun" ADD COLUMN IF NOT EXISTS "candidatesRetried" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArieDiscoveryRun" ADD COLUMN IF NOT EXISTS "scoutExcluded" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArieDiscoveryRun" ADD COLUMN IF NOT EXISTS "opportunityEligible" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArieDiscoveryRun" ADD COLUMN IF NOT EXISTS "opportunityDeduped" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArieDiscoveryRun" ADD COLUMN IF NOT EXISTS "inboundCreated" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArieDiscoveryRun" ADD COLUMN IF NOT EXISTS "inboundDeduped" INTEGER NOT NULL DEFAULT 0;

-- Rename scoutIgnored → keep column for compatibility if exists; new code uses scoutExcluded.
-- Do not drop scoutIgnored if present from V1 migration.
ALTER TABLE "ArieDiscoveryRun" ADD COLUMN IF NOT EXISTS "scoutIgnored" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ArieDiscoveryCandidate" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ArieDiscoveryCandidate" ADD COLUMN IF NOT EXISTS "lastDiscoveryRunId" TEXT;
ALTER TABLE "ArieDiscoveryCandidate" ADD COLUMN IF NOT EXISTS "ingestStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "ArieDiscoveryCandidate" ADD COLUMN IF NOT EXISTS "ingestStartedAt" TIMESTAMP(3);
ALTER TABLE "ArieDiscoveryCandidate" ADD COLUMN IF NOT EXISTS "ingestAttemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArieDiscoveryCandidate" ADD COLUMN IF NOT EXISTS "ingestLeaseUntil" TIMESTAMP(3);
ALTER TABLE "ArieDiscoveryCandidate" ADD COLUMN IF NOT EXISTS "lastIngestError" TEXT;

CREATE INDEX IF NOT EXISTS "ArieDiscoveryCandidate_lastDiscoveryRunId_idx" ON "ArieDiscoveryCandidate"("lastDiscoveryRunId");
CREATE INDEX IF NOT EXISTS "ArieDiscoveryCandidate_lastSeenAt_idx" ON "ArieDiscoveryCandidate"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "ArieDiscoveryCandidate_ingestStatus_idx" ON "ArieDiscoveryCandidate"("ingestStatus");

DO $$ BEGIN
  ALTER TABLE "ArieDiscoveryCandidate" ADD CONSTRAINT "ArieDiscoveryCandidate_lastDiscoveryRunId_fkey"
    FOREIGN KEY ("lastDiscoveryRunId") REFERENCES "ArieDiscoveryRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
