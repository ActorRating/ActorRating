import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, makeCacheKey } from "@/lib/cache"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const suggestions = searchParams.get('suggestions') === 'true'
    
    console.log("🔍 Search API called with query:", query, suggestions ? "(suggestions)" : "")

    // Query is required
    if (query === null || query === undefined) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      )
    }

    const searchTerm = query.trim()

    // Suggestions: allow 1+ characters; return empty for 0 characters
    if (suggestions) {
      if (searchTerm.length < 1) {
        return NextResponse.json({ actors: [], movies: [] })
      }
    } else {
      // Full search: require at least 2 characters
      if (searchTerm.length < 2) {
        return NextResponse.json(
          { error: "Query must be at least 2 characters long for full search" },
          { status: 400 }
        )
      }
    }

    console.log("🔍 Processing search term:", searchTerm)

    // Cache key: normalized query + mode (suggestions vs full)
    const cacheKey = makeCacheKey('search', [searchTerm.toLowerCase(), suggestions ? 'suggestions' : 'full'])
    const cached = await cacheGet<{ actors: any[]; movies: any[] }>(cacheKey)
    if (cached) {
      const res = NextResponse.json(cached)
      res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
      return res
    }

    // Suggestions: ranked fuzzy + multi-token, 1-char minimum. Ranking weights depend on query length:
    // - Prefix/word-start weight increases as query grows (stronger exact intent).
    // - Token and similarity weight decay slightly for longer queries (less fuzzy noise).
    if (suggestions) {
      const queryLen = Math.min(searchTerm.length, 30)
      // Decay token/similarity weight for longer queries so prefix/word-start dominate.
      const tokenDecay = Math.max(0.5, 1.0 - (queryLen - 1) * 0.02)
      const simDecay = Math.max(0.5, 1.0 - (queryLen - 1) * 0.015)
      console.log("⚡ Ranked suggestions search for:", searchTerm, "len:", queryLen)
      const [actors, movies] = await Promise.all([
        // Actor suggestions: prefix > word-start > token match (any order) > similarity > popularity tie-breaker
        prisma.$queryRaw<Array<{ id: string; name: string; slug: string | null }>>`
          WITH tokens AS (
            SELECT unnest(string_to_array(lower(${searchTerm}), ' ')) AS token
          )
          SELECT
            a.id,
            a.name,
            a.slug
          FROM "Actor" a
          WHERE
            lower(a.name) LIKE '%' || lower(${searchTerm}) || '%'
            OR similarity(a.name, ${searchTerm}) > 0.2
          ORDER BY
            (
              CASE WHEN lower(a.name) LIKE lower(${searchTerm}) || '%'
                THEN 100 + LEAST(${queryLen} * 2, 30)
                ELSE 0 END
              +
              CASE WHEN lower(a.name) LIKE '% ' || lower(${searchTerm}) || '%'
                THEN 80 + LEAST(${queryLen}, 20)
                ELSE 0 END
              +
              (SELECT COUNT(*)::int FROM tokens WHERE lower(a.name) LIKE '%' || token || '%') * 20 * ${tokenDecay}
              +
              similarity(a.name, ${searchTerm}) * 50 * ${simDecay}
              +
              log(COALESCE((SELECT COUNT(*)::int FROM "Performance" WHERE "actorId" = a.id), 0) + 1) * 5
            ) DESC,
            a.name ASC
          LIMIT 8
        `,
        // Movie suggestions: same ranking (prefix boost, token/similarity decay)
        prisma.$queryRaw<Array<{ id: string; title: string; slug: string | null; year: number }>>`
          WITH tokens AS (
            SELECT unnest(string_to_array(lower(${searchTerm}), ' ')) AS token
          )
          SELECT
            m.id,
            m.title,
            m.slug,
            m.year
          FROM "Movie" m
          WHERE
            lower(m.title) LIKE '%' || lower(${searchTerm}) || '%'
            OR similarity(m.title, ${searchTerm}) > 0.2
          ORDER BY
            (
              CASE WHEN lower(m.title) LIKE lower(${searchTerm}) || '%'
                THEN 100 + LEAST(${queryLen} * 2, 30)
                ELSE 0 END
              +
              (SELECT COUNT(*)::int FROM tokens WHERE lower(m.title) LIKE '%' || token || '%') * 20 * ${tokenDecay}
              +
              similarity(m.title, ${searchTerm}) * 40 * ${simDecay}
              +
              COALESCE((SELECT COUNT(*)::int FROM "Performance" WHERE "movieId" = m.id), 0) * 0.05
            ) DESC,
            m.year DESC NULLS LAST,
            m.title ASC
          LIMIT 8
        `
      ])

      const payload = { 
        actors: actors || [],
        movies: movies || []
      }
      
      await cacheSet(cacheKey, payload, 30)
      
      const res = NextResponse.json(payload)
      res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120')
      return res
    }

    // Fuzzy search using PostgreSQL trigram similarity, full-text search, and ILIKE
    // This provides typo-tolerant search that handles:
    // - Exact matches (full-text search) - highest priority
    // - Similar matches (trigram similarity > 0.2) - handles typos
    // - Partial matches (ILIKE) - substring matches
    // Run both queries in parallel for better performance
    console.log("🔍 Searching actors and movies in parallel for:", searchTerm)
    
    const [actors, movies] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string; name: string; slug: string | null }>>`
        WITH exact_matches AS (
          -- Full-text search (exact word matches) - highest priority
          SELECT id, name, slug, 1 as priority, similarity(name, ${searchTerm}) as sim
          FROM "Actor"
          WHERE to_tsvector('english', name) @@ plainto_tsquery('english', ${searchTerm})
        ),
        fuzzy_matches AS (
          -- Trigram similarity (fuzzy/typo-tolerant) - medium priority
          SELECT id, name, slug, 2 as priority, similarity(name, ${searchTerm}) as sim
          FROM "Actor"
          WHERE similarity(name, ${searchTerm}) > 0.2
            AND id NOT IN (SELECT id FROM exact_matches)
        ),
        partial_matches AS (
          -- ILIKE (partial substring matches) - lower priority
          SELECT id, name, slug, 3 as priority, similarity(name, ${searchTerm}) as sim
          FROM "Actor"
          WHERE name ILIKE ${`%${searchTerm}%`}
            AND id NOT IN (SELECT id FROM exact_matches)
            AND id NOT IN (SELECT id FROM fuzzy_matches)
        )
        SELECT id, name, slug
        FROM (
          SELECT * FROM exact_matches
          UNION ALL
          SELECT * FROM fuzzy_matches
          UNION ALL
          SELECT * FROM partial_matches
        ) combined
        ORDER BY priority ASC, sim DESC, name ASC
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ id: string; title: string; slug: string | null; year: number }>>`
        WITH exact_matches AS (
          -- Full-text search (exact word matches) - highest priority
          SELECT id, title, slug, year, 1 as priority, similarity(title, ${searchTerm}) as sim
          FROM "Movie"
          WHERE to_tsvector('english', title) @@ plainto_tsquery('english', ${searchTerm})
        ),
        fuzzy_matches AS (
          -- Trigram similarity (fuzzy/typo-tolerant) - medium priority
          SELECT id, title, slug, year, 2 as priority, similarity(title, ${searchTerm}) as sim
          FROM "Movie"
          WHERE similarity(title, ${searchTerm}) > 0.2
            AND id NOT IN (SELECT id FROM exact_matches)
        ),
        partial_matches AS (
          -- ILIKE (partial substring matches) - lower priority
          SELECT id, title, slug, year, 3 as priority, similarity(title, ${searchTerm}) as sim
          FROM "Movie"
          WHERE title ILIKE ${`%${searchTerm}%`}
            AND id NOT IN (SELECT id FROM exact_matches)
            AND id NOT IN (SELECT id FROM fuzzy_matches)
        )
        SELECT id, title, slug, year
        FROM (
          SELECT * FROM exact_matches
          UNION ALL
          SELECT * FROM fuzzy_matches
          UNION ALL
          SELECT * FROM partial_matches
        ) combined
        ORDER BY priority ASC, sim DESC, year DESC, title ASC
        LIMIT 10
      `
    ])

    console.log("👤 Actors results:", actors, "Count:", actors.length)
    console.log("🎬 Movies results:", movies, "Count:", movies.length)

    const payload = { 
      actors: actors || [],
      movies: movies || []
    }
    
    console.log("📦 Final payload:", payload)
    console.log("📊 Total results - Actors:", (actors || []).length, "Movies:", (movies || []).length)
    
    // Set small TTL in Redis to reduce database pressure
    await cacheSet(cacheKey, payload, 60)

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    return res

  } catch (error) {
    console.error("Error performing search:", error)
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    )
  }
} 