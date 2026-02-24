-- Search suggestions performance: pg_trgm + GIN/btree indexes.
-- Verify with: EXPLAIN ANALYZE SELECT ... FROM "Actor" WHERE lower(name) LIKE 'query%' LIMIT 50;
-- Goal: Index Scan (no Seq Scan), execution time < 100ms.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for fast similarity() and LIKE %term% (uses gin_trgm_ops from pg_trgm)
CREATE INDEX IF NOT EXISTS "Actor_name_trgm_idx" ON "Actor" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Movie_title_trgm_idx" ON "Movie" USING GIN (title gin_trgm_ops);

-- GIN on lower() for similarity(lower(name), query) and prefix lower(name) LIKE 'query%'
CREATE INDEX IF NOT EXISTS "Actor_lower_name_gin_trgm" ON "Actor" USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Movie_lower_title_gin_trgm" ON "Movie" USING GIN (lower(title) gin_trgm_ops);

-- Btree for exact/prefix lookups (name, title)
CREATE INDEX IF NOT EXISTS "Actor_name_idx" ON "Actor" (name);
CREATE INDEX IF NOT EXISTS "Movie_title_idx" ON "Movie" (title);

-- Btree on lower() for fast prefix: WHERE lower(name) LIKE 'query%'
CREATE INDEX IF NOT EXISTS "Actor_lower_name_btree" ON "Actor" (lower(name));
CREATE INDEX IF NOT EXISTS "Movie_lower_title_btree" ON "Movie" (lower(title));
