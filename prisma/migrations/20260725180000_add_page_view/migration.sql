-- First-party pageview analytics (human + bot-flagged rows).
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" VARCHAR(100),
    "utmMedium" VARCHAR(100),
    "utmCampaign" VARCHAR(200),
    "userId" TEXT,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "isLikelyBot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");
CREATE INDEX "PageView_isLikelyBot_createdAt_idx" ON "PageView"("isLikelyBot", "createdAt");
CREATE INDEX "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt");
CREATE INDEX "PageView_utmSource_createdAt_idx" ON "PageView"("utmSource", "createdAt");
CREATE INDEX "PageView_ipHash_createdAt_idx" ON "PageView"("ipHash", "createdAt");

ALTER TABLE "PageView" ADD CONSTRAINT "PageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
