-- First-touch UTM for paid-ad attribution (campaign + keyword through signup and rating).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupUtmSource" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupUtmMedium" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupUtmCampaign" VARCHAR(200);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupUtmTerm" VARCHAR(200);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupUtmContent" VARCHAR(200);
CREATE INDEX IF NOT EXISTS "User_signupUtmCampaign_idx" ON "User"("signupUtmCampaign");

ALTER TABLE "PageView" ADD COLUMN IF NOT EXISTS "utmTerm" VARCHAR(200);
ALTER TABLE "PageView" ADD COLUMN IF NOT EXISTS "utmContent" VARCHAR(200);
CREATE INDEX IF NOT EXISTS "PageView_utmCampaign_createdAt_idx" ON "PageView"("utmCampaign", "createdAt");
CREATE INDEX IF NOT EXISTS "PageView_utmTerm_createdAt_idx" ON "PageView"("utmTerm", "createdAt");

ALTER TABLE "ProductEvent" ADD COLUMN IF NOT EXISTS "utmTerm" VARCHAR(200);

ALTER TABLE "Rating" ADD COLUMN IF NOT EXISTS "utmSource" VARCHAR(100);
ALTER TABLE "Rating" ADD COLUMN IF NOT EXISTS "utmMedium" VARCHAR(100);
ALTER TABLE "Rating" ADD COLUMN IF NOT EXISTS "utmCampaign" VARCHAR(200);
ALTER TABLE "Rating" ADD COLUMN IF NOT EXISTS "utmTerm" VARCHAR(200);
ALTER TABLE "Rating" ADD COLUMN IF NOT EXISTS "utmContent" VARCHAR(200);
CREATE INDEX IF NOT EXISTS "Rating_utmCampaign_createdAt_idx" ON "Rating"("utmCampaign", "createdAt");
