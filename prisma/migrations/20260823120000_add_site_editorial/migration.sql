-- Site journal articles (/stories, /news) for daily cron + runtime publish.
CREATE TYPE "SiteEditorialKind" AS ENUM ('story', 'news');
CREATE TYPE "SiteEditorialStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "SiteEditorial" (
    "id" TEXT NOT NULL,
    "kind" "SiteEditorialKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "coverImage" TEXT,
    "related" JSONB,
    "status" "SiteEditorialStatus" NOT NULL DEFAULT 'PUBLISHED',
    "source" TEXT NOT NULL DEFAULT 'cron',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteEditorial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteEditorial_slug_key" ON "SiteEditorial"("slug");
CREATE INDEX "SiteEditorial_kind_status_publishedAt_idx" ON "SiteEditorial"("kind", "status", "publishedAt");
CREATE INDEX "SiteEditorial_status_publishedAt_idx" ON "SiteEditorial"("status", "publishedAt");
