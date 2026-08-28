-- First-party product events for admin funnels.
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "path" TEXT,
    "actor" VARCHAR(200),
    "movie" VARCHAR(200),
    "source" VARCHAR(50),
    "utmSource" VARCHAR(100),
    "utmMedium" VARCHAR(100),
    "utmCampaign" VARCHAR(200),
    "utmContent" VARCHAR(200),
    "properties" JSONB,
    "userId" TEXT,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "isLikelyBot" BOOLEAN NOT NULL DEFAULT false,
    "botCategory" "BotCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductEvent_createdAt_idx" ON "ProductEvent"("createdAt");
CREATE INDEX "ProductEvent_name_createdAt_idx" ON "ProductEvent"("name", "createdAt");
CREATE INDEX "ProductEvent_source_createdAt_idx" ON "ProductEvent"("source", "createdAt");
CREATE INDEX "ProductEvent_utmSource_createdAt_idx" ON "ProductEvent"("utmSource", "createdAt");
CREATE INDEX "ProductEvent_isLikelyBot_createdAt_idx" ON "ProductEvent"("isLikelyBot", "createdAt");
CREATE INDEX "ProductEvent_ipHash_createdAt_idx" ON "ProductEvent"("ipHash", "createdAt");
CREATE INDEX "ProductEvent_path_createdAt_idx" ON "ProductEvent"("path", "createdAt");

ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
