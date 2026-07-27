-- CreateTable
CREATE TABLE IF NOT EXISTS "ForumCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ForumCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ForumCategory_slug_key" ON "ForumCategory"("slug");

CREATE TABLE IF NOT EXISTS "ForumThread" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "actorId" TEXT,
    "movieId" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ForumThread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ForumThread_slug_key" ON "ForumThread"("slug");
CREATE INDEX IF NOT EXISTS "ForumThread_categoryId_updatedAt_idx" ON "ForumThread"("categoryId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ForumThread_actorId_idx" ON "ForumThread"("actorId");
CREATE INDEX IF NOT EXISTS "ForumThread_movieId_idx" ON "ForumThread"("movieId");
CREATE INDEX IF NOT EXISTS "ForumThread_isPinned_updatedAt_idx" ON "ForumThread"("isPinned", "updatedAt");

CREATE TABLE IF NOT EXISTS "ForumPost" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isOriginal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ForumPost_threadId_createdAt_idx" ON "ForumPost"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "ForumPost_authorId_idx" ON "ForumPost"("authorId");

CREATE TABLE IF NOT EXISTS "ForumPostReport" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" VARCHAR(40) NOT NULL,
    "details" TEXT,
    "status" "RatingCommentReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    CONSTRAINT "ForumPostReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ForumPostReport_postId_reporterUserId_key" ON "ForumPostReport"("postId", "reporterUserId");
CREATE INDEX IF NOT EXISTS "ForumPostReport_status_createdAt_idx" ON "ForumPostReport"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ForumPostReport_postId_idx" ON "ForumPostReport"("postId");

DO $$ BEGIN
  ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "ForumCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_movieId_fkey"
    FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ForumPostReport" ADD CONSTRAINT "ForumPostReport_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ForumPostReport" ADD CONSTRAINT "ForumPostReport_reporterUserId_fkey"
    FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ForumPostReport" ADD CONSTRAINT "ForumPostReport_resolvedByUserId_fkey"
    FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Seed default categories
INSERT INTO "ForumCategory" ("id", "name", "slug", "description", "sortOrder", "createdAt")
VALUES
  ('forumcat_showdowns', 'Role Showdowns', 'role-showdowns', 'Compare portrayals of the same character or head-to-head performances.', 1, CURRENT_TIMESTAMP),
  ('forumcat_snubs', 'Snubs & Award Season', 'snubs-awards', 'Category fraud, Oscar politics, and underrated gems.', 2, CURRENT_TIMESTAMP),
  ('forumcat_craft', 'Craft & Technique', 'craft-technique', 'Accents, physical transformations, and scene analyses.', 3, CURRENT_TIMESTAMP),
  ('forumcat_general', 'General Film & TV', 'general', 'Casual discussions and recommendations.', 4, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
