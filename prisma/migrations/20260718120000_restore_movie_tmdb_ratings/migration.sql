-- Restore TMDB vote fields on Movie (dropped in 20250731090718) plus fetch timestamp.
ALTER TABLE "Movie" ADD COLUMN IF NOT EXISTS "tmdbRating" DOUBLE PRECISION;
ALTER TABLE "Movie" ADD COLUMN IF NOT EXISTS "tmdbVoteCount" INTEGER;
ALTER TABLE "Movie" ADD COLUMN IF NOT EXISTS "tmdbDataFetchedAt" TIMESTAMP(3);
