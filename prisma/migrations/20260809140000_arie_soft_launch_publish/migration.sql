-- Soft-launch publish fields + social post audit trail
CREATE TYPE "AriePublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FAILED', 'SKIPPED');
CREATE TYPE "AriePublishMode" AS ENUM ('MANUAL', 'AUTO');

ALTER TABLE "AriePreviewEval"
  ADD COLUMN "inReplyToTweetId" TEXT,
  ADD COLUMN "publishStatus" "AriePublishStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "publishMode" "AriePublishMode",
  ADD COLUMN "publishedTweetId" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "publishError" TEXT;

CREATE INDEX "AriePreviewEval_publishStatus_createdAt_idx" ON "AriePreviewEval"("publishStatus", "createdAt");
CREATE INDEX "AriePreviewEval_inReplyToTweetId_idx" ON "AriePreviewEval"("inReplyToTweetId");

CREATE TABLE "ArieSocialPost" (
    "id" TEXT NOT NULL,
    "previewEvalId" TEXT,
    "platform" "AriePlatform" NOT NULL DEFAULT 'X',
    "externalPostId" TEXT,
    "inReplyToTweetId" TEXT,
    "text" TEXT NOT NULL,
    "mode" "AriePublishMode" NOT NULL,
    "status" "AriePublishStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArieSocialPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArieSocialPost_platform_externalPostId_key" ON "ArieSocialPost"("platform", "externalPostId");
CREATE INDEX "ArieSocialPost_previewEvalId_idx" ON "ArieSocialPost"("previewEvalId");
CREATE INDEX "ArieSocialPost_createdAt_idx" ON "ArieSocialPost"("createdAt");
CREATE INDEX "ArieSocialPost_status_createdAt_idx" ON "ArieSocialPost"("status", "createdAt");

ALTER TABLE "ArieSocialPost" ADD CONSTRAINT "ArieSocialPost_previewEvalId_fkey" FOREIGN KEY ("previewEvalId") REFERENCES "AriePreviewEval"("id") ON DELETE SET NULL ON UPDATE CASCADE;
