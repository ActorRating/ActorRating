-- Additive: first-party visitor/session identity, engagement write-back and
-- bot-reason diagnostics on PageView / ProductEvent. No data rewritten.

ALTER TABLE "PageView"
  ADD COLUMN "botReason" VARCHAR(120),
  ADD COLUMN "visitorId" VARCHAR(64),
  ADD COLUMN "sessionId" VARCHAR(64),
  ADD COLUMN "engaged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "dwellMs" INTEGER,
  ADD COLUMN "interaction" VARCHAR(20),
  ADD COLUMN "country" VARCHAR(2),
  ADD COLUMN "clientSignals" JSONB;

CREATE INDEX "PageView_visitorId_createdAt_idx" ON "PageView"("visitorId", "createdAt");
CREATE INDEX "PageView_sessionId_createdAt_idx" ON "PageView"("sessionId", "createdAt");
CREATE INDEX "PageView_engaged_createdAt_idx" ON "PageView"("engaged", "createdAt");

ALTER TABLE "ProductEvent"
  ADD COLUMN "visitorId" VARCHAR(64),
  ADD COLUMN "sessionId" VARCHAR(64);

CREATE INDEX "ProductEvent_visitorId_createdAt_idx" ON "ProductEvent"("visitorId", "createdAt");
CREATE INDEX "ProductEvent_sessionId_createdAt_idx" ON "ProductEvent"("sessionId", "createdAt");
