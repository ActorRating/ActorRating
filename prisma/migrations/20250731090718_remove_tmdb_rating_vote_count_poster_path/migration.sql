/*
  Warnings:

  - You are about to drop the column `posterPath` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `tmdbRating` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `tmdbVoteCount` on the `Movie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Movie" DROP COLUMN "posterPath",
DROP COLUMN "tmdbRating",
DROP COLUMN "tmdbVoteCount";
