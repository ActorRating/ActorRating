-- GIN trigram indexes on LOWER(name) and LOWER(title) for similarity(lower(...), query) in search/suggestions
-- Avoids full table scans when using weighted score ranking with trigram threshold 0.15
CREATE INDEX IF NOT EXISTS "Actor_lower_name_gin_trgm" ON "Actor" USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Movie_lower_title_gin_trgm" ON "Movie" USING gin (lower(title) gin_trgm_ops);
