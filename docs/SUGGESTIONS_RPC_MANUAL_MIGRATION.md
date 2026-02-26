# Suggestions RPC — Manual migration (Supabase SQL Editor)

## Do NOT test suggestions before running this SQL

- **Prefix search** will work without the RPCs.
- **Similarity fallback** will break until the functions exist (RPC calls will fail or return nothing).
- Results will look "fine" for prefix-heavy queries but be **incomplete** when prefix returns < 5.

Run the SQL below in Supabase first, then test the suggestions API for clean results.

---

## Run in Supabase SQL Editor

1. Open your Supabase project → **SQL Editor**.
2. Paste the SQL below.
3. Run it (no `prisma migrate deploy` needed; avoids accidental schema changes from other migrations).

```sql
-- RPCs for Edge suggestions API: trigram similarity search (used when prefix returns < 5).
-- Requires pg_trgm (already enabled in add_search_extensions).

CREATE OR REPLACE FUNCTION search_actors_similarity(term text)
RETURNS TABLE(id text, name text, slug text)
LANGUAGE sql
STABLE
AS $$
  SELECT a.id::text, a.name, a.slug
  FROM "Actor" a
  WHERE similarity(lower(a.name), term) > 0.15
  ORDER BY similarity(lower(a.name), term) DESC
  LIMIT 5;
$$;

CREATE OR REPLACE FUNCTION search_movies_similarity(term text)
RETURNS TABLE(id text, title text, slug text, year integer)
LANGUAGE sql
STABLE
AS $$
  SELECT m.id::text, m.title, m.slug, m.year
  FROM "Movie" m
  WHERE similarity(lower(m.title), term) > 0.15
  ORDER BY similarity(lower(m.title), term) DESC
  LIMIT 5;
$$;
```

After this, the suggestions route (Edge + Supabase + RPC) will return full results including similarity fallback.
