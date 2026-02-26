# Search Suggestions API — Prefix-First Refactor

## 1. Diff summary

- **Early exit:** `q.length < 2` → return `{ actors: [], movies: [] }` immediately (no DB).
- **Query length < 3:** Only prefix search; no trigram, no similarity. One query per entity:
  - Actors: `WHERE lower(name) LIKE $1 || '%' ORDER BY lower(name) LIMIT 8`
  - Movies: `WHERE lower(title) LIKE $1 || '%' ORDER BY lower(title) LIMIT 5`
- **Query length ≥ 3:** Prefix first (same queries, LIMIT 8 / 5). If prefix returns ≥ 5 for that entity, use it. If prefix < 5, run **one** trigram similarity query (LIMIT 5), merge in JS, then slice to 8 actors / 5 movies.
- **Removed:** Token-match phase (multi-word `LIKE %t1% AND %t2%`), combined prefix+similarity in one query, scoring in JS, and any OR conditions. No trigram on short prefixes.
- **Limits:** Max 8 actors, max 5 movies (15 total). Enforced with `.slice(0, LIMIT_ACTORS)` / `.slice(0, LIMIT_MOVIES)`.
- **Cache:** 5-minute in-memory cache kept; Redis cache key bumped to `search-suggestions-v5`.
- **Logging:** Actors time, movies time, total time; **warning only if total > 200ms** (was 150ms).

---

## 2. Final SQL queries used

### Prefix (always; used for both q &lt; 3 and q ≥ 3)

**Actors:**

```sql
SELECT a.id, a.name, a.slug
FROM "Actor" a
WHERE lower(a.name) LIKE $1 || '%'
ORDER BY lower(a.name)
LIMIT 8
```

**Movies:**

```sql
SELECT m.id, m.title, m.slug, m.year
FROM "Movie" m
WHERE lower(m.title) LIKE $1 || '%'
ORDER BY lower(m.title)
LIMIT 5
```

### Trigram similarity (only when q ≥ 3 and prefix count &lt; 5)

**Actors:**

```sql
SELECT a.id, a.name, a.slug
FROM "Actor" a
WHERE similarity(lower(a.name), $1) > 0.15
ORDER BY similarity(lower(a.name), $1) DESC
LIMIT 5
```

**Movies:**

```sql
SELECT m.id, m.title, m.slug, m.year
FROM "Movie" m
WHERE similarity(lower(m.title), $1) > 0.15
ORDER BY similarity(lower(m.title), $1) DESC
LIMIT 5
```

`$1` is the normalized query (lowercase, trimmed). No OR conditions; prefix and similarity are separate queries; merge/dedupe is done in JS.

---

## 3. No OR conditions

- Prefix and similarity are **separate** queries.
- No `WHERE (prefix OR similarity)`.
- No combined `LIKE` + `similarity()` in one query.
- Trigram runs only when prefix returned &lt; 5 rows for that entity.

---

## 4. Edge runtime — incompatibilities and options

**Incompatible with Edge (current route):**

- **`@prisma/client`** and **`@/lib/prisma`** — Node-only; Prisma’s engine and drivers do not run on Vercel Edge.

**Compatible with Edge:**

- **`@/lib/cache`** (Upstash Redis) — HTTP REST; fine on Edge.
- **`NextRequest` / `NextResponse`** — supported on Edge.

**Ways to run this route on Edge:**

1. **Neon serverless**  
   Use `@neondatabase/serverless` and run the same SQL (parameterized) over Neon’s HTTP/WebSocket API. Requires a Neon Postgres URL; not compatible with Supabase Postgres driver-wise.

2. **Supabase client + RPC**  
   Use `@supabase/supabase-js` on Edge:
   - Prefix: `.from('Actor').select('id,name,slug').ilike('name', q + '%').order('name').limit(8)` (and equivalent for Movie).
   - Similarity: add Postgres functions, e.g. `search_actors_similarity(term text)`, `search_movies_similarity(term text)` returning `TABLE(...)`, and call them via `supabase.rpc('search_actors_similarity', { term })` from the route.

3. **Keep Node (current)**  
   No Edge; keep using Prisma and the prefix-first logic above. First-hit latency is then dominated by Node cold start; DB time should be much lower (~10–50 ms for prefix-only / optional second query).

---

## 5. Estimated performance impact

| Scenario | Before | After |
|--------|--------|--------|
| q length &lt; 2 | DB not hit (unchanged) | Same |
| q length 2 | Multiple phases (prefix + token + similarity) | **Prefix only** (1 query actors, 1 query movies) |
| q length ≥ 3, prefix rich | Same multi-phase | **Prefix only** when prefix ≥ 5; else 1 prefix + 1 similarity per entity |
| DB time (typical) | 2–6 queries, similarity on large sets | 2 queries (prefix) or 4 (prefix + similarity only when needed) |
| Similarity usage | For q ≥ 3 on full table | Only when prefix returns &lt; 5 rows; single condition, LIMIT 5 |

- **First-hit latency:** Still dominated by cold start on Node. DB part should drop from ~2–10 s to roughly **&lt; 200 ms** (prefix + optional similarity) when indexes are used.
- **Repeat hits:** Same as before (memory + Redis cache).
- **CPU / memory:** Fewer and simpler queries → lower DB and function CPU.

---

## 6. Caveats

- **Cache key:** Bumped to `search-suggestions-v5`; old Redis keys for suggestions will naturally expire.
- **Result shape:** Movies cap reduced from 8 to 5 per request; frontend already slices to 10 for display, so no change required if it only uses the first 5 for movies.
- **Edge:** To use `export const runtime = 'edge'`, Prisma must be removed and replaced by Neon serverless or Supabase client + RPC as above.
