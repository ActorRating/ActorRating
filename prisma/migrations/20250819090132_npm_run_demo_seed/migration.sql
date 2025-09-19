-- AlterTable
ALTER TABLE "public"."ServerEvent" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."ShareClick" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."ShareImage" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."ShortLink" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Actor_name_idx" ON "public"."Actor"("name");

-- CreateIndex
CREATE INDEX "Movie_title_idx" ON "public"."Movie"("title");

-- CreateIndex
CREATE INDEX "Performance_actorId_idx" ON "public"."Performance"("actorId");

-- CreateIndex
CREATE INDEX "Performance_movieId_idx" ON "public"."Performance"("movieId");

-- CreateIndex
CREATE INDEX "Performance_actorId_movieId_idx" ON "public"."Performance"("actorId", "movieId");

-- CreateIndex
CREATE INDEX "Rating_actorId_idx" ON "public"."Rating"("actorId");

-- CreateIndex
CREATE INDEX "Rating_movieId_idx" ON "public"."Rating"("movieId");

-- CreateIndex
CREATE INDEX "Rating_actorId_movieId_idx" ON "public"."Rating"("actorId", "movieId");
