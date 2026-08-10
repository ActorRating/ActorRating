-- ARIE Originals measurement hardening (prediction + metrics + attribution)
ALTER TABLE "ArieOpportunity"
  ADD COLUMN "contentFormat" TEXT,
  ADD COLUMN "sourceHandle" TEXT,
  ADD COLUMN "sourcePostId" TEXT,
  ADD COLUMN "sourceType" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "sourceTimestamp" TIMESTAMP(3),
  ADD COLUMN "prediction" JSONB,
  ADD COLUMN "predictionVersion" TEXT,
  ADD COLUMN "predictionLockedAt" TIMESTAMP(3),
  ADD COLUMN "predictedScore" INTEGER,
  ADD COLUMN "predictedTier" TEXT,
  ADD COLUMN "publishedText" TEXT,
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "attributionCode" TEXT,
  ADD COLUMN "lineage" JSONB,
  ADD COLUMN "publishLockUntil" TIMESTAMP(3),
  ADD COLUMN "publishAttemptId" TEXT;

CREATE INDEX "ArieOpportunity_contentFormat_idx" ON "ArieOpportunity"("contentFormat");
CREATE INDEX "ArieOpportunity_sourceHandle_idx" ON "ArieOpportunity"("sourceHandle");
CREATE INDEX "ArieOpportunity_contentHash_idx" ON "ArieOpportunity"("contentHash");
CREATE INDEX "ArieOpportunity_attributionCode_idx" ON "ArieOpportunity"("attributionCode");
CREATE UNIQUE INDEX "ArieOpportunity_publishAttemptId_key" ON "ArieOpportunity"("publishAttemptId");

ALTER TABLE "ArieSocialPost"
  ADD COLUMN "contentFormat" TEXT,
  ADD COLUMN "attributionCode" TEXT,
  ADD COLUMN "predictedScore" INTEGER,
  ADD COLUMN "predictionVersion" TEXT,
  ADD COLUMN "impressions" INTEGER,
  ADD COLUMN "likes" INTEGER,
  ADD COLUMN "replies" INTEGER,
  ADD COLUMN "reposts" INTEGER,
  ADD COLUMN "quotes" INTEGER,
  ADD COLUMN "bookmarks" INTEGER,
  ADD COLUMN "profileVisits" INTEGER,
  ADD COLUMN "followerDelta" INTEGER,
  ADD COLUMN "linkClicks" INTEGER,
  ADD COLUMN "engagementRate" DOUBLE PRECISION,
  ADD COLUMN "actorRatingClicks" INTEGER,
  ADD COLUMN "actorRatingSessions" INTEGER,
  ADD COLUMN "ratingsCreated" INTEGER,
  ADD COLUMN "waitlistSignups" INTEGER,
  ADD COLUMN "metricsUpdatedAt" TIMESTAMP(3);

CREATE INDEX "ArieSocialPost_attributionCode_idx" ON "ArieSocialPost"("attributionCode");

CREATE TABLE "ArieMetricSnapshot" (
    "id" TEXT NOT NULL,
    "socialPostId" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" INTEGER,
    "likes" INTEGER,
    "replies" INTEGER,
    "reposts" INTEGER,
    "quotes" INTEGER,
    "bookmarks" INTEGER,
    "profileVisits" INTEGER,
    "followerDelta" INTEGER,
    "linkClicks" INTEGER,
    "actorRatingClicks" INTEGER,
    "actorRatingSessions" INTEGER,
    "ratingsCreated" INTEGER,
    "waitlistSignups" INTEGER,

    CONSTRAINT "ArieMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArieMetricSnapshot_socialPostId_window_key" ON "ArieMetricSnapshot"("socialPostId", "window");
CREATE INDEX "ArieMetricSnapshot_capturedAt_idx" ON "ArieMetricSnapshot"("capturedAt");
CREATE INDEX "ArieMetricSnapshot_window_capturedAt_idx" ON "ArieMetricSnapshot"("window", "capturedAt");

ALTER TABLE "ArieMetricSnapshot" ADD CONSTRAINT "ArieMetricSnapshot_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "ArieSocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
