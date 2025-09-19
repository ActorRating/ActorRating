/*
  Warnings:

  - You are about to drop the column `imdbId` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `imdbRating` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `rottenTomatoesId` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `rtAudience` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `rtCritics` on the `Movie` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tmdbId]` on the table `Actor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tmdbId]` on the table `Movie` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Movie_imdbId_key";

-- AlterTable
ALTER TABLE "public"."Actor" ADD COLUMN     "knownFor" TEXT,
ADD COLUMN     "tmdbId" INTEGER;

-- AlterTable
ALTER TABLE "public"."Movie" DROP COLUMN "imdbId",
DROP COLUMN "imdbRating",
DROP COLUMN "rottenTomatoesId",
DROP COLUMN "rtAudience",
DROP COLUMN "rtCritics",
ADD COLUMN     "overview" TEXT,
ADD COLUMN     "posterPath" TEXT,
ADD COLUMN     "tmdbId" INTEGER,
ADD COLUMN     "tmdbRating" DOUBLE PRECISION,
ADD COLUMN     "tmdbVoteCount" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Actor_tmdbId_key" ON "public"."Actor"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "public"."Movie"("tmdbId");
