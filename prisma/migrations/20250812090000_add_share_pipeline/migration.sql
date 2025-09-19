-- Add share-related columns to Rating
ALTER TABLE "Rating"
  ADD COLUMN IF NOT EXISTS "slug" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "shareScore" SMALLINT,
  ADD COLUMN IF NOT EXISTS "roleName" TEXT,
  ADD COLUMN IF NOT EXISTS "breakdown" JSONB;

-- Create ShareImage table
CREATE TABLE IF NOT EXISTS "ShareImage" (
  "id" TEXT PRIMARY KEY,
  "ratingId" TEXT NOT NULL UNIQUE,
  "feedUrl" TEXT NOT NULL,
  "storyUrl" TEXT NOT NULL,
  "ogUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "ShareImage_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "Rating"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create ShortLink table
CREATE TABLE IF NOT EXISTS "ShortLink" (
  "code" TEXT PRIMARY KEY,
  "targetUrl" TEXT NOT NULL,
  "ratingId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ShortLink_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "Rating"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShortLink_ratingId_idx" ON "ShortLink" ("ratingId");

-- Create ShareClick table
CREATE TABLE IF NOT EXISTS "ShareClick" (
  "id" TEXT PRIMARY KEY,
  "shortLinkId" TEXT NOT NULL,
  "referer" TEXT,
  "userAgent" TEXT,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "ShareClick_shortLinkId_fkey" FOREIGN KEY ("shortLinkId") REFERENCES "ShortLink"("code") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShareClick_shortLinkId_idx" ON "ShareClick" ("shortLinkId");

-- Create ServerEvent table for analytics
CREATE TABLE IF NOT EXISTS "ServerEvent" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "ratingId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ServerEvent_type_idx" ON "ServerEvent" ("type");
CREATE INDEX IF NOT EXISTS "ServerEvent_ratingId_idx" ON "ServerEvent" ("ratingId");


