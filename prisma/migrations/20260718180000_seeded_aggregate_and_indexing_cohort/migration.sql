-- SEO Phase 2: seeded aggregates + cohort gate (cohort-1 only for now).
ALTER TABLE "Movie" ADD COLUMN IF NOT EXISTS "indexingCohort" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Performance" ADD COLUMN IF NOT EXISTS "seededAggregateScore" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "Movie_indexingCohort_idx" ON "Movie"("indexingCohort");
CREATE INDEX IF NOT EXISTS "Performance_seededAggregateScore_idx" ON "Performance"("seededAggregateScore");
