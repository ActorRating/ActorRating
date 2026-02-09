-- GIN trigram indexes for fast autocomplete and similarity search on Actor.name and Movie.title
-- Requires pg_trgm (already enabled in 20250802131951_add_search_extensions)
CREATE INDEX IF NOT EXISTS "Actor_name_gin_trgm" ON "Actor" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Movie_title_gin_trgm" ON "Movie" USING gin (title gin_trgm_ops);
