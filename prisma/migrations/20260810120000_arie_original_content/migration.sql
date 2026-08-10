-- ARIE Original Content Engine — extend ArieOpportunity + link social posts
ALTER TABLE "ArieOpportunity"
  ADD COLUMN "contentType" TEXT NOT NULL DEFAULT 'reply',
  ADD COLUMN "originalScore" INTEGER,
  ADD COLUMN "originalScoreBreakdown" JSONB,
  ADD COLUMN "dedupeKey" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "originalStatus" TEXT,
  ADD COLUMN "concepts" JSONB,
  ADD COLUMN "selectedConceptId" TEXT,
  ADD COLUMN "selectedConcept" JSONB,
  ADD COLUMN "conceptRankMeta" JSONB,
  ADD COLUMN "visualSpec" JSONB,
  ADD COLUMN "finalDraft" TEXT,
  ADD COLUMN "draftJson" JSONB,
  ADD COLUMN "qaResult" JSONB,
  ADD COLUMN "publishStatus" "AriePublishStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "publishMode" "AriePublishMode",
  ADD COLUMN "publishedTweetId" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "publishError" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedByEmail" TEXT,
  ADD COLUMN "ignoredReason" TEXT,
  ADD COLUMN "promptVersions" JSONB,
  ADD COLUMN "modelMeta" JSONB,
  ADD COLUMN "conceptGenCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "draftGenCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "qaRunCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ArieOpportunity_contentType_originalStatus_createdAt_idx"
  ON "ArieOpportunity"("contentType", "originalStatus", "createdAt");
CREATE INDEX "ArieOpportunity_dedupeKey_idx" ON "ArieOpportunity"("dedupeKey");
CREATE INDEX "ArieOpportunity_expiresAt_idx" ON "ArieOpportunity"("expiresAt");
CREATE INDEX "ArieOpportunity_originalScore_idx" ON "ArieOpportunity"("originalScore");
CREATE INDEX "ArieOpportunity_publishStatus_createdAt_idx"
  ON "ArieOpportunity"("publishStatus", "createdAt");

ALTER TABLE "ArieSocialPost" ADD COLUMN "opportunityId" TEXT;
CREATE INDEX "ArieSocialPost_opportunityId_idx" ON "ArieSocialPost"("opportunityId");
ALTER TABLE "ArieSocialPost"
  ADD CONSTRAINT "ArieSocialPost_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "ArieOpportunity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
