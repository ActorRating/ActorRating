-- Additive Face-Off tables. Does not alter Rating or community 0–10 scores.

CREATE TYPE "FaceOffEntityType" AS ENUM ('ACTOR', 'PERFORMANCE');
CREATE TYPE "FaceOffMode" AS ENUM ('ACTOR', 'PERFORMANCE', 'MIXED');

CREATE TABLE "FaceOffEntity" (
    "id" TEXT NOT NULL,
    "entityType" "FaceOffEntityType" NOT NULL,
    "actorId" TEXT,
    "performanceId" TEXT,
    "displayName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "subtitle" TEXT,
    "metadata" JSONB,
    "elo" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "comparisonCount" INTEGER NOT NULL DEFAULT 0,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FaceOffEntity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaceOffEntity_actorId_key" ON "FaceOffEntity"("actorId");
CREATE UNIQUE INDEX "FaceOffEntity_performanceId_key" ON "FaceOffEntity"("performanceId");
CREATE INDEX "FaceOffEntity_entityType_eligible_elo_idx" ON "FaceOffEntity"("entityType", "eligible", "elo");
CREATE INDEX "FaceOffEntity_entityType_eligible_comparisonCount_idx" ON "FaceOffEntity"("entityType", "eligible", "comparisonCount");
CREATE INDEX "FaceOffEntity_entityType_eligible_popularity_idx" ON "FaceOffEntity"("entityType", "eligible", "popularity");

ALTER TABLE "FaceOffEntity" ADD CONSTRAINT "FaceOffEntity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffEntity" ADD CONSTRAINT "FaceOffEntity_performanceId_fkey" FOREIGN KEY ("performanceId") REFERENCES "Performance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FaceOffEntity" ADD CONSTRAINT "FaceOffEntity_type_source_check" CHECK (
    ("entityType" = 'ACTOR' AND "actorId" IS NOT NULL AND "performanceId" IS NULL)
    OR ("entityType" = 'PERFORMANCE' AND "performanceId" IS NOT NULL AND "actorId" IS NULL)
);

CREATE TABLE "FaceOffSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestTokenHash" TEXT,
    "mode" "FaceOffMode" NOT NULL DEFAULT 'MIXED',
    "choiceCount" INTEGER NOT NULL DEFAULT 0,
    "lastComparisonType" "FaceOffEntityType",
    "lastPairKey" TEXT,
    "preferences" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "linkedAt" TIMESTAMP(3),
    CONSTRAINT "FaceOffSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaceOffSession_guestTokenHash_key" ON "FaceOffSession"("guestTokenHash");
CREATE INDEX "FaceOffSession_userId_expiresAt_idx" ON "FaceOffSession"("userId", "expiresAt");
CREATE INDEX "FaceOffSession_expiresAt_idx" ON "FaceOffSession"("expiresAt");

ALTER TABLE "FaceOffSession" ADD CONSTRAINT "FaceOffSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FaceOffMatchup" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "leftId" TEXT NOT NULL,
    "rightId" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "mode" "FaceOffEntityType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaceOffMatchup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FaceOffMatchup_sessionId_createdAt_idx" ON "FaceOffMatchup"("sessionId", "createdAt");
CREATE INDEX "FaceOffMatchup_sessionId_pairKey_idx" ON "FaceOffMatchup"("sessionId", "pairKey");
CREATE INDEX "FaceOffMatchup_expiresAt_idx" ON "FaceOffMatchup"("expiresAt");

ALTER TABLE "FaceOffMatchup" ADD CONSTRAINT "FaceOffMatchup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FaceOffSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffMatchup" ADD CONSTRAINT "FaceOffMatchup_leftId_fkey" FOREIGN KEY ("leftId") REFERENCES "FaceOffEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffMatchup" ADD CONSTRAINT "FaceOffMatchup_rightId_fkey" FOREIGN KEY ("rightId") REFERENCES "FaceOffEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffMatchup" ADD CONSTRAINT "FaceOffMatchup_distinct_check" CHECK ("leftId" <> "rightId");

CREATE TABLE "FaceOffVote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "leftId" TEXT NOT NULL,
    "rightId" TEXT NOT NULL,
    "winnerId" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaceOffVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaceOffVote_sessionId_pairKey_key" ON "FaceOffVote"("sessionId", "pairKey");
CREATE INDEX "FaceOffVote_sessionId_createdAt_idx" ON "FaceOffVote"("sessionId", "createdAt");
CREATE INDEX "FaceOffVote_pairKey_idx" ON "FaceOffVote"("pairKey");

ALTER TABLE "FaceOffVote" ADD CONSTRAINT "FaceOffVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FaceOffSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffVote" ADD CONSTRAINT "FaceOffVote_leftId_fkey" FOREIGN KEY ("leftId") REFERENCES "FaceOffEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffVote" ADD CONSTRAINT "FaceOffVote_rightId_fkey" FOREIGN KEY ("rightId") REFERENCES "FaceOffEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffVote" ADD CONSTRAINT "FaceOffVote_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "FaceOffEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffVote" ADD CONSTRAINT "FaceOffVote_distinct_check" CHECK ("leftId" <> "rightId");
ALTER TABLE "FaceOffVote" ADD CONSTRAINT "FaceOffVote_winner_check" CHECK ("winnerId" = "leftId" OR "winnerId" = "rightId");

CREATE TABLE "FaceOffShare" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "leftId" TEXT NOT NULL,
    "rightId" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "mode" "FaceOffEntityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaceOffShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaceOffShare_publicId_key" ON "FaceOffShare"("publicId");
CREATE UNIQUE INDEX "FaceOffShare_pairKey_mode_key" ON "FaceOffShare"("pairKey", "mode");
CREATE INDEX "FaceOffShare_leftId_idx" ON "FaceOffShare"("leftId");
CREATE INDEX "FaceOffShare_rightId_idx" ON "FaceOffShare"("rightId");

ALTER TABLE "FaceOffShare" ADD CONSTRAINT "FaceOffShare_leftId_fkey" FOREIGN KEY ("leftId") REFERENCES "FaceOffEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffShare" ADD CONSTRAINT "FaceOffShare_rightId_fkey" FOREIGN KEY ("rightId") REFERENCES "FaceOffEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceOffShare" ADD CONSTRAINT "FaceOffShare_distinct_check" CHECK ("leftId" <> "rightId");
